/**
 * Módulo de WebSocket otimizado para dispositivos móveis
 * com suporte a reconexão automática, detecção de inatividade,
 * e comportamento adaptativo para redes instáveis
 */

export interface WebSocketOptions {
  // URL do WebSocket
  url: string;
  
  // Tempo de reconexão em ms (default: 3000)
  reconnectTimeout?: number;
  
  // Número máximo de tentativas de reconexão (default: Infinity)
  maxReconnectAttempts?: number;
  
  // Tempo entre heartbeats em ms (default: 30000)
  heartbeatInterval?: number;
  
  // Flag para exponential backoff na reconexão (default: true)
  exponentialBackoff?: boolean;
  
  // Manipuladores de eventos
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  
  // Callback para reconexão
  onReconnect?: (attemptCount: number) => void;
  
  // Callback para falha na reconexão
  onReconnectFailed?: () => void;
  
  // Manipulação de dados offline
  enableOfflineQueue?: boolean;
  
  // Callback para quando a fila offline for sincronizada
  onOfflineQueueSynced?: () => void;
  
  // Timeout de inatividade antes de fechar a conexão (0 para desativar)
  inactivityTimeout?: number;
}

// Interface para mensagens na fila offline
interface QueuedMessage {
  data: string | ArrayBufferLike | Blob | ArrayBufferView;
  timestamp: number;
  id: string;
  attemptCount: number;
}

