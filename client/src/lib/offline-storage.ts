/**
 * Utilitário para persistência de dados offline
 * Permite armazenar dados localmente quando não há conexão
 * e sincronizá-los quando a conexão for restabelecida
 */

// Interface para operações pendentes
export interface PendingOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId?: string | number;
  data?: any;
  timestamp: number;
  endpoint: string;
  retryCount: number;
  priority: number;
}

// Interface para entidade com suporte offline
export interface OfflineEntity {
  id: string | number;
  syncStatus?: 'synced' | 'pending' | 'conflict' | 'error';
  lastModified?: number;
  offlineCreated?: boolean;
  localId?: string;
}

// Prefixo para as chaves de armazenamento
const STORAGE_PREFIX = 'equidade_offline_';

// Limites e configurações
const MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_RETRY_COUNT = 5;
const TTL_DAYS = 30; // Time To Live em dias

// Armazenar entidade local em cache
export async function storeOfflineEntity<T extends OfflineEntity>(
  entityType: string,
  entity: T,
  options: { 
    overwrite?: boolean; 
    merge?: boolean;
    isPending?: boolean;
  } = {}
): Promise<T> {
  const { overwrite = false, merge = true, isPending = true } = options;
  
  // Adicionar metadados offline
  const offlineEntity = {
    ...entity,
    syncStatus: isPending ? 'pending' : 'synced',
    lastModified: Date.now(),
    offlineCreated: !entity.id || typeof entity.id === 'string' && entity.id.startsWith('local_'),
  };
  
  // Obter dados existentes
  const existingData = await getOfflineEntities<T>(entityType);
  let newData: T[];
  
  if (entity.id) {
    // Entidade com ID (existente ou criada localmente)
    const existingIndex = existingData.findIndex(item => item.id === entity.id);
    
    if (existingIndex >= 0) {
      // Entidade já existe
      if (overwrite) {
        // Substituir completamente
        newData = [
          ...existingData.slice(0, existingIndex),
          offlineEntity,
          ...existingData.slice(existingIndex + 1)
        ];
      } else if (merge) {
        // Mesclar dados
        newData = [
          ...existingData.slice(0, existingIndex),
          { ...existingData[existingIndex], ...offlineEntity },
          ...existingData.slice(existingIndex + 1)
        ];
      } else {
        // Manter dados existentes
        return existingData[existingIndex] as T;
      }
    } else {
      // Nova entidade com ID
      newData = [...existingData, offlineEntity];
    }
  } else {
    // Nova entidade sem ID
    const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newEntity = {
      ...offlineEntity,
      id: localId,
      localId,
    };
    newData = [...existingData, newEntity];
  }
  
  // Armazenar novos dados
  await storeData(`${entityType}`, newData);
  
  return entity.id 
    ? (newData.find(item => item.id === entity.id) as T) 
    : (newData[newData.length - 1] as T);
}

// Recuperar entidades armazenadas localmente
export async function getOfflineEntities<T>(entityType: string): Promise<T[]> {
  try {
    const data = await getData<T[]>(`${entityType}`);
    return data || [];
  } catch (error) {
    console.error(`Erro ao obter entidades offline do tipo ${entityType}:`, error);
    return [];
  }
}

// Obter uma entidade específica por ID
export async function getOfflineEntityById<T extends OfflineEntity>(
  entityType: string,
  id: string | number
): Promise<T | null> {
  try {
    const entities = await getOfflineEntities<T>(entityType);
    return entities.find(entity => entity.id === id) || null;
  } catch (error) {
    console.error(`Erro ao obter entidade offline do tipo ${entityType} com ID ${id}:`, error);
    return null;
  }
}

// Remover entidade do armazenamento local
export async function removeOfflineEntity(
  entityType: string,
  id: string | number
): Promise<boolean> {
  try {
    const entities = await getOfflineEntities(entityType);
    const filteredEntities = entities.filter(entity => entity.id !== id);
    
    // Verificar se algo foi removido
    if (filteredEntities.length === entities.length) {
      return false;
    }
    
    await storeData(`${entityType}`, filteredEntities);
    
    // Também remover da fila de operações pendentes relacionadas a esta entidade
    const pendingOps = await getPendingOperations();
    const filteredOps = pendingOps.filter(op => 
      !(op.entityType === entityType && op.entityId === id)
    );
    
    if (filteredOps.length !== pendingOps.length) {
      await storePendingOperations(filteredOps);
    }
    
    return true;
  } catch (error) {
    console.error(`Erro ao remover entidade offline do tipo ${entityType} com ID ${id}:`, error);
    return false;
  }
}

