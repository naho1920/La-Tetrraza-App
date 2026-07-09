/**
 * Módulo sin "use client": el layout (server component) necesita importar
 * este string para inyectarlo en <head>.
 */

export const THEME_STORAGE_KEY = "terraza-theme";

/** Aplica el tema guardado (o el del sistema) antes de pintar — evita el flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;
