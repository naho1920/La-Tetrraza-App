/// <reference lib="webworker" />

import { NetworkOnly } from "serwist";
import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // TASK-056: los documentos de Supabase Storage (PDFs de nutrición, videos
    // de logros, comprobantes de pago) NO deben cachearse — las signed URLs
    // expiran y el contenido es sensible; en equipos compartidos quedaría
    // accesible en Cache Storage después de cerrar sesión.
    {
      matcher: ({ url }: { url: URL }) =>
        url.hostname.endsWith(".supabase.co") &&
        url.pathname.includes("/storage/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
