/**
 * Corrige o problema do WebSocket do Vite HMR
 * 
 * Este arquivo deve ser incluído no HTML para interceptar
 * e modificar as tentativas do Vite de abrir conexões WebSocket
 * que causam erros de console
 */

// Execute este código imediatamente
(function() {
  // Armazene a implementação original do WebSocket
  const OrigWebSocket = window.WebSocket;
  
  // Substitua o construtor WebSocket com nossa versão personalizada
  window.WebSocket = function CustomWebSocket(url, protocols) {
    // Verifique se a URL está relacionada ao HMR do Vite
    if (typeof url === 'string' && (
      url.includes('localhost:undefined') || 
      url.endsWith('vite-hmr') || 
      url.includes('?token=')
    )) {
      console.log('Vite WebSocket interceptado: ', url);
      
      // Crie um objeto falso que se comporta como WebSocket, mas não faz nada
      const mockWs = {
        addEventListener: function() {},
        removeEventListener: function() {},
        send: function() {},
        close: function() {},
        url: url,
        readyState: 3, // CLOSED
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob',
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null
      };
      
      // Simule um erro de conexão para que o Vite saiba que a conexão falhou
      setTimeout(() => {
        if (mockWs.onerror) mockWs.onerror(new Event('error'));
        if (mockWs.onclose) mockWs.onclose(new CloseEvent('close'));
      }, 0);
      
      return mockWs;
    }
    
    // Para qualquer outra URL, use o WebSocket normal
    return new OrigWebSocket(url, protocols);
  };
  
  // Copie todas as propriedades do WebSocket original
  for (const prop in OrigWebSocket) {
    window.WebSocket[prop] = OrigWebSocket[prop];
  }
  
  // Copie o protótipo
  window.WebSocket.prototype = OrigWebSocket.prototype;
  
  console.log('WebSocket interceptor instalado');
})();