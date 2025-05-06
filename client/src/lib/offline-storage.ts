/**
 * Interface para interação com IndexedDB para armazenamento offline
 * Baseado na biblioteca idb para uma API mais amigável
 */

// Interface simplificada semelhante à IDBPDatabase de idb
export interface IDBPDatabase<T> {
  get(storeName: string, key: IDBValidKey): Promise<any>;
  getAll(storeName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<any[]>;
  put(storeName: string, value: any, key?: IDBValidKey): Promise<IDBValidKey>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
  clear(storeName: string): Promise<void>;
  getAllKeys(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<IDBValidKey[]>;
  count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number>;
  transaction(storeNames: string | string[], mode?: 'readonly' | 'readwrite'): IDBPTransaction<T>;
  close(): void;
}

// Interface simplificada semelhante à IDBPTransaction de idb
export interface IDBPTransaction<T> {
  objectStore(name: string): IDBPObjectStore<T, [string], string>;
  done: Promise<void>;
  commit(): void;
  abort(): void;
}

// Interface simplificada semelhante à IDBPObjectStore de idb
export interface IDBPObjectStore<T, Key extends [unknown, ...unknown[]], StoreName> {
  get(key: IDBValidKey): Promise<any>;
  getAll(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<any[]>;
  put(value: any, key?: IDBValidKey): Promise<IDBValidKey>;
  delete(key: IDBValidKey): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(query?: IDBValidKey | IDBKeyRange): Promise<IDBValidKey[]>;
  count(query?: IDBValidKey | IDBKeyRange): Promise<number>;
}

// Tipo para definição de esquema do banco de dados
export interface DBSchema {
  [storeName: string]: {
    key: string;
    value: any;
    indexes?: { [indexName: string]: { key: string; unique: boolean } };
  };
}

/**
 * Opções para abrir o banco de dados
 */
export interface OpenDBOptions<T extends DBSchema> {
  upgrade?: (db: IDBPDatabase<T>, oldVersion: number, newVersion: number | null) => void;
  blocked?: () => void;
  blocking?: () => void;
  terminated?: () => void;
}

/**
 * Abre ou cria um banco de dados IndexedDB com a estrutura especificada
 */
export async function openDB<T extends DBSchema>(
  name: string, 
  version: number, 
  options: OpenDBOptions<T> = {}
): Promise<IDBPDatabase<T>> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;
      
      if (options.upgrade) {
        const dbWrapper = wrapDatabase<T>(db);
        options.upgrade(dbWrapper, oldVersion, newVersion);
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (options.blocking) {
        db.onversionchange = options.blocking;
      }
      
      resolve(wrapDatabase<T>(db));
    };
    
    request.onerror = () => {
      reject(request.error);
    };
    
    request.onblocked = () => {
      if (options.blocked) {
        options.blocked();
      }
    };
  });
}

/**
 * Envolve o objeto IDBDatabase com uma API mais amigável
 */
