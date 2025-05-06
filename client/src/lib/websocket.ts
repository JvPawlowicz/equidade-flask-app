import { User } from "@shared/schema";

/**
 * WebSocketManager - Singleton para gerenciar conexões WebSocket
 * 
 * Esta classe gerencia uma única conexão WebSocket e permite
 * enviar e receber mensagens.
 */
class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 segundos
  private currentUser: User | null = null;
  private messageQueue: any[] = [];
  private connected = false;

  private constructor() {
    // Construtor privado para padrão Singleton
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Conecta ao servidor WebSocket e autentica o usuário
   */
  public connect(user: User): void {
    if (this.socket && this.connected) {
      console.log('WebSocket: Já conectado');
      return;
    }

    this.currentUser = user;
    this.reconnectAttempts = 0;
    this.establishConnection();
  }

  /**
   * Estabelece a conexão WebSocket e configura handlers
   */
  private establishConnection(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`WebSocket: Conectando a ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket: Erro ao estabelecer conexão:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Manipula evento de abertura da conexão
   */
  private handleOpen(): void {
    console.log('WebSocket: Conexão estabelecida');
    this.connected = true;
    this.reconnectAttempts = 0;
    
    // Autenticar usuário
    if (this.currentUser) {
      this.socket?.send(JSON.stringify({
        type: 'auth',
        userId: this.currentUser.id,
        token: 'session-auth' // Podemos melhorar isso depois
      }));
    }
    
    // Enviar mensagens em fila
    this.flushMessageQueue();
    
    // Notificar ouvintes da conexão
    this.emit('connected', { timestamp: new Date().toISOString() });
  }

  /**
   * Manipula mensagens recebidas
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket: Mensagem recebida:', data);
      
      // Emitir evento baseado no tipo de mensagem
      if (data.type) {
        this.emit(data.type, data);
      }
      
      // Emitir evento para qualquer mensagem
      this.emit('message', data);
    } catch (error) {
      console.error('WebSocket: Erro ao processar mensagem:', error);
    }
  }

  /**
   * Manipula fechamento da conexão
   */
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket: Conexão fechada. Código: ${event.code}, Razão: ${event.reason}`);
    this.connected = false;
    this.socket = null;
    
    // Notificar ouvintes da desconexão
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      timestamp: new Date().toISOString() 
    });
    
    // Tentar reconectar se não foi um fechamento limpo
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Manipula erros de conexão
   */
  private handleError(event: Event): void {
    console.error('WebSocket: Erro na conexão:', event);
    this.emit('error', { event, timestamp: new Date().toISOString() });
  }

  /**
   * Programa tentativa de reconexão
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocket: Máximo de tentativas de reconexão atingido');
      this.emit('reconnect_failed', { 
        attempts: this.reconnectAttempts,
        timestamp: new Date().toISOString() 
      });
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`WebSocket: Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`WebSocket: Tentando reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.establishConnection();
    }, delay);
  }

  /**
   * Envia mensagens em fila quando a conexão é estabelecida
   */
  private flushMessageQueue(): void {
    if (!this.connected || !this.socket) return;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        this.socket.send(JSON.stringify(message));
        console.log('WebSocket: Mensagem em fila enviada:', message);
      } catch (error) {
        console.error('WebSocket: Erro ao enviar mensagem em fila:', error);
        // Recolocar na fila se for erro de conexão
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  /**
   * Desconecta do servidor WebSocket
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.close(1000, 'Desconexão solicitada pelo cliente');
      this.socket = null;
    }
    
    this.connected = false;
    this.currentUser = null;
    console.log('WebSocket: Desconectado');
  }

  /**
   * Envia dados para o servidor
   * @returns true se enviado com sucesso, false se enfileirado ou falhou
   */
  public send(data: any): boolean {
    if (!this.socket || !this.connected) {
      console.log('WebSocket: Não conectado, enfileirando mensagem');
      this.messageQueue.push(data);
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('WebSocket: Erro ao enviar mensagem:', error);
      this.messageQueue.push(data);
      return false;
    }
  }

  /**
   * Envia mensagem de chat
   */
  public sendChatMessage(content: string, recipientId?: number, groupId?: number): boolean {
    if (!this.currentUser) {
      console.error('WebSocket: Usuário não autenticado');
      return false;
    }
    
    return this.send({
      type: 'chat_message',
      senderId: this.currentUser.id,
      recipientId,
      groupId,
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Registra callback para um evento
   */
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Remove callback para um evento
   */
  public off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emite evento para todos os callbacks registrados
   */
  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error(`WebSocket: Erro ao executar callback para evento ${event}`, error);
          }
        });
      }
    }
  }

  /**
   * Verifica se está conectado
   */
  public isConnected(): boolean {
    return this.connected && this.socket !== null;
  }
}

export const webSocketManager = WebSocketManager.getInstance();
export default webSocketManager;