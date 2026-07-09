import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
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
        ],
      },
    ];
  },
};

export default withAnalyzer(withSerwist(nextConfig));
