// Interceptador de WebSocket do Vite
console.log("WebSocket interceptor instalado");

const originalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
  if (url.includes("vite")) {
    console.log("Vite WebSocket interceptado: ", url);
    return new originalWebSocket(url, protocols);
  }
  return new originalWebSocket(url, protocols);
};