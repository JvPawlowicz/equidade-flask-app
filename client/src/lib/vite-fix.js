/**
 * Corrige o problema do WebSocket do Vite HMR
 * 
 * Este arquivo deve ser incluído no HTML para interceptar
 * e modificar as tentativas do Vite de abrir conexões WebSocket
 * que causam erros de console
 */

// Interceptador de WebSocket do Vite
(function() {
  const originalWebSocket = window.WebSocket;

  window.WebSocket = function(url, protocols) {
    if (typeof url === 'string' && url.includes('vite')) {
      console.log('Vite WebSocket interceptado:', url);
      return {
        addEventListener: function() {},
        removeEventListener: function() {},
        send: function() {},
        close: function() {},
        url: url,
        readyState: 3,
        protocol: '',
        extensions: '',
        bufferedAmount: 0,
        binaryType: 'blob',
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null
      };
    }
    return new originalWebSocket(url, protocols);
  };

  // Copie todas as propriedades do WebSocket original
  for (const prop in originalWebSocket) {
    window.WebSocket[prop] = originalWebSocket[prop];
  }

  // Copie o protótipo
  window.WebSocket.prototype = originalWebSocket.prototype;

  console.log('WebSocket interceptor instalado');
})();