function wrapDatabase<T extends DBSchema>(db: IDBDatabase): IDBPDatabase<T> {
  return {
    get: (storeName, key) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    
    getAll: (storeName, query, count) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll(query as any, count);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    
    put: (storeName, value, key) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = key !== undefined ? store.put(value, key) : store.put(value);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    
    delete: (storeName, key) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    
    clear: (storeName) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    
    getAllKeys: (storeName, query) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys(query as any);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    
    count: (storeName, query) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count(query as any);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    
    transaction: (storeNames, mode = 'readonly') => {
      const idbTransaction = db.transaction(storeNames, mode);
      
      const transaction: IDBPTransaction<T> = {
        objectStore: (name) => {
          const store = idbTransaction.objectStore(name);
          
          return {
            get: (key) => {
              return new Promise((resolve, reject) => {
                const request = store.get(key);
                
                request.onsuccess = () => {
                  resolve(request.result);
                };
                
                request.onerror = () => {
                  reject(request.error);
                };
              });
            },
            
            getAll: (query, count) => {
              return new Promise((resolve, reject) => {
                const request = store.getAll(query as any, count);
                
                request.onsuccess = () => {
                  resolve(request.result);
                };
                
                request.onerror = () => {
                  reject(request.error);
                };
              });
            },
            
            put: (value, key) => {
              return new Promise((resolve, reject) => {
                const request = key !== undefined ? store.put(value, key) : store.put(value);
                
                request.onsuccess = () => {
                  resolve(request.result);
                };
                
                request.onerror = () => {
                  reject(request.error);
                };
              });
            },
            
            delete: (key) => {
              return new Promise((resolve, reject) => {
                const request = store.delete(key);
                
                request.onsuccess = () => {
                  resolve();
                };
                
                request.onerror = () => {
                  reject(request.error);
                };
              });
            },
            
            clear: () => {
              return new Promise((resolve, reject) => {
                const request = store.clear();
                
                request.onsuccess = () => {
                  resolve();
                };
                
                request.onerror = () => {
                  reject(request.error);
                };
              });
            },
            
            getAllKeys: (query) => {
              return new Promise((resolve, reject) => {
                const request = store.getAllKeys(query as any);
                
                request.onsuccess = () => {
                  resolve(request.result);
                };
                
                request.onerror = () => {
                  reject(request.error);
                };
              });
            },
            
            count: (query) => {
              return new Promise((resolve, reject) => {
                const request = store.count(query as any);
                
                request.onsuccess = () => {
                  resolve(request.result);
                };
                
                request.onerror = () => {
                  reject(request.error);
                };
              });
            },
          } as IDBPObjectStore<T, [any], any>;
        },
        
        done: new Promise<void>((resolve, reject) => {
          idbTransaction.oncomplete = () => {
            resolve();
          };
          
          idbTransaction.onerror = () => {
            reject(idbTransaction.error);
          };
          
          idbTransaction.onabort = () => {
            reject(new Error('Transaction aborted'));
          };
        }),
        
        commit: () => {
          // IDBTransaction não tem método commit() explícito, as transações são concluídas automaticamente
        },
        
        abort: () => {
          idbTransaction.abort();
        },
      };
      
      return transaction;
    },
    
    close: () => {
      db.close();
    },
  };
}

// Esquema do banco de dados da aplicação
export interface AppDBSchema extends DBSchema {
  pendingRequests: {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      body: any;
      timestamp: number;
      retryCount: number;
      lastRetry: number | null;
    };
  };
  patients: {
    key: string;
    value: any;
    indexes: {
      byName: { key: 'name'; unique: false };
      byUpdatedAt: { key: 'updatedAt'; unique: false };
    };
  };
  appointments: {
    key: string;
    value: any;
    indexes: {
      byPatientId: { key: 'patientId'; unique: false };
      byDate: { key: 'date'; unique: false };
      byProfessionalId: { key: 'professionalId'; unique: false };
    };
  };
  evolutions: {
    key: string; 
    value: any;
    indexes: {
      byPatientId: { key: 'patientId'; unique: false };
      byDate: { key: 'date'; unique: false };
      byProfessionalId: { key: 'professionalId'; unique: false };
    };
  };
  documents: {
    key: string;
    value: any;
    indexes: {
      byPatientId: { key: 'patientId'; unique: false };
      byCategory: { key: 'category'; unique: false };
    };
  };
  syncInfo: {
    key: string;
    value: {
      lastSync: number;
      pendingChanges: number;
      syncStatus: 'idle' | 'syncing' | 'error';
      errorMessage?: string;
    };
  };
}

// Cache central do banco de dados
let dbPromise: Promise<IDBPDatabase<AppDBSchema>> | null = null;

/**
 * Obtém ou cria a instância do banco de dados da aplicação
 */
