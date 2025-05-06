import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Tipos de estado da conexão WebSocket
export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'reconnecting';

// Interface para mensagens
export interface WebSocketMessage {
  type: string;
  payload: any;
  id?: string;
  timestamp?: number;
  offline?: boolean;
  pendingSync?: boolean;
  localId?: string;
}

// Interface para mensagens offline que estendem a interface básica
export interface OfflineWebSocketMessage extends WebSocketMessage {
  offline: boolean;
  pendingSync: boolean;
  localId: string;
}

// Configurações do WebSocket
interface WebSocketOptions {
  // Tempo entre tentativas de reconexão (ms)
  reconnectInterval?: number;
  // Tempo máximo entre tentativas (ms)
  maxReconnectInterval?: number;
  // Número máximo de tentativas de reconexão
  maxReconnectAttempts?: number;
  // Tempo antes de considerar a conexão como inativa (ms)
  pingInterval?: number;
  // Suporte a conexões instáveis em mobile
  mobileOptimized?: boolean;
  // Armazenar mensagens não entregues para envio posterior
  storeUndeliveredMessages?: boolean;
  // Manipulador personalizado para reconexão
  onReconnect?: () => void;
  // Manipulador para quando a reconexão falhar completamente
  onReconnectFailed?: () => void;
}

// Estado para rastreamento de reconexão
interface ReconnectState {
  attempts: number;
  timeout: number | null;
}

