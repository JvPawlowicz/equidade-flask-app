import { createWebSocket, MobileWebSocket, WebSocketOptions } from "./websocket";
import { useEffect, useState } from "react";

/**
 * Gerenciador central de WebSocket para a aplicação
 * Fornece uma interface unificada para WebSockets com reconexão automática
 * e suporte a múltiplos canais de comunicação.
 */
class WebSocketManager {
  private socket: MobileWebSocket | null = null;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private url: string;
  private options: Partial<WebSocketOptions>;
  private user: any = null;

  constructor() {
    // Configurar URL do WebSocket baseada no ambiente
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
    
    // Configurar opções padrão
    this.options = {
      enableOfflineQueue: true,
      reconnectTimeout: 2000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      exponentialBackoff: true,
      onOpen: this.handleOpen.bind(this),
      onMessage: this.handleMessage.bind(this),
      onClose: this.handleClose.bind(this),
      onError: this.handleError.bind(this),
      onReconnect: this.handleReconnect.bind(this),
      onReconnectFailed: this.handleReconnectFailed.bind(this),
      onOfflineQueueSynced: this.handleOfflineQueueSynced.bind(this)
    };
  }

  /**
   * Inicializa e conecta o WebSocket
   * @param user Informações do usuário para autenticação (opcional)
   */
  public connect(user?: any): void {
    if (this.socket) {
      return;
    }

    // Salvar o usuário se fornecido
    if (user) {
      this.user = user;
    }

    this.connectionStatus = 'connecting';

    try {
      this.socket = createWebSocket({
        ...this.options,
        url: this.url
      });
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      this.connectionStatus = 'disconnected';
    }
  }

  /**
   * Desconecta o WebSocket
   */
  public disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.close(1000, "Disconnected by user");
    this.socket = null;
    this.connectionStatus = 'disconnected';
  }

  /**
   * Envia uma mensagem através do WebSocket
   */
  public send(type: string, data: any = {}): boolean {
    if (!this.socket) {
      console.warn('Tentativa de enviar mensagem sem conexão WebSocket ativa');
      return false;
    }

    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });

    return this.socket.send(message);
  }

  /**
   * Registra um manipulador para um tipo específico de mensagem
   */
  public on(type: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    // Retorna função para remover o handler
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  /**
   * Remove um manipulador de um tipo específico de mensagem
   */
  public off(type: string, handler?: (data: any) => void): void {
    if (!handler) {
      // Se não for especificado um handler, remove todos para este tipo
      this.messageHandlers.delete(type);
      return;
    }

    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  /**
   * Retorna o status atual da conexão
   */
  public getStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }
  
  /**
   * Verifica se o WebSocket está conectado
   */
  public isConnected(): boolean {
    return this.connectionStatus === 'connected' && 
           this.socket !== null && 
           this.socket.readyState === WebSocket.OPEN;
  }
  
  /**
   * Envia uma mensagem de chat para um usuário ou grupo
   * @param message Conteúdo da mensagem
   * @param recipientId ID do destinatário (para mensagens diretas)
   * @param groupId ID do grupo (para mensagens de grupo)
   */
  public sendChatMessage(
    message: string, 
    recipientId?: number, 
    groupId?: number
  ): boolean {
    if (!this.user) {
      console.error('Tentativa de enviar mensagem sem usuário autenticado');
      return false;
    }
    
    if (!recipientId && !groupId) {
      console.error('Destinatário ou grupo deve ser especificado');
      return false;
    }
    
    const type = groupId ? 'send_group_message' : 'send_message';
    
    const data = {
      senderId: this.user.id,
      content: message,
      ...(recipientId && { recipientId }),
      ...(groupId && { groupId })
    };
    
    return this.send(type, data);
  }

  /**
   * Manipulador de evento de abertura de conexão
   */
  private handleOpen(event: Event): void {
    console.log('WebSocket conectado');
    this.connectionStatus = 'connected';
    
    // Enviar ping inicial
    this.send('ping');
  }

  /**
   * Manipulador de mensagens recebidas
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      // Se for uma mensagem de pong, não processamos como mensagem normal
      if (message.type === 'pong') {
        return;
      }
      
      // Processar mensagem normal
      const { type, data } = message;
      
      if (!type) {
        console.warn('Mensagem recebida sem tipo:', message);
        return;
      }
      
      // Chamar manipuladores registrados para este tipo
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Erro no manipulador para mensagem ${type}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  /**
   * Manipulador de fechamento de conexão
   */
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket fechado: ${event.code} - ${event.reason}`);
    this.connectionStatus = 'disconnected';
    
    // Se for um fechamento "limpo" (código 1000), não tentamos reconectar
    if (event.code === 1000) {
      return;
    }
  }

  /**
   * Manipulador de erros de conexão
   */
  private handleError(event: Event): void {
    console.error('Erro no WebSocket:', event);
    this.connectionStatus = 'disconnected';
  }

  /**
   * Manipulador de evento de reconexão
   */
  private handleReconnect(attemptCount: number): void {
    console.log(`Tentativa de reconexão #${attemptCount}`);
    this.connectionStatus = 'connecting';
  }

  /**
   * Manipulador de falha na reconexão
   */
  private handleReconnectFailed(): void {
    console.error('Falha na reconexão ao WebSocket após múltiplas tentativas');
    this.connectionStatus = 'disconnected';
    
    // Não podemos usar toast diretamente em uma classe não-React
    // Os erros serão registrados apenas no console
  }

  /**
   * Manipulador de sincronização da fila offline
   */
  private handleOfflineQueueSynced(): void {
    console.log('Fila offline sincronizada com sucesso');
    
    // Não podemos usar toast diretamente em uma classe não-React
    // Os sucessos serão registrados apenas no console
  }
}

// Instância única do gerenciador
export const webSocketManager = new WebSocketManager();

/**
 * Hook para usar o WebSocket em componentes React
 */
export function useWebSocket(autoConnect: boolean = true) {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>(
    webSocketManager.getStatus()
  );

  useEffect(() => {
    if (autoConnect) {
      webSocketManager.connect();
    }

    // Atualizar estado quando o status mudar
    const checkStatus = () => {
      const currentStatus = webSocketManager.getStatus();
      setStatus(currentStatus);
    };

    // Verificar status a cada segundo
    const intervalId = setInterval(checkStatus, 1000);

    return () => {
      clearInterval(intervalId);
      // Não desconectamos automaticamente para manter a conexão entre componentes
    };
  }, [autoConnect]);

  return {
    status,
    connect: () => webSocketManager.connect(),
    disconnect: () => webSocketManager.disconnect(),
    send: (type: string, data: any = {}) => webSocketManager.send(type, data),
    on: (type: string, handler: (data: any) => void) => webSocketManager.on(type, handler),
    off: (type: string, handler?: (data: any) => void) => webSocketManager.off(type, handler)
  };
}