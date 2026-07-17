import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Rutas exclusivas de admin — cualquier sub-ruta queda protegida.
const ADMIN_PATHS = [
  "/alumnos",
  "/clases",
  "/estadisticas",
  "/medallas-admin",
  "/membresias",
  "/notificaciones-admin",
  "/nutricion-admin",
];

// Rutas de alumno que requieren login (sin ser admin-only).
const ALUMNO_PATHS = [
  "/horarios",
  "/medallas",
  "/membresia",
  "/notificaciones",
  "/nutricion",
  "/onboarding",
  "/perfil",
];

const PROTECTED = [...ADMIN_PATHS, ...ALUMNO_PATHS];

/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * La firma la verifica el SDK de Firebase Admin en las API routes y las
 * Firestore Security Rules en el cliente — esto es solo defensa en profundidad.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!isProtected) return NextResponse.next();

  // El AuthProvider escribe el ID token en esta cookie tras cada cambio de
  // estado de autenticación (ver features/auth/AuthProvider.tsx).
  const sessionToken = request.cookies.get("__session")?.value;
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Para rutas admin, verificar el claim `admin` en el payload del JWT.
  const isAdminRoute = ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isAdminRoute) {
    const payload = decodeJwtPayload(sessionToken);
    if (!payload || payload["admin"] !== true) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Excluir assets estáticos, API routes y archivos del SW para no interferir
  // con la precarga de Serwist ni con las rutas de autenticación propias.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|icons|medals|login|sin-acceso|sw\\.js|workbox-.*).*)",
  ],
};
