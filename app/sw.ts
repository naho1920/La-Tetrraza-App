/// <reference lib="webworker" />

import { ExpirationPlugin, NetworkFirst, NetworkOnly } from "serwist";
import { PAGES_CACHE_NAME, defaultCache } from "@serwist/next/worker";
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

    // El `defaultCache` de @serwist/next cachea las navegaciones (los payloads
    // RSC que pide el router de Next.js al cambiar de pestaña, y las páginas
    // HTML) con NetworkFirst pero SIN `networkTimeoutSeconds` — a diferencia
    // de sus propias reglas para `/api/*`, que sí lo tienen (10s). Sin ese
    // límite, si la red se pone lenta un instante (cambiar de wifi a datos,
    // que el celular "despierte" la app), esa promesa de red puede quedarse
    // sin resolver NUNCA: NetworkFirst nunca cae a la caché porque está
    // esperando indefinidamente a que la red responda o falle. Resultado: la
    // pantalla se queda cargando para siempre al navegar entre pestañas, y
    // solo un reload (que arranca una petición nueva) lo arregla. Estas
    // entradas repiten los mismos matchers pero agregan el timeout, y van
    // ANTES de `...defaultCache` porque Serwist usa la primera regla que
    // matchea — así nunca llegan a las suyas para estos mismos casos.
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        request.headers.get("RSC") === "1" &&
        request.headers.get("Next-Router-Prefetch") === "1" &&
        sameOrigin &&
        !pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.rscPrefetch,
        networkTimeoutSeconds: 8,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        request.headers.get("RSC") === "1" && sameOrigin && !pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.rsc,
        networkTimeoutSeconds: 8,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        !!request.headers.get("Content-Type")?.includes("text/html") &&
        sameOrigin &&
        !pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.html,
        networkTimeoutSeconds: 8,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ url: { pathname }, sameOrigin }) => sameOrigin && !pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 8,
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      }),
    },

    ...defaultCache,
  ],
});

serwist.addEventListeners();
