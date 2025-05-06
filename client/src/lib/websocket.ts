import { User } from "@shared/schema";

// Singleton para gerenciar a conexão WebSocket
class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(user: User): void {
    if (this.socket) {
      console.log('WebSocket: Já existe uma conexão ativa');
      return;
    }

    try {
      // Usar o hostname atual garantindo compatibilidade com o ambiente Replit
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHostname = window.location.host;
      
      // Garantir que temos um hostname válido
      if (!wsHostname) {
        console.error('WebSocket: Hostname inválido', wsHostname);
        return;
      }
      
      const wsUrl = `${wsProtocol}//${wsHostname}/ws?userId=${user.id}`;
      
      console.log('WebSocket: Tentando conectar em', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket: Conexão estabelecida');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', { connected: true });
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket: Conexão fechada');
        this.connected = false;
        this.socket = null;
        this.emit('disconnected', { connected: false });
        this.scheduleReconnect(user);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket: Erro na conexão', error);
        this.emit('error', error);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch (error) {
          console.error('WebSocket: Erro ao processar mensagem', error);
        }
      };
    } catch (error) {
      console.error('WebSocket: Erro ao criar conexão', error);
    }
  }

  private scheduleReconnect(user: User): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`WebSocket: Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect(user);
      }, delay);
    } else {
      console.log('WebSocket: Número máximo de tentativas de reconexão alcançado');
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      console.log('WebSocket: Desconectado manualmente');
    }
  }

  public send(data: any): boolean {
    if (this.socket && this.connected) {
      try {
        this.socket.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('WebSocket: Erro ao enviar mensagem', error);
        return false;
      }
    }
    return false;
  }

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

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

  public isConnected(): boolean {
    return this.connected;
  }
}

export const webSocketManager = WebSocketManager.getInstance();
export default webSocketManager;