// Adicionar operação pendente para sincronização futura
export async function addPendingOperation(
  operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount' | 'priority'>
): Promise<PendingOperation> {
  try {
    const pendingOps = await getPendingOperations();
    
    // Verificar se já existe uma operação pendente para a mesma entidade
    const existingIndex = pendingOps.findIndex(op => 
      op.entityType === operation.entityType && 
      op.entityId === operation.entityId &&
      op.operation === operation.operation
    );
    
    const newOperation: PendingOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      // Prioridade: operações de criação têm prioridade mais alta
      priority: operation.operation === 'create' ? 3 : 
                operation.operation === 'update' ? 2 : 1
    };
    
    if (existingIndex >= 0) {
      // Substituir operação existente
      pendingOps[existingIndex] = newOperation;
    } else {
      // Adicionar nova operação
      pendingOps.push(newOperation);
    }
    
    // Ordenar por prioridade e timestamp
    pendingOps.sort((a, b) => 
      b.priority - a.priority || a.timestamp - b.timestamp
    );
    
    await storePendingOperations(pendingOps);
    return newOperation;
  } catch (error) {
    console.error('Erro ao adicionar operação pendente:', error);
    throw error;
  }
}

// Obter todas as operações pendentes
export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    const operations = await getData<PendingOperation[]>('pending_operations');
    return operations || [];
  } catch (error) {
    console.error('Erro ao obter operações pendentes:', error);
    return [];
  }
}

// Remover operação pendente
export async function removePendingOperation(id: string): Promise<boolean> {
  try {
    const pendingOps = await getPendingOperations();
    const filteredOps = pendingOps.filter(op => op.id !== id);
    
    if (filteredOps.length === pendingOps.length) {
      return false;
    }
    
    await storePendingOperations(filteredOps);
    return true;
  } catch (error) {
    console.error(`Erro ao remover operação pendente ${id}:`, error);
    return false;
  }
}

// Atualizar status de operação pendente
export async function updatePendingOperation(
  id: string, 
  updates: Partial<PendingOperation>
): Promise<PendingOperation | null> {
  try {
    const pendingOps = await getPendingOperations();
    const index = pendingOps.findIndex(op => op.id === id);
    
    if (index === -1) {
      return null;
    }
    
    // Atualizar operação
    const updatedOp = { ...pendingOps[index], ...updates };
    pendingOps[index] = updatedOp;
    
    await storePendingOperations(pendingOps);
    return updatedOp;
  } catch (error) {
    console.error(`Erro ao atualizar operação pendente ${id}:`, error);
    return null;
  }
}

// Armazenar operações pendentes
async function storePendingOperations(operations: PendingOperation[]): Promise<void> {
  await storeData('pending_operations', operations);
}

// Funções auxiliares para armazenamento local

// Armazenar dados
async function storeData<T>(key: string, data: T): Promise<void> {
  try {
    const dataString = JSON.stringify(data);
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, dataString);
  } catch (error) {
    console.error(`Erro ao armazenar dados para a chave ${key}:`, error);
    
    // Verificar se é um erro de quota excedida
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Limpar dados antigos
      await clearOldData();
      
      // Tentar novamente
      try {
        const dataString = JSON.stringify(data);
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, dataString);
      } catch (retryError) {
        console.error(`Erro ao rearmazenar dados para a chave ${key} após limpeza:`, retryError);
        throw retryError;
      }
    } else {
      throw error;
    }
  }
}

// Recuperar dados
async function getData<T>(key: string): Promise<T | null> {
  try {
    const dataString = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!dataString) return null;
    return JSON.parse(dataString) as T;
  } catch (error) {
    console.error(`Erro ao obter dados para a chave ${key}:`, error);
    return null;
  }
}

// Remover dados
async function removeData(key: string): Promise<void> {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error(`Erro ao remover dados para a chave ${key}:`, error);
    throw error;
  }
}

