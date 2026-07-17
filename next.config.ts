import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // El service worker solo debe correr en producción: en dev queda una versión
  // vieja controlando la pestaña entre reinicios del server y sirve JS/CSS
  // desincronizados con la caché de `.next` (rompe estilos y handlers de UI).
  disable: process.env.NODE_ENV === "development",
});

// Solo se activa con `ANALYZE=true npm run build` — no afecta builds normales.
const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // Los SVG de medallas son assets locales de /public, nunca contenido
    // subido por usuarios — seguro permitirlos con la CSP recomendada.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // La app nunca se muestra dentro de un iframe (anti-clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // El navegador no debe adivinar tipos MIME distintos al declarado.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No filtrar la URL completa a sitios externos.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permisos del navegador que la app no necesita.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // TASK-055: HSTS — forzar HTTPS durante 2 años, incluir subdominios.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // TASK-055: Content Security Policy global.
          // 'unsafe-inline' en script-src es necesario para Next.js inline scripts;
          // 'unsafe-eval' solo en dev (Serwist HMR). En producción Next.js inyecta
          // nonces automáticamente si se configura, pero se deja permisivo para
          // no romper la app mientras se ajusta gradualmente.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co",
              "connect-src 'self' https://*.googleapis.com https://*.firebase.com https://*.firebaseio.com wss://*.firebaseio.com https://*.supabase.co",
              "font-src 'self'",
              "frame-src https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withAnalyzer(withSerwist(nextConfig));
