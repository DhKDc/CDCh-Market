// Service worker mínimo: hace la app instalable. No cachea nada a propósito,
// para que las publicaciones y fotos siempre estén al día (todo va a la red).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