export class MobileWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: number | null = null;
  private heartbeatTimeoutId: number | null = null;
  private inactivityTimeoutId: number | null = null;
  private isConnecting = false;
  private lastActivity = Date.now();
  private offlineQueue: QueuedMessage[] = [];
  private isReconnecting = false;
  private shouldReconnect = true;
  
  constructor(options: WebSocketOptions) {
    // Definir opções padrão
    this.url = options.url;
    this.options = {
      url: options.url,
      reconnectTimeout: options.reconnectTimeout || 3000,
      maxReconnectAttempts: options.maxReconnectAttempts || Infinity,
      heartbeatInterval: options.heartbeatInterval || 30000,
      exponentialBackoff: options.exponentialBackoff !== false,
      onOpen: options.onOpen || (() => {}),
      onMessage: options.onMessage || (() => {}),
      onClose: options.onClose || (() => {}),
      onError: options.onError || (() => {}),
      onReconnect: options.onReconnect || (() => {}),
      onReconnectFailed: options.onReconnectFailed || (() => {}),
      enableOfflineQueue: options.enableOfflineQueue || false,
      onOfflineQueueSynced: options.onOfflineQueueSynced || (() => {}),
      inactivityTimeout: options.inactivityTimeout || 0
    };
    
    // Tentar recuperar a fila offline do localStorage
    this.loadOfflineQueue();
    
    // Iniciar conexão
    this.connect();
    
    // Configurar eventos de conexão para detectar quando voltar online
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  // Conectar ao WebSocket
  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }
    
    this.isConnecting = true;
    this.shouldReconnect = true;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = (event: Event) => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastActivity = Date.now();
        
        // Iniciar heartbeat
        this.startHeartbeat();
        
        // Iniciar timeout de inatividade
        this.resetInactivityTimeout();
        
        // Processar fila offline quando conectar
        if (this.options.enableOfflineQueue) {
          this.processOfflineQueue();
        }
        
        this.options.onOpen(event);
      };
      
      this.ws.onmessage = (event: MessageEvent) => {
        this.lastActivity = Date.now();
        this.resetInactivityTimeout();
        this.options.onMessage(event);
      };
      
      this.ws.onclose = (event: CloseEvent) => {
        this.isConnecting = false;
        this.clearTimeouts();
        
        // Se não for um fechamento limpo (código 1000) e devemos reconectar
        if (event.code !== 1000 && this.shouldReconnect) {
          this.scheduleReconnect();
        }
        
        this.options.onClose(event);
      };
      
      this.ws.onerror = (event: Event) => {
        this.isConnecting = false;
        this.options.onError(event);
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('Erro ao conectar WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  // Agendar reconexão com exponential backoff
  private scheduleReconnect(): void {
    if (
      this.reconnectAttempts >= this.options.maxReconnectAttempts || 
      this.reconnectTimeoutId !== null ||
      !navigator.onLine
    ) {
      if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
        this.options.onReconnectFailed();
      }
      return;
    }
    
    this.reconnectAttempts++;
    this.isReconnecting = true;
    
    // Calcular timeout com exponential backoff
    let timeout = this.options.reconnectTimeout;
    if (this.options.exponentialBackoff) {
      // Usar fórmula: baseTimeout * 2^attemptCount com jitter
      const backoffFactor = Math.pow(2, Math.min(this.reconnectAttempts - 1, 6));
      const jitter = Math.random() * 0.5 + 0.75; // Entre 0.75 e 1.25
      timeout = this.options.reconnectTimeout * backoffFactor * jitter;
    }
    
    // Limitar timeout máximo a 60 segundos
    timeout = Math.min(timeout, 60000);
    
    this.options.onReconnect(this.reconnectAttempts);
    
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectTimeoutId = null;
      this.connect();
    }, timeout);
  }
  
  // Enviar heartbeat para manter a conexão
  private startHeartbeat(): void {
    this.clearHeartbeat();
    
    if (this.options.heartbeatInterval <= 0) {
      return;
    }
    
    this.heartbeatTimeoutId = window.setTimeout(() => {
      this.sendHeartbeat();
      this.startHeartbeat();
    }, this.options.heartbeatInterval);
  }
  
  // Enviar mensagem de heartbeat
  private sendHeartbeat(): void {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Usar ping/pong ou uma mensagem customizada
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('Erro ao enviar heartbeat:', error);
    }
  }
  
  // Limpar heartbeat
  private clearHeartbeat(): void {
    if (this.heartbeatTimeoutId !== null) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
  }
  
  // Reiniciar timeout de inatividade
  private resetInactivityTimeout(): void {
    this.clearInactivityTimeout();
    
    if (this.options.inactivityTimeout <= 0) {
      return;
    }
    
    this.inactivityTimeoutId = window.setTimeout(() => {
      if (Date.now() - this.lastActivity > this.options.inactivityTimeout) {
        // Fechar websocket após período de inatividade
        this.close(1000, 'Fechado por inatividade');
      }
    }, this.options.inactivityTimeout);
  }
  
  // Limpar timeout de inatividade
  private clearInactivityTimeout(): void {
    if (this.inactivityTimeoutId !== null) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }
  }
  
  // Limpar todos os timeouts
  private clearTimeouts(): void {
    this.clearHeartbeat();
    this.clearInactivityTimeout();
    
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
  
  // Manipular evento de online
  private handleOnline = (): void => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
  }
  
  // Manipular evento de offline
  private handleOffline = (): void => {
    // Cancelar tentativas de reconexão quando offline
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
  
  // Manipular mudanças de visibilidade
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // Se a guia ficar visível e a conexão estiver fechada, reconectar
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    } else {
      // Se a guia ficar invisível e há timeout de inatividade, considerar fechar a conexão
      if (this.options.inactivityTimeout > 0 && this.ws?.readyState === WebSocket.OPEN) {
        // Não fechamos imediatamente, mas podemos aumentar o timeout para economizar recursos
      }
    }
  }
  
  // Adicionar mensagem à fila offline
  private addToOfflineQueue(data: string | ArrayBufferLike | Blob | ArrayBufferView): string {
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      data,
      timestamp: Date.now(),
      id,
      attemptCount: 0
    };
    
    this.offlineQueue.push(queuedMessage);
    this.saveOfflineQueue();
    
    return id;
  }
  
  // Salvar fila offline no localStorage
  private saveOfflineQueue(): void {
    try {
      // Só armazenar mensagens com dados string para simplicidade
      const serializable = this.offlineQueue.filter(
        msg => typeof msg.data === 'string'
      );
      
      localStorage.setItem('ws_offline_queue', JSON.stringify(serializable));
    } catch (error) {
      console.error('Erro ao salvar fila offline:', error);
    }
  }
  
  // Carregar fila offline do localStorage
  private loadOfflineQueue(): void {
    try {
      const queue = localStorage.getItem('ws_offline_queue');
      if (queue) {
        this.offlineQueue = JSON.parse(queue);
      }
    } catch (error) {
      console.error('Erro ao carregar fila offline:', error);
      this.offlineQueue = [];
    }
  }
  
  // Processar fila offline
  private processOfflineQueue(): void {
    if (!this.options.enableOfflineQueue || this.offlineQueue.length === 0) {
      return;
    }
    
    // Ordenar por timestamp (mais antigos primeiro)
    this.offlineQueue.sort((a, b) => a.timestamp - b.timestamp);
    
    // Processar cada mensagem
    const queueCopy = [...this.offlineQueue];
    this.offlineQueue = [];
    
    let successCount = 0;
    
    queueCopy.forEach(msg => {
      try {
        this.send(msg.data);
        successCount++;
      } catch (error) {
        // Se falhar, reinserir na fila
        msg.attemptCount++;
        
        // Limitar o número de tentativas
        if (msg.attemptCount < 5) {
          this.offlineQueue.push(msg);
        }
      }
    });
    
    this.saveOfflineQueue();
    
    if (successCount > 0 && this.options.onOfflineQueueSynced) {
      this.options.onOfflineQueueSynced();
    }
  }
  
  // Métodos públicos
  
  // Enviar mensagem
  public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): boolean {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(data);
        this.lastActivity = Date.now();
        this.resetInactivityTimeout();
        return true;
      }
      
      // Se não estiver conectado e a fila offline estiver habilitada
      if (this.options.enableOfflineQueue) {
        this.addToOfflineQueue(data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Tentar adicionar à fila offline em caso de erro
      if (this.options.enableOfflineQueue) {
        this.addToOfflineQueue(data);
        return true;
      }
      
      return false;
    }
  }
  
  // Fechar conexão
  public close(code: number = 1000, reason: string = ''): void {
    this.shouldReconnect = false;
    this.clearTimeouts();
    
    if (this.ws) {
      try {
        this.ws.close(code, reason);
      } catch (error) {
        console.error('Erro ao fechar WebSocket:', error);
      }
    }
  }
  
  // Reconectar manualmente
  public reconnect(): void {
    this.close(1000, 'Reconnecting');
    this.shouldReconnect = true;
    this.connect();
  }
  
  // Verificar se está conectado
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  // Obter informações sobre a conexão
  public getStatus(): {
    readyState: number;
    reconnectAttempts: number;
    queuedMessages: number;
    isReconnecting: boolean;
    lastActivity: number;
  } {
    return {
      readyState: this.ws ? this.ws.readyState : -1,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.offlineQueue.length,
      isReconnecting: this.isReconnecting,
      lastActivity: this.lastActivity
    };
  }
  
  // Limpar a fila offline
  public clearOfflineQueue(): void {
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }
  
  // Liberar recursos
  public destroy(): void {
    this.clearTimeouts();
    this.close(1000, 'WebSocket destroyed');
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

// Função utilitária para criar uma instância de MobileWebSocket
export function createWebSocket(options: WebSocketOptions): MobileWebSocket {
  return new MobileWebSocket(options);
}