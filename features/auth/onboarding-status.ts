import type { UserDoc } from "./types";

/**
 * Los docs creados antes de esta feature no tienen `bienvenidaVista`; si ya
 * habían terminado el onboarding viejo, se consideran "ya vistas" para no
 * forzarles el welcome retroactivamente.
 */
function haVistoLaBienvenida(userDoc: Pick<UserDoc, "bienvenidaVista" | "onboardingCompletado">): boolean {
  return userDoc.bienvenidaVista ?? userDoc.onboardingCompletado;
}

export function necesitaBienvenida(userDoc: UserDoc | null): boolean {
  return userDoc?.rol === "alumno" && !haVistoLaBienvenida(userDoc);
}

export function necesitaOnboarding(userDoc: UserDoc | null): boolean {
  return userDoc?.rol === "alumno" && haVistoLaBienvenida(userDoc) && !userDoc.onboardingCompletado;
}

/**
 * El recorrido guiado se ofrece una vez, ya terminado el onboarding. Sin
 * fallback a `onboardingCompletado` (a diferencia de la bienvenida): los
 * alumnos que ya existían también lo ven, y pueden rechazarlo.
 */
export function necesitaRecorrido(userDoc: UserDoc | null): boolean {
  return (
    userDoc?.rol === "alumno" && userDoc.onboardingCompletado && userDoc.recorridoVisto !== true
  );
}
