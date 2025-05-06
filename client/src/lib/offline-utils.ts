/**
 * Utilitários para funcionalidades offline da aplicação
 */

import { isMobileDevice } from './websocket';
import { openDB, IDBPDatabase } from './offline-storage';

/**
 * Registra o service worker para funcionalidades offline
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrado:', registration);
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      return null;
    }
  }
  console.warn('Service Worker não suportado neste navegador');
  return null;
}

/**
 * Verifica se o aplicativo está sendo executado em modo offline
 */
export function isOfflineMode(): boolean {
  return !navigator.onLine;
}

/**
 * Adiciona listeners para eventos de conectividade
 */
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Verifica se o aplicativo pode ser instalado (PWA)
 */
export function canInstallPWA(): boolean {
  // @ts-ignore: BeforeInstallPromptEvent não está definido no TypeScript padrão
  return !!window.BeforeInstallPromptEvent || !!window.deferredPrompt;
}

/**
 * Exibe o prompt de instalação do PWA se disponível
 */
export async function showInstallPrompt(): Promise<boolean> {
  // @ts-ignore: BeforeInstallPromptEvent não está definido no TypeScript padrão
  const deferredPrompt = window.deferredPrompt;
  if (!deferredPrompt) {
    return false;
  }

  try {
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    // @ts-ignore: BeforeInstallPromptEvent não está definido no TypeScript padrão
    window.deferredPrompt = null;
    return choiceResult.outcome === 'accepted';
  } catch (error) {
    console.error('Erro ao exibir prompt de instalação:', error);
    return false;
  }
}

/**
 * Obtem o tamanho estimado do armazenamento offline
 */
export async function getOfflineStorageSize(): Promise<{
  used: number;
  quota: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      return {
        used: usage || 0,
        quota: quota || 0,
      };
    } catch (error) {
      console.error('Erro ao obter estimativa de armazenamento:', error);
    }
  }
  return { used: 0, quota: 0 };
}

/**
 * Limpa dados em cache
 */
export async function clearCachedData(cacheNames: string[] = []): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    if (cacheNames.length === 0) {
      // Limpar todos os caches
      const keys = await window.caches.keys();
      await Promise.all(keys.map(key => window.caches.delete(key)));
    } else {
      // Limpar apenas os caches especificados
      await Promise.all(cacheNames.map(name => window.caches.delete(name)));
    }
    return true;
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    return false;
  }
}

/**
 * Verifica a disponibilidade do banco de dados IndexedDB
 */
export async function isIndexedDBAvailable(): Promise<boolean> {
  if (!('indexedDB' in window)) {
    return false;
  }

  try {
    // Tentar criar um banco de dados temporário para testar
    const request = window.indexedDB.open('_test_db', 1);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        request.result.close();
        window.indexedDB.deleteDatabase('_test_db');
        resolve(true);
      };
      request.onerror = () => {
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do IndexedDB:', error);
    return false;
  }
}

/**
 * Comprime dados para armazenamento eficiente
 * (Versão simplificada, para implementação real usar uma biblioteca como pako)
 */
export function compressData(data: object): string {
  // Em uma implementação real, usaríamos uma biblioteca como pako
  // Por enquanto, apenas convertemos para JSON
  return JSON.stringify(data);
}

/**
 * Descomprime dados do armazenamento
 * (Versão simplificada, para implementação real usar uma biblioteca como pako)
 */
export function decompressData<T>(compressedData: string): T {
  // Em uma implementação real, usaríamos uma biblioteca como pako
  // Por enquanto, apenas convertemos de JSON
  return JSON.parse(compressedData) as T;
}

/**
 * Gera um ID único para requisições offline
 */
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Formata o tamanho do arquivo para exibição amigável
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Verifica se o aplicativo está sendo executado como PWA instalado
 */
export function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         // @ts-ignore: propriedade não padrão do Safari
         (window.navigator.standalone === true);
}