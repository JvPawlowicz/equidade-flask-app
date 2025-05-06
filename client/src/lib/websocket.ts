/**
 * Interface que estende o WebSocket para suporte a dispositivos móveis
 * e situações de conectividade instável
 */
export interface MobileWebSocket extends WebSocket {
  /**
   * Envia uma mensagem pelo websocket
   * @returns boolean indicando se a mensagem foi enviada com sucesso
   */
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): boolean;
}

/**
 * Opções para configuração do WebSocket
 */
export interface WebSocketOptions {
  url: string;
  enableOfflineQueue: boolean;
  reconnectTimeout: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  exponentialBackoff: boolean;
  onOpen: (event: Event) => void;
  onMessage: (event: MessageEvent) => void;
  onClose: (event: CloseEvent) => void;
  onError: (event: Event) => void;
  onReconnect: (attemptCount: number) => void;
  onReconnectFailed: () => void;
  onOfflineQueueSynced: () => void;
}

/**
 * Cria um WebSocket com suporte a dispositivos móveis e reconexão automática
 */
export function createWebSocket(options: Partial<WebSocketOptions> & { url: string }): MobileWebSocket {
  // Opções padrão
  const defaultOptions: WebSocketOptions = {
    url: options.url,
    enableOfflineQueue: true,
    reconnectTimeout: 2000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    exponentialBackoff: true,
    onOpen: () => {},
    onMessage: () => {},
    onClose: () => {},
    onError: () => {},
    onReconnect: () => {},
    onReconnectFailed: () => {},
    onOfflineQueueSynced: () => {}
  };

  // Mesclar opções padrão com as fornecidas
  const finalOptions: WebSocketOptions = { ...defaultOptions, ...options };

  // Fila de mensagens offline
  const offlineQueue: string[] = [];
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let ws: WebSocket | null = null;

  try {
    // Criar WebSocket
    ws = new WebSocket(finalOptions.url);
  } catch (error) {
    console.error("Erro ao criar WebSocket:", error);
    throw error;
  }

  /**
   * Função interna para reconectar o WebSocket
   */
  function reconnect() {
    if (reconnectAttempts >= finalOptions.maxReconnectAttempts) {
      finalOptions.onReconnectFailed();
      return;
    }

    reconnectAttempts++;
    finalOptions.onReconnect(reconnectAttempts);

    // Calcular timeout com backoff exponencial se configurado
    const timeout = finalOptions.exponentialBackoff
      ? Math.min(30000, finalOptions.reconnectTimeout * Math.pow(1.5, reconnectAttempts - 1))
      : finalOptions.reconnectTimeout;

    reconnectTimeout = setTimeout(() => {
      try {
        ws = new WebSocket(finalOptions.url);
        setupEventHandlers();
      } catch (error) {
        console.error("Erro ao reconectar WebSocket:", error);
        reconnect();
      }
    }, timeout);
  }

  /**
   * Configura os manipuladores de eventos para o WebSocket
   */
  function setupEventHandlers() {
    if (!ws) return;

    ws.onopen = (event: Event) => {
      reconnectAttempts = 0;

      // Configurar heartbeat para manter a conexão viva
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, finalOptions.heartbeatInterval);

      // Processar mensagens em fila offline
      if (finalOptions.enableOfflineQueue && offlineQueue.length > 0) {
        processOfflineQueue();
      }

      finalOptions.onOpen(event);
    };

    ws.onmessage = finalOptions.onMessage;

    ws.onclose = (event: CloseEvent) => {
      // Limpar intervalos
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      finalOptions.onClose(event);

      // Não reconectar se foi um fechamento "limpo" (código 1000)
      if (event.code !== 1000) {
        reconnect();
      }
    };

    ws.onerror = (event: Event) => {
      finalOptions.onError(event);
    };
  }

  /**
   * Processa a fila de mensagens offline quando o WebSocket está conectado
   */
  function processOfflineQueue() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    let successCount = 0;
    const queueSize = offlineQueue.length;

    while (offlineQueue.length > 0) {
      const message = offlineQueue.shift();
      if (message && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
          successCount++;
        } catch (error) {
          console.error("Erro ao enviar mensagem da fila offline:", error);
          // Se houver erro, recolocar a mensagem na fila
          offlineQueue.unshift(message);
          break;
        }
      }
    }

    // Se todas as mensagens foram enviadas, notificar
    if (queueSize > 0 && offlineQueue.length === 0) {
      finalOptions.onOfflineQueueSynced();
    }
  }

  // Configurar manipuladores de eventos
  setupEventHandlers();

  // Estender o objeto WebSocket com funcionalidades adicionais
  const extendedWs = ws as MobileWebSocket;

  // Sobrescrever o método send para lidar com a fila offline
  const originalSend = ws.send.bind(ws);
  extendedWs.send = function(data: string | ArrayBufferLike | Blob | ArrayBufferView): boolean {
    try {
      // Se WebSocket estiver conectado, enviar normalmente
      if (this.readyState === WebSocket.OPEN) {
        originalSend(data);
        return true;
      } else if (finalOptions.enableOfflineQueue && typeof data === 'string') {
        // Se não estiver conectado, adicionar à fila offline (apenas strings)
        offlineQueue.push(data);
        return false;
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      if (finalOptions.enableOfflineQueue && typeof data === 'string') {
        offlineQueue.push(data);
        return false;
      }
    }
    return false;
  };

  return extendedWs;
}

/**
 * Verifica se o dispositivo atual é um dispositivo móvel
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Verifica se a conexão atual é lenta (2G ou 3G)
 */
export function isSlowConnection(): boolean {
  const connection = (navigator as any).connection;
  
  if (!connection) {
    return false;
  }
  
  // Verificar tipo de conexão se disponível
  const type = connection.effectiveType;
  return type === 'slow-2g' || type === '2g' || type === '3g';
}