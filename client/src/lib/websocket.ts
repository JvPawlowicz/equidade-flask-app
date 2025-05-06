import { User } from "@shared/schema";

// WebSocket manager temporariamente desativado
// Stub implementado para manter a interface sem erros
class WebSocketManager {
  private static instance: WebSocketManager;
  private connected = false;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    console.log("WebSocket: Serviço temporariamente desativado");
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(user: User): void {
    console.log('WebSocket: Conexão temporariamente desabilitada');
    // Apenas para registrar no log, não faz nada
  }

  public disconnect(): void {
    console.log('WebSocket: Desconexão temporariamente desabilitada');
    // Apenas para registrar no log, não faz nada
  }

  public send(data: any): boolean {
    console.log('WebSocket: Envio de mensagem temporariamente desabilitado', data);
    return false; // Sempre retorna falso, indicando que a mensagem não foi enviada
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
    return false; // Sempre retorna falso, indicando que não está conectado
  }
}

export const webSocketManager = WebSocketManager.getInstance();
export default webSocketManager;