// Limpar dados antigos para liberar espaço
async function clearOldData(): Promise<void> {
  try {
    // Obter todas as chaves do offline storage
    const allKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .map(key => ({
        key,
        size: localStorage.getItem(key)?.length || 0,
        time: 0 // Será preenchido abaixo
      }));
    
    // Obter timestamp para todas as entidades
    for (const item of allKeys) {
      try {
        const value = localStorage.getItem(item.key);
        if (value) {
          const data = JSON.parse(value);
          
          // Verificar se é uma operação pendente ou uma coleção de entidades
          if (Array.isArray(data) && data.length > 0) {
            // Encontrar o timestamp mais recente das entidades
            item.time = Math.max(...data.map(entity => entity.lastModified || entity.timestamp || 0));
          } else if (data.timestamp) {
            item.time = data.timestamp;
          }
        }
      } catch (err) {
        console.warn(`Erro ao analisar dados para a chave ${item.key}:`, err);
      }
    }
    
    // Calcular cutoff timestamp (TTL_DAYS dias atrás)
    const cutoffTime = Date.now() - (TTL_DAYS * 24 * 60 * 60 * 1000);
    
    // Primeiro, remover dados expirados
    const expiredItems = allKeys.filter(item => item.time < cutoffTime);
    for (const item of expiredItems) {
      localStorage.removeItem(item.key);
    }
    
    // Se ainda precisarmos de mais espaço, remover os itens mais antigos
    if (expiredItems.length === 0) {
      // Ordenar por timestamp (mais antigos primeiro)
      allKeys.sort((a, b) => a.time - b.time);
      
      // Remover os mais antigos até liberar espaço suficiente
      let removed = 0;
      let i = 0;
      
      while (i < allKeys.length && removed < MAX_STORAGE_SIZE / 2) {
        localStorage.removeItem(allKeys[i].key);
        removed += allKeys[i].size;
        i++;
      }
    }
  } catch (error) {
    console.error('Erro ao limpar dados antigos:', error);
  }
}

// Interface para sincronizar dados offline
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  pending: number;
  errors: Array<{ id: string; error: string }>;
}

// Função para sincronizar dados offline com o servidor
export async function syncOfflineData(
  fetchFn: (endpoint: string, method: string, data?: any) => Promise<any>
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    synced: 0,
    failed: 0,
    pending: 0,
    errors: []
  };
  
  try {
    let operations = await getPendingOperations();
    
    // Ordenar por prioridade e timestamp
    operations.sort((a, b) => 
      b.priority - a.priority || a.timestamp - b.timestamp
    );
    
    result.pending = operations.length;
    
    // Sincronizar cada operação pendente
    for (const operation of operations) {
      try {
        // Se já tentou muitas vezes, pular
        if (operation.retryCount >= MAX_RETRY_COUNT) {
          result.failed++;
          result.errors.push({
            id: operation.id,
            error: `Máximo de tentativas excedido (${MAX_RETRY_COUNT})`
          });
          
          // Marcar como erro nas entidades relacionadas
          if (operation.entityType && operation.entityId) {
            const entities = await getOfflineEntities(operation.entityType);
            const entityIndex = entities.findIndex(e => e.id === operation.entityId);
            
            if (entityIndex >= 0) {
              entities[entityIndex].syncStatus = 'error';
              await storeData(`${operation.entityType}`, entities);
            }
          }
          
          continue;
        }
        
        // Tentar execução da operação no servidor
        let response;
        
        switch (operation.operation) {
          case 'create':
          case 'update':
            response = await fetchFn(
              operation.endpoint,
              operation.operation === 'create' ? 'POST' : 'PUT',
              operation.data
            );
            break;
            
          case 'delete':
            response = await fetchFn(
              operation.endpoint,
              'DELETE'
            );
            break;
        }
        
        // Processamento bem-sucedido, remover da fila
        await removePendingOperation(operation.id);
        
        // Atualizar entidades locais com dados do servidor
        if (response && operation.entityType) {
          if (operation.operation === 'delete') {
            // Remover entidade local
            if (operation.entityId) {
              await removeOfflineEntity(operation.entityType, operation.entityId);
            }
          } else {
            // Atualizar entidade local com dados do servidor
            const entities = await getOfflineEntities(operation.entityType);
            
            if (operation.entityId) {
              // Atualizar entidade existente
              const entityIndex = entities.findIndex(e => 
                e.id === operation.entityId || 
                (e.localId && response.id && e.localId === operation.entityId)
              );
              
              if (entityIndex >= 0) {
                // Substituir ID local com ID do servidor, se necessário
                const updatedEntity = {
                  ...entities[entityIndex],
                  ...response,
                  syncStatus: 'synced',
                  lastModified: Date.now()
                };
                
                entities[entityIndex] = updatedEntity;
                await storeData(`${operation.entityType}`, entities);
              }
            } else if (response) {
              // Adicionar nova entidade
              const newEntity = {
                ...response,
                syncStatus: 'synced',
                lastModified: Date.now()
              };
              
              entities.push(newEntity);
              await storeData(`${operation.entityType}`, entities);
            }
          }
        }
        
        result.synced++;
      } catch (error) {
        // Incrementar contador de tentativas
        await updatePendingOperation(operation.id, {
          retryCount: operation.retryCount + 1
        });
        
        result.failed++;
        result.errors.push({
          id: operation.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Atualizar status do resultado
    result.success = result.failed === 0;
    result.pending = (await getPendingOperations()).length;
    
    return result;
  } catch (error) {
    console.error('Erro ao sincronizar dados offline:', error);
    throw error;
  }
}