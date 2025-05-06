/**
 * Utilidades para manipulação e validação de operações offline
 */

// Verifica se navegador tem suporte a funcionalidades necessárias para o modo offline
export function checkOfflineSupport(): {
  supported: boolean;
  features: {
    serviceWorker: boolean;
    localStorage: boolean;
    indexedDB: boolean;
    cacheAPI: boolean;
  }
} {
  const features = {
    serviceWorker: 'serviceWorker' in navigator,
    localStorage: typeof localStorage !== 'undefined',
    indexedDB: 'indexedDB' in window,
    cacheAPI: 'caches' in window
  };
  
  const supported = Object.values(features).every(Boolean);
  
  return {
    supported,
    features
  };
}

// Registra o service worker para funcionalidades offline
export async function registerServiceWorker(path = '/service-worker.js'): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não é suportado neste navegador');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register(path);
    
    console.log('Service Worker registrado com sucesso:', registration.scope);
    
    return registration;
  } catch (error) {
    console.error('Falha ao registrar Service Worker:', error);
    return null;
  }
}

// Atualiza o service worker manualmente
export async function updateServiceWorker(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      return false;
    }
    
    await registration.update();
    return true;
  } catch (error) {
    console.error('Erro ao atualizar Service Worker:', error);
    return false;
  }
}

// Compacta dados para armazenamento local eficiente
export function compressData(data: any): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('Erro ao comprimir dados:', error);
    throw error;
  }
}

// Descompacta dados do armazenamento local
export function decompressData<T>(compressedData: string): T {
  try {
    return JSON.parse(compressedData) as T;
  } catch (error) {
    console.error('Erro ao descomprimir dados:', error);
    throw error;
  }
}

// Calcula o tamanho em bytes de dados para estimar espaço de armazenamento
export function calculateDataSize(data: any): number {
  const stringified = typeof data === 'string' ? data : JSON.stringify(data);
  return new Blob([stringified]).size;
}

// Estima o espaço disponível para armazenamento local
export async function estimateAvailableStorage(): Promise<{
  quota: number;
  usage: number;
  available: number;
  percentUsed: number;
}> {
  // Valores padrão se a API de storage não estiver disponível
  let defaultEstimate = {
    quota: 50 * 1024 * 1024, // 50MB estimados
    usage: 0,
    available: 50 * 1024 * 1024,
    percentUsed: 0
  };
  
  // Verificar se a API está disponível
  if (!navigator.storage || !navigator.storage.estimate) {
    return defaultEstimate;
  }
  
  try {
    const estimate = await navigator.storage.estimate();
    
    if (!estimate.quota || !estimate.usage) {
      return defaultEstimate;
    }
    
    const available = estimate.quota - estimate.usage;
    const percentUsed = (estimate.usage / estimate.quota) * 100;
    
    return {
      quota: estimate.quota,
      usage: estimate.usage,
      available,
      percentUsed
    };
  } catch (error) {
    console.error('Erro ao estimar armazenamento disponível:', error);
    return defaultEstimate;
  }
}

// Limpa dados expirados do cache
export async function clearExpiredCache(cacheName: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  if (!('caches' in window)) {
    return 0;
  }
  
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const now = Date.now();
    let deletedCount = 0;
    
    for (const request of requests) {
      const response = await cache.match(request);
      
      if (response) {
        const headers = response.headers;
        const dateHeader = headers.get('date');
        
        if (dateHeader) {
          const requestTime = new Date(dateHeader).getTime();
          const age = now - requestTime;
          
          if (age > maxAgeMs) {
            await cache.delete(request);
            deletedCount++;
          }
        }
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Erro ao limpar cache expirado:', error);
    return 0;
  }
}

// Verifica se um recurso específico está disponível offline (cacheado)
export async function isResourceCached(url: string, cacheName: string): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }
  
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    console.error(`Erro ao verificar se o recurso ${url} está em cache:`, error);
    return false;
  }
}

// Gera um ID local único para entidades criadas offline
export function generateLocalId(prefix = 'local'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

// Formata tamanho em bytes para exibição amigável
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Detecta mudanças de rede e exibe notificação
export function setupNetworkListeners(
  onOnline: () => void = () => {},
  onOffline: () => void = () => {}
): () => void {
  const handleOnline = () => {
    console.log('Conexão restabelecida');
    onOnline();
  };
  
  const handleOffline = () => {
    console.log('Conexão perdida');
    onOffline();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Retorna função para remover os listeners
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// Prioriza sincronização de dados essenciais quando voltar online
export function calculateSyncPriority(
  entityType: string, 
  operation: 'create' | 'update' | 'delete'
): number {
  // Definir prioridades por tipo de entidade
  const entityPriorities: Record<string, number> = {
    'appointments': 5,
    'evolutions': 4,
    'patients': 3,
    'professionals': 3,
    'documents': 2,
    'facilities': 1
  };
  
  // Definir prioridades por tipo de operação
  const operationPriorities: Record<string, number> = {
    'create': 3,
    'update': 2,
    'delete': 1
  };
  
  // Obter prioridade da entidade (padrão: 0)
  const entityPriority = entityPriorities[entityType] || 0;
  
  // Obter prioridade da operação (padrão: 0)
  const operationPriority = operationPriorities[operation] || 0;
  
  // Prioridade final (0-8)
  return entityPriority + operationPriority;
}