export function getAppDB(): Promise<IDBPDatabase<AppDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDBSchema>('clinica-app-db', 1, {
      upgrade(db, oldVersion, newVersion) {
        // Criar stores
        if (oldVersion < 1) {
          const pendingRequests = db.transaction.objectStore('pendingRequests');
          pendingRequests.createIndex('byTimestamp', 'timestamp', { unique: false });
          
          const patients = db.transaction.objectStore('patients');
          patients.createIndex('byName', 'name', { unique: false });
          patients.createIndex('byUpdatedAt', 'updatedAt', { unique: false });
          
          const appointments = db.transaction.objectStore('appointments');
          appointments.createIndex('byPatientId', 'patientId', { unique: false });
          appointments.createIndex('byDate', 'date', { unique: false });
          appointments.createIndex('byProfessionalId', 'professionalId', { unique: false });
          
          const evolutions = db.transaction.objectStore('evolutions');
          evolutions.createIndex('byPatientId', 'patientId', { unique: false });
          evolutions.createIndex('byDate', 'date', { unique: false });
          evolutions.createIndex('byProfessionalId', 'professionalId', { unique: false });
          
          const documents = db.transaction.objectStore('documents');
          documents.createIndex('byPatientId', 'patientId', { unique: false });
          documents.createIndex('byCategory', 'category', { unique: false });
          
          const syncInfo = db.transaction.objectStore('syncInfo');
          // Inserir registro inicial de sincronização
          syncInfo.put({
            lastSync: 0,
            pendingChanges: 0,
            syncStatus: 'idle'
          }, 'sync-status');
        }
      },
      blocked() {
        console.warn('Banco de dados bloqueado por outra aba');
      },
      blocking() {
        console.warn('Esta aba está bloqueando a atualização do banco de dados em outra aba');
      },
      terminated() {
        console.error('Conexão com o banco de dados encerrada inesperadamente');
        dbPromise = null;
      }
    });
  }
  
  return dbPromise;
}

/**
 * Salva uma requisição pendente para ser processada quando houver conexão
 */
export async function savePendingRequest(
  url: string,
  method: string,
  body: any
): Promise<string> {
  const db = await getAppDB();
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  await db.put('pendingRequests', {
    id,
    url,
    method,
    body,
    timestamp: Date.now(),
    retryCount: 0,
    lastRetry: null
  }, id);
  
  // Atualizar contagem de alterações pendentes
  const syncInfo = await db.get('syncInfo', 'sync-status');
  await db.put('syncInfo', {
    ...syncInfo,
    pendingChanges: (syncInfo?.pendingChanges || 0) + 1
  }, 'sync-status');
  
  return id;
}

/**
 * Obtém todas as requisições pendentes
 */
export async function getPendingRequests(): Promise<any[]> {
  const db = await getAppDB();
  return db.getAll('pendingRequests');
}

/**
 * Remove uma requisição pendente após ser processada
 */
export async function removePendingRequest(id: string): Promise<void> {
  const db = await getAppDB();
  await db.delete('pendingRequests', id);
  
  // Atualizar contagem de alterações pendentes
  const syncInfo = await db.get('syncInfo', 'sync-status');
  await db.put('syncInfo', {
    ...syncInfo,
    pendingChanges: Math.max(0, (syncInfo?.pendingChanges || 0) - 1)
  }, 'sync-status');
}

/**
 * Obtém status atual da sincronização
 */
export async function getSyncStatus(): Promise<{
  lastSync: number;
  pendingChanges: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}> {
  const db = await getAppDB();
  const status = await db.get('syncInfo', 'sync-status');
  
  return status || {
    lastSync: 0,
    pendingChanges: 0,
    syncStatus: 'idle'
  };
}

/**
 * Atualiza o status da sincronização
 */
export async function updateSyncStatus(status: Partial<{
  lastSync: number;
  pendingChanges: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}>): Promise<void> {
  const db = await getAppDB();
  const currentStatus = await db.get('syncInfo', 'sync-status');
  
  await db.put('syncInfo', {
    ...currentStatus,
    ...status
  }, 'sync-status');
}

/**
 * Limpa todos os dados armazenados no banco de dados local
 */
export async function clearAllData(): Promise<void> {
  const db = await getAppDB();
  
  await db.clear('pendingRequests');
  await db.clear('patients');
  await db.clear('appointments');
  await db.clear('evolutions');
  await db.clear('documents');
  
  // Resetar status de sincronização
  await db.put('syncInfo', {
    lastSync: 0,
    pendingChanges: 0,
    syncStatus: 'idle'
  }, 'sync-status');
}