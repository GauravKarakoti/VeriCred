export const WebSocket = typeof window !== 'undefined' ? window.WebSocket : globalThis.WebSocket;
export default WebSocket;