// Hook para WebSocket com otimização para mobile
export function useWebSocket(
  url: string,
  options: WebSocketOptions = {}
) {
  const defaultOptions: WebSocketOptions = {
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,
    maxReconnectAttempts: 50, // Mais tentativas para redes móveis instáveis
    pingInterval: 30000,
    mobileOptimized: true,
    storeUndeliveredMessages: true,
  };

  const opts = { ...defaultOptions, ...options };
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReconnectState>({ attempts: 0, timeout: null });
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const { toast } = useToast();

  // Determinar protocolo WebSocket com base no protocolo da página
  const getWebSocketUrl = useCallback(() => {
    // Se o URL já incluir ws:// ou wss://, use-o como está
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return url;
    }

    // Caso contrário, adicione o protocolo apropriado
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Se o URL começar com uma barra, considere-o um caminho relativo
    if (url.startsWith('/')) {
      return `${protocol}//${window.location.host}${url}`;
    }
    // Caso contrário, considere-o um URL completo sem protocolo
    return `${protocol}//${url}`;
  }, [url]);

  // Função para conectar ao WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const websocketUrl = getWebSocketUrl();
      const socket = new WebSocket(websocketUrl);
      socketRef.current = socket;
      setStatus('connecting');

      socket.onopen = () => {
        setStatus('open');
        console.log('WebSocket conectado');
        reconnectRef.current.attempts = 0;

        // Enviar mensagens que estavam na fila
        if (opts.storeUndeliveredMessages && messageQueueRef.current.length > 0) {
          messageQueueRef.current.forEach(msg => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(msg));
            }
          });
          messageQueueRef.current = [];
        }

        // Iniciar ping para manter a conexão ativa em redes móveis
        if (opts.mobileOptimized && opts.pingInterval) {
          startPing();
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (e) {
          console.error('Erro ao processar mensagem WebSocket:', e);
        }
      };

      socket.onclose = (event) => {
        setStatus('closed');
        console.log(`WebSocket fechado, código: ${event.code}, razão: ${event.reason}`);
        stopPing();

        // Não tentar reconectar automaticamente em casos de fechamento normal
        if (event.code !== 1000) {
          scheduleReconnect();
        }
      };

      socket.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        socket.close();
      };

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      scheduleReconnect();
    }
  }, [getWebSocketUrl, opts.pingInterval, opts.mobileOptimized, opts.storeUndeliveredMessages]);

  // Função para agendar reconexão
  const scheduleReconnect = useCallback(() => {
    if (reconnectRef.current.timeout !== null) {
      clearTimeout(reconnectRef.current.timeout);
    }

    if (reconnectRef.current.attempts >= (opts.maxReconnectAttempts || 50)) {
      console.log('Número máximo de tentativas de reconexão atingido');
      if (opts.onReconnectFailed) {
        opts.onReconnectFailed();
      }
      
      // Notificar o usuário
      toast({
        title: "Falha na conexão",
        description: "Não foi possível estabelecer conexão com o servidor. Verifique sua conexão de internet.",
        variant: "destructive"
      });
      
      return;
    }

    // Tempo exponencial de espera com máximo
    const delay = Math.min(
      (opts.reconnectInterval || 1000) * Math.pow(1.5, reconnectRef.current.attempts),
      opts.maxReconnectInterval || 30000
    );

    setStatus('reconnecting');
    
    // Mostrar mensagem apenas nas primeiras tentativas para não irritar o usuário
    if (reconnectRef.current.attempts === 0) {
      toast({
        title: "Reconectando...",
        description: "Tentando reestabelecer a conexão com o servidor.",
      });
    }

    reconnectRef.current.attempts += 1;
    reconnectRef.current.timeout = window.setTimeout(() => {
      if (opts.onReconnect) {
        opts.onReconnect();
      }
      connect();
    }, delay);
  }, [connect, opts.maxReconnectAttempts, opts.reconnectInterval, opts.maxReconnectInterval, opts.onReconnect, opts.onReconnectFailed, toast]);

  // Função para ping para manter conexão ativa
  const pingTimeoutRef = useRef<number | null>(null);

  const startPing = useCallback(() => {
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
    }

    pingTimeoutRef.current = window.setTimeout(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'PING' }));
      }
      startPing();
    }, opts.pingInterval);
  }, [opts.pingInterval]);

  const stopPing = useCallback(() => {
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
  }, []);

  // Enviar mensagem através do WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    const enhancedMessage = {
      ...message,
      id: message.id || `msg_${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
      timestamp: message.timestamp || Date.now()
    };

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(enhancedMessage));
      return true;
    } else {
      // Se o WebSocket não estiver aberto e tivermos a opção de armazenar mensagens
      if (opts.storeUndeliveredMessages) {
        messageQueueRef.current.push(enhancedMessage);
        
        // Tentativa de reconexão se não estiver já tentando
        if (status !== 'connecting' && status !== 'reconnecting') {
          scheduleReconnect();
        }
        
        return false;
      }
      
      return false;
    }
  }, [status, scheduleReconnect, opts.storeUndeliveredMessages]);

  // Desconectar WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      setStatus('closing');
      socketRef.current.close();
      socketRef.current = null;
    }

    stopPing();

    if (reconnectRef.current.timeout !== null) {
      clearTimeout(reconnectRef.current.timeout);
      reconnectRef.current.timeout = null;
    }
  }, [stopPing]);

  // Conectar WebSocket quando o componente montar
  useEffect(() => {
    connect();

    // Adicionar listeners para conectividade de rede
    const handleOnline = () => {
      if (status === 'closed' || status === 'reconnecting') {
        connect();
      }
    };

    const handleOffline = () => {
      if (socketRef.current) {
        // Apenas registrar o estado, não fechar o socket ainda
        // pois a conexão pode ser retomada
        console.log('Dispositivo offline, aguardando reconexão à rede...');
      }
    };

    // Detectar mudanças no estado da rede
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detectar quando o aplicativo volta ao primeiro plano em dispositivos móveis
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && 
          (status === 'closed' || status === 'reconnecting')) {
        connect();
      }
    });

    return () => {
      disconnect();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, disconnect, status]);

  return {
    status,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    reconnect: connect,
    pendingMessages: messageQueueRef.current.length
  };
}

// Helper para guardar mensagens localmente para o modo offline
export function storeOfflineMessage(channelId: string, message: WebSocketMessage): void {
  try {
    const key = `offline_messages_${channelId}`;
    const stored = localStorage.getItem(key);
    const messages = stored ? JSON.parse(stored) : [];
    
    const offlineMessage: OfflineWebSocketMessage = {
      ...message,
      offline: true,
      pendingSync: true,
      localId: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: message.timestamp || Date.now()
    };
    
    messages.push(offlineMessage);
    
    // Limitar o número de mensagens offline para economizar espaço
    const limitedMessages = messages.slice(-100);
    localStorage.setItem(key, JSON.stringify(limitedMessages));
  } catch (error) {
    console.error('Erro ao armazenar mensagem offline:', error);
  }
}

// Helper para obter mensagens offline
export function getOfflineMessages(channelId: string): WebSocketMessage[] {
  try {
    const key = `offline_messages_${channelId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao recuperar mensagens offline:', error);
    return [];
  }
}

// Continuando com a implementação para mensagens offline...

// Helper para sincronizar mensagens offline quando a conexão voltar
export async function syncOfflineMessages(
  channelId: string, 
  sendFn: (message: WebSocketMessage) => boolean
): Promise<number> {
  try {
    const messages = getOfflineMessages(channelId) as OfflineWebSocketMessage[];
    let syncedCount = 0;
    
    // Sincronizar cada mensagem
    for (const message of messages) {
      if (message.pendingSync) {
        const success = sendFn(message);
        
        if (success) {
          syncedCount++;
          message.pendingSync = false;
        }
      }
    }
    
    // Atualizar o armazenamento com as mensagens que ainda não foram sincronizadas
    const pendingMessages = messages.filter(m => m.pendingSync);
    localStorage.setItem(`offline_messages_${channelId}`, JSON.stringify(pendingMessages));
    
    return syncedCount;
  } catch (error) {
    console.error('Erro ao sincronizar mensagens offline:', error);
    return 0;
  }
}