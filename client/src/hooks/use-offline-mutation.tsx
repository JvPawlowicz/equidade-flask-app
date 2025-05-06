import { useState, useCallback, useEffect } from 'react';
import { UseMutationResult, useMutation, MutationOptions, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './use-mobile';
import { generateOfflineId } from '@/lib/offline-utils';
import {
  savePendingRequest,
  getPendingRequests,
  removePendingRequest,
  updateSyncStatus
} from '@/lib/offline-storage';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

/**
 * Tipo de configuração para mutação offline
 */
interface OfflineMutationOptions<TData = unknown, TError = Error, TVariables = void, TContext = unknown>
  extends MutationOptions<TData, TError, TVariables, TContext> {
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  processOfflineResponse?: (variables: TVariables) => TData;
  onSyncSuccess?: (data: TData, variables: TVariables) => void;
  onSyncError?: (error: TError, variables: TVariables) => void;
  queryKeysToInvalidate?: string | string[] | (string | string[])[];
  enableOfflineSupport?: boolean;
}

/**
 * Hook personalizado para realizar mutações com suporte a operações offline
 */
export function useOfflineMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: OfflineMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> & {
  syncPending: () => Promise<{ success: number; failed: number }>;
  hasPendingSync: boolean;
} {
  const { isOnline } = useNetworkStatus();
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Opções padrão
  const {
    endpoint,
    method,
    processOfflineResponse,
    onSyncSuccess,
    onSyncError,
    queryKeysToInvalidate,
    enableOfflineSupport = true,
    ...mutationOptions
  } = options;
  
  /**
   * Verifica se existem mutações pendentes e atualiza o estado
   */
  const checkPendingSync = useCallback(async () => {
    try {
      const pendingRequests = await getPendingRequests();
      // Filtrar apenas as requisições relacionadas a este endpoint
      const relevantRequests = pendingRequests.filter(req => 
        req.url === endpoint && req.method === method
      );
      
      setHasPendingSync(relevantRequests.length > 0);
    } catch (error) {
      console.error('Erro ao verificar mutações pendentes:', error);
      setHasPendingSync(false);
    }
  }, [endpoint, method]);
  
  // Verificar mutações pendentes na inicialização e quando voltar online
  useEffect(() => {
    checkPendingSync();
    
    // Verificar novamente quando voltar online
    if (isOnline) {
      checkPendingSync();
    }
  }, [isOnline, checkPendingSync]);
  
  /**
   * Sincroniza todas as mutações pendentes deste tipo
   */
  const syncPending = useCallback(async (): Promise<{ success: number; failed: number }> => {
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Não é possível sincronizar enquanto estiver offline',
        variant: 'destructive'
      });
      return { success: 0, failed: 0 };
    }
    
    try {
      // Obter todas as requisições pendentes
      const pendingRequests = await getPendingRequests();
      
      // Filtrar apenas as requisições relacionadas a este endpoint
      const relevantRequests = pendingRequests.filter(req => 
        req.url === endpoint && req.method === method
      );
      
      if (relevantRequests.length === 0) {
        return { success: 0, failed: 0 };
      }
      
      // Atualizar o status para 'sincronizando'
      await updateSyncStatus({
        syncStatus: 'syncing'
      });
      
      let successCount = 0;
      let failedCount = 0;
      
      // Processar cada requisição pendente
      for (const request of relevantRequests) {
        try {
          // Enviar a requisição
          const response = await apiRequest(
            request.method,
            request.url,
            request.body
          );
          
          // Processar a resposta
          const data = await response.json();
          
          // Callback de sucesso se fornecido
          if (onSyncSuccess) {
            onSyncSuccess(data as TData, request.body as TVariables);
          }
          
          // Remover a requisição da fila
          await removePendingRequest(request.id);
          
          // Invalidar queries afetadas para atualizar a UI
          if (queryKeysToInvalidate) {
            // Se for um array de arrays ou strings
            if (Array.isArray(queryKeysToInvalidate)) {
              for (const key of queryKeysToInvalidate) {
                await queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
              }
            } else {
              // Se for apenas uma string
              await queryClient.invalidateQueries({ queryKey: [queryKeysToInvalidate] });
            }
          }
          
          successCount++;
        } catch (error) {
          // Callback de erro se fornecido
          if (onSyncError) {
            onSyncError(error as TError, request.body as TVariables);
          }
          
          failedCount++;
          
          console.error(`Erro ao sincronizar requisição ${request.id}:`, error);
        }
      }
      
      // Notificar resultado da sincronização
      if (successCount > 0) {
        toast({
          title: 'Sincronização concluída',
          description: `${successCount} alterações sincronizadas com sucesso`,
        });
      }
      
      if (failedCount > 0) {
        toast({
          title: 'Sincronização parcial',
          description: `${failedCount} alterações não puderam ser sincronizadas`,
          variant: 'destructive'
        });
      }
      
      // Atualizar o status para 'ocioso'
      await updateSyncStatus({
        syncStatus: 'idle',
        lastSync: Date.now()
      });
      
      // Atualizar estado de pendências
      await checkPendingSync();
      
      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('Erro ao sincronizar mutações pendentes:', error);
      
      // Atualizar o status para 'erro'
      await updateSyncStatus({
        syncStatus: 'error',
        errorMessage: (error as Error).message
      });
      
      return { success: 0, failed: 0 };
    }
  }, [isOnline, endpoint, method, onSyncSuccess, onSyncError, queryKeysToInvalidate, queryClient, toast, checkPendingSync]);
  
  // Mutação real (online) ou com fallback offline
  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: async (variables: TVariables) => {
      // Se estiver online, realizar a mutação normalmente
      if (isOnline) {
        try {
          const response = await apiRequest(method, endpoint, variables);
          const data = await response.json();
          return data as TData;
        } catch (error) {
          // Se a opção offline estiver ativada e ocorrer um erro de rede
          // tenta salvar offline
          if (enableOfflineSupport && isNetworkError(error)) {
            return handleOfflineMutation(variables);
          }
          
          // Caso contrário, propaga o erro
          throw error;
        }
      } else if (enableOfflineSupport) {
        // Se estiver offline e o suporte offline estiver ativado
        return handleOfflineMutation(variables);
      } else {
        // Se estiver offline e o suporte offline não estiver ativado
        throw new Error('Você está offline e esta ação não suporta operação offline');
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidar queries afetadas
      if (queryKeysToInvalidate) {
        // Se for um array de arrays ou strings
        if (Array.isArray(queryKeysToInvalidate)) {
          for (const key of queryKeysToInvalidate) {
            queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
          }
        } else {
          // Se for apenas uma string
          queryClient.invalidateQueries({ queryKey: [queryKeysToInvalidate] });
        }
      }
      
      // Chamar onSuccess original se fornecido
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(data, variables, context);
      }
    }
  });
  
  /**
   * Função para lidar com a mutação quando estiver offline
   */
  const handleOfflineMutation = async (variables: TVariables): Promise<TData> => {
    // Gerar um ID para a requisição offline
    const offlineId = generateOfflineId();
    
    // Salvar a requisição para processamento posterior
    await savePendingRequest(endpoint, method, variables);
    
    // Verificar novamente se há pendências
    await checkPendingSync();
    
    // Mostrar notificação de modo offline
    toast({
      title: 'Modo offline',
      description: 'Sua ação foi salva e será sincronizada quando houver conexão',
    });
    
    // Se houver uma função para processar a resposta offline, usá-la
    if (processOfflineResponse) {
      return processOfflineResponse(variables);
    }
    
    // Caso contrário, retornar uma resposta simulada
    // com o ID gerado
    return {
      id: offlineId,
      createdOffline: true,
      data: variables,
      timestamp: Date.now()
    } as unknown as TData;
  };
  
  // Retornar a mutação com a função de sincronização
  return {
    ...mutation,
    syncPending,
    hasPendingSync
  };
}

/**
 * Verifica se um erro é um erro de rede
 */
function isNetworkError(error: any): boolean {
  if (error instanceof TypeError && error.message.includes('Network')) {
    return true;
  }
  
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    return true;
  }
  
  if (error instanceof DOMException && (
    error.message.includes('NetworkError') || 
    error.message.includes('The network connection was lost')
  )) {
    return true;
  }
  
  return false;
}