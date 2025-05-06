import { useState, useCallback } from 'react';
import { useNetworkStatus } from './use-mobile';
import { useToast } from './use-toast';
import { 
  addPendingOperation, 
  storeOfflineEntity, 
  OfflineEntity, 
  syncOfflineData 
} from '@/lib/offline-storage';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface UseOfflineMutationOptions<TData, TEntity extends OfflineEntity> {
  // Nome da entidade (para armazenamento offline)
  entityType: string;
  
  // Endpoint da API
  endpoint: string;
  
  // Callback para quando a mutação for bem-sucedida online
  onOnlineSuccess?: (data: TEntity) => void;
  
  // Callback para quando a mutação for armazenada offline
  onOfflineSuccess?: (data: TEntity) => void;
  
  // Callback para erros
  onError?: (error: Error) => void;
  
  // Mensagem de sucesso para Toast (online)
  onlineSuccessMessage?: string;
  
  // Mensagem de sucesso para Toast (offline)
  offlineSuccessMessage?: string;
  
  // ID da entidade para atualizações
  entityId?: string | number;
  
  // Se deve substituir a entidade existente no cache
  replace?: boolean;
  
  // Chave de invalidação do query client após mutação bem-sucedida
  invalidateQueries?: string[];
}

/**
 * Hook personalizado para mutações com suporte offline
 * Permite que o usuário crie/atualize dados mesmo quando estiver offline
 */
export function useOfflineMutation<TData, TEntity extends OfflineEntity>(
  options: UseOfflineMutationOptions<TData, TEntity>
) {
  const {
    entityType,
    endpoint,
    onOnlineSuccess,
    onOfflineSuccess,
    onError,
    onlineSuccessMessage = 'Operação realizada com sucesso',
    offlineSuccessMessage = 'Dados salvos localmente e serão sincronizados quando você estiver online',
    entityId,
    replace = false,
    invalidateQueries = [],
  } = options;
  
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutate = useCallback(async (data: TData) => {
    setIsPending(true);
    setIsError(false);
    setError(null);
    
    try {
      if (isOnline) {
        // Online: fazer a requisição à API
        const method = entityId ? 'PUT' : 'POST';
        const url = entityId ? `${endpoint}/${entityId}` : endpoint;
        
        const response = await apiRequest(method, url, data);
        const responseData = await response.json() as TEntity;
        
        // Cache a resposta localmente
        await storeOfflineEntity<TEntity>(
          entityType,
          responseData,
          { overwrite: true, isPending: false }
        );
        
        // Invalidar queries conforme necessário
        if (invalidateQueries.length > 0) {
          invalidateQueries.forEach(query => {
            queryClient.invalidateQueries({ queryKey: [query] });
          });
        }
        
        // Exibir toast de sucesso
        if (onlineSuccessMessage) {
          toast({
            title: 'Sucesso',
            description: onlineSuccessMessage,
          });
        }
        
        // Chamar callback de sucesso
        if (onOnlineSuccess) {
          onOnlineSuccess(responseData);
        }
        
        setIsPending(false);
        return responseData;
      } else {
        // Offline: armazenar localmente e adicionar à fila de operações pendentes
        const offlineData = data as unknown as TEntity;
        
        // Armazenar entidade localmente
        const storedEntity = await storeOfflineEntity<TEntity>(
          entityType,
          { ...offlineData, id: entityId },
          { overwrite: replace, isPending: true }
        );
        
        // Adicionar operação à fila
        await addPendingOperation({
          operation: entityId ? 'update' : 'create',
          entityType,
          entityId: storedEntity.id,
          data,
          endpoint,
        });
        
        // Exibir toast
        if (offlineSuccessMessage) {
          toast({
            title: 'Salvamento offline',
            description: offlineSuccessMessage,
          });
        }
        
        // Chamar callback de sucesso offline
        if (onOfflineSuccess) {
          onOfflineSuccess(storedEntity);
        }
        
        setIsPending(false);
        return storedEntity;
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      setIsError(true);
      setError(errorObj);
      setIsPending(false);
      
      toast({
        title: 'Erro',
        description: errorObj.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(errorObj);
      }
      
      throw errorObj;
    }
  }, [
    isOnline, 
    entityType, 
    entityId, 
    endpoint, 
    replace, 
    onOnlineSuccess, 
    onOfflineSuccess, 
    onError, 
    onlineSuccessMessage, 
    offlineSuccessMessage, 
    invalidateQueries,
    toast,
    queryClient
  ]);
  
  const syncData = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: 'Offline',
        description: 'Você precisa estar online para sincronizar dados',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsPending(true);
      
      const result = await syncOfflineData(async (endpoint, method, data) => {
        const response = await apiRequest(method, endpoint, data);
        return await response.json();
      });
      
      if (result.synced > 0) {
        // Invalidar queries conforme necessário
        if (invalidateQueries.length > 0) {
          invalidateQueries.forEach(query => {
            queryClient.invalidateQueries({ queryKey: [query] });
          });
        }
        
        toast({
          title: 'Sincronização concluída',
          description: `${result.synced} ${result.synced === 1 ? 'item sincronizado' : 'itens sincronizados'} com sucesso.`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: 'Erros na sincronização',
          description: `${result.failed} ${result.failed === 1 ? 'item falhou' : 'itens falharam'} ao sincronizar.`,
          variant: 'destructive',
        });
      }
      
      if (result.synced === 0 && result.failed === 0) {
        toast({
          title: 'Sincronização',
          description: 'Nenhum dado pendente para sincronizar.',
        });
      }
      
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      toast({
        title: 'Erro na sincronização',
        description: errorObj.message,
        variant: 'destructive',
      });
      
      throw errorObj;
    } finally {
      setIsPending(false);
    }
  }, [isOnline, toast, invalidateQueries, queryClient]);
  
  return {
    mutate,
    syncData,
    isPending,
    isError,
    error,
    isOnline,
  };
}

/**
 * Hook para deletar entidades com suporte offline
 */
export function useOfflineDelete<TEntity extends OfflineEntity>(
  options: Omit<UseOfflineMutationOptions<undefined, TEntity>, 'replace'>
) {
  const {
    entityType,
    endpoint,
    entityId,
    onOnlineSuccess,
    onOfflineSuccess,
    onError,
    onlineSuccessMessage = 'Item excluído com sucesso',
    offlineSuccessMessage = 'Item marcado para exclusão e será sincronizado quando você estiver online',
    invalidateQueries = [],
  } = options;
  
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutate = useCallback(async () => {
    if (!entityId) {
      throw new Error('ID da entidade é obrigatório para exclusão');
    }
    
    setIsPending(true);
    setIsError(false);
    setError(null);
    
    try {
      if (isOnline) {
        // Online: excluir diretamente via API
        const url = `${endpoint}/${entityId}`;
        const response = await apiRequest('DELETE', url);
        
        if (!response.ok) {
          throw new Error(`Erro ao excluir: ${response.statusText}`);
        }
        
        // Invalidar queries conforme necessário
        if (invalidateQueries.length > 0) {
          invalidateQueries.forEach(query => {
            queryClient.invalidateQueries({ queryKey: [query] });
          });
        }
        
        // Exibir toast de sucesso
        if (onlineSuccessMessage) {
          toast({
            title: 'Sucesso',
            description: onlineSuccessMessage,
          });
        }
        
        // Chamar callback de sucesso
        if (onOnlineSuccess) {
          onOnlineSuccess({} as TEntity);
        }
        
        setIsPending(false);
        return true;
      } else {
        // Offline: marcar para exclusão futura
        await addPendingOperation({
          operation: 'delete',
          entityType,
          entityId,
          endpoint: `${endpoint}/${entityId}`,
        });
        
        // Exibir toast
        if (offlineSuccessMessage) {
          toast({
            title: 'Exclusão offline',
            description: offlineSuccessMessage,
          });
        }
        
        // Chamar callback de sucesso offline
        if (onOfflineSuccess) {
          onOfflineSuccess({} as TEntity);
        }
        
        setIsPending(false);
        return true;
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      
      setIsError(true);
      setError(errorObj);
      setIsPending(false);
      
      toast({
        title: 'Erro',
        description: errorObj.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(errorObj);
      }
      
      throw errorObj;
    }
  }, [
    isOnline, 
    entityType, 
    entityId, 
    endpoint, 
    onOnlineSuccess, 
    onOfflineSuccess, 
    onError, 
    onlineSuccessMessage, 
    offlineSuccessMessage, 
    invalidateQueries,
    toast,
    queryClient
  ]);
  
  return {
    mutate,
    isPending,
    isError,
    error,
    isOnline,
  };
}