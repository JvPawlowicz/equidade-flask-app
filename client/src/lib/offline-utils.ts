import { useNetworkStatus } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useState } from "react";

// Armazenar solicitações pendentes no IndexedDB para sincronização quando voltarmos a ficar online
export async function savePendingRequest(request: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  type: string;
  entityId?: string | number;
}): Promise<number> {
  try {
    const db = await openIndexedDB('pending-requests', 1);
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    
    // Adicionar timestamp para ordenação na sincronização
    const requestWithTimestamp = {
      ...request,
      timestamp: new Date().getTime()
    };
    
    const result = await new Promise<IDBValidKey>((resolve, reject) => {
      const req = store.add(requestWithTimestamp);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    
    return result as number;
  } catch (error) {
    console.error('Erro ao salvar solicitação pendente:', error);
    throw error;
  }
}

// Obter todas as solicitações pendentes
export async function getPendingRequests(): Promise<any[]> {
  try {
    const db = await openIndexedDB('pending-requests', 1);
    const tx = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao obter solicitações pendentes:', error);
    return [];
  }
}

// Remover uma solicitação pendente
export async function removePendingRequest(id: number): Promise<void> {
  try {
    const db = await openIndexedDB('pending-requests', 1);
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao remover solicitação pendente:', error);
    throw error;
  }
}

// Inicializar o IndexedDB
function openIndexedDB(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Solicitação à API com suporte offline
export async function apiRequestWithOfflineSupport(
  method: string,
  url: string,
  data?: any,
  entityType?: string,
  entityId?: string | number
): Promise<any> {
  // Usar o hook para verificar o status da conexão
  const isOnline = navigator.onLine;
  
  // Se estiver online, tente fazer a solicitação normal
  if (isOnline) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao fazer solicitação à API:', error);
      
      // Se houver um erro de rede, podemos tentar armazenar para sincronização posterior
      if (method !== 'GET' && entityType) {
        await savePendingRequest({
          url,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: data,
          type: entityType,
          entityId
        });
        
        return {
          pendingSync: true,
          localId: Math.random().toString(36).substring(2, 9),
          ...data
        };
      }
      
      throw error;
    }
  } else {
    // Se estiver offline e não for uma solicitação GET, armazene para sincronização posterior
    if (method !== 'GET' && entityType) {
      const requestId = await savePendingRequest({
        url,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: data,
        type: entityType,
        entityId
      });
      
      // Registrar a solicitação para sincronização quando voltar online
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          // Verificar se a API Background Sync está disponível
          if ('sync' in registration) {
            (registration as any).sync.register('sync-pending-data');
          }
        });
      }
      
      // Retornar um objeto temporário até que a sincronização seja concluída
      return {
        pendingSync: true,
        requestId,
        localId: Math.random().toString(36).substring(2, 9),
        ...data
      };
    }
    
    // Para solicitações GET quando estiver offline, tentamos obter do cache
    try {
      const cache = await caches.open('equidade-clinic-v1');
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse) {
        const data = await cachedResponse.json();
        return {
          ...data,
          fromCache: true
        };
      }
    } catch (error) {
      console.error('Erro ao acessar cache:', error);
    }
    
    throw new Error('Você está offline e os dados solicitados não estão disponíveis no cache.');
  }
}

// Hook para usar no lugar de mutações quando precisamos de suporte offline
export function useOfflineMutation<T, TData = unknown>(
  entityType: string,
  mutationFn: (data: TData) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    onOffline?: (data: TData) => void;
  }
) {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const mutate = useCallback(async (mutationData: TData) => {
    setIsPending(true);
    setIsError(false);
    setError(null);
    
    try {
      if (isOnline) {
        // Online: fazer a mutação normalmente
        const result = await mutationFn(mutationData);
        setData(result);
        setIsPending(false);
        
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } else {
        // Offline: armazenar a mutação para sincronização posterior
        // e notificar o usuário
        
        // Armazenaremos os detalhes em IndexedDB via função de utilidade
        // Esta função é implementada acima
        const pendingData = {
          entityType,
          data: mutationData,
          timestamp: new Date().getTime()
        };
        
        // Salvar na fila de pendências
        await savePendingRequest({
          url: `/api/${entityType.toLowerCase()}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: mutationData,
          type: entityType
        });
        
        // Solicitar sincronização quando ficar online novamente
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(registration => {
            // Verificar se a API Background Sync está disponível
            if ('sync' in registration) {
              (registration as any).sync.register('sync-pending-data');
            }
          });
        }
        
        // Notify user
        toast({
          title: "Operação em modo offline",
          description: `Suas alterações serão salvas quando você ficar online novamente.`,
        });
        
        // Criar um resultado temporário
        const tempResult = {
          id: `temp-${Date.now()}`,
          ...mutationData,
          pendingSync: true
        } as unknown as T;
        
        setData(tempResult);
        setIsPending(false);
        
        if (options?.onOffline) {
          options.onOffline(mutationData);
        }
        
        return tempResult;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setIsError(true);
      setError(err);
      setIsPending(false);
      
      if (options?.onError) {
        options.onError(err);
      }
      
      throw err;
    }
  }, [isOnline, mutationFn, entityType, options, toast]);
  
  return {
    mutate,
    isPending,
    isError,
    error,
    data
  };
}

// Hook para verificar sincronizações pendentes
export function usePendingSynchronizations() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Carregar solicitações pendentes
  const loadPendingRequests = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const requests = await getPendingRequests();
      setPendingCount(requests.length);
      setPendingItems(requests);
    } catch (error) {
      console.error('Erro ao carregar solicitações pendentes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Carregar solicitações pendentes quando o componente montar
  useEffect(() => {
    loadPendingRequests();
    
    // Adicionar listener para eventos de sincronização
    const handleSyncSuccess = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_SUCCESS') {
        loadPendingRequests();
      }
    };
    
    // Adicionar listener para eventos do service worker
    navigator.serviceWorker.addEventListener('message', handleSyncSuccess);
    
    // Listener para quando ficar online novamente
    const handleOnline = () => {
      loadPendingRequests();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSyncSuccess);
      window.removeEventListener('online', handleOnline);
    };
  }, [loadPendingRequests]);
  
  return {
    pendingCount,
    pendingItems,
    isLoading,
    refresh: loadPendingRequests
  };
}

// Registrar o Service Worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrado com sucesso:', registration.scope);
      
      // Verificar atualizações periodicamente
      setInterval(() => {
        registration.update();
      }, 1000 * 60 * 60); // A cada hora
      
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      return null;
    }
  }
  
  return null;
}

// Verificar se o aplicativo está instalado
export function useIsAppInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    // Verificar se o app já está instalado (através da detecção do modo standalone)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.matchMedia('(display-mode: fullscreen)').matches || 
      window.matchMedia('(display-mode: minimal-ui)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsInstalled(isStandalone);
    
    // Verificar mudanças no modo de exibição
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const listener = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    
    mediaQueryList.addEventListener('change', listener);
    
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, []);
  
  return isInstalled;
}

// Hook para lidar com a instalação do PWA
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir o comportamento padrão do navegador
      e.preventDefault();
      
      // Armazenar o evento para uso posterior
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.log('Prompt de instalação não disponível');
      return false;
    }
    
    // Mostrar o prompt de instalação
    deferredPrompt.prompt();
    
    // Aguardar a escolha do usuário
    const choiceResult = await deferredPrompt.userChoice;
    
    // Limpar o prompt após o uso
    setDeferredPrompt(null);
    setIsInstallable(false);
    
    return choiceResult.outcome === 'accepted';
  };
  
  return {
    isInstallable,
    promptInstall
  };
}