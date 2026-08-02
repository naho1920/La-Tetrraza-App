import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Nombres de archivo con espacios, acentos o paréntesis (muy comunes en fotos
 * guardadas desde WhatsApp o la cámara) rompen la codificación del
 * multipart/form-data y el navegador lanza "The string did not match the
 * expected pattern." Se renombra a un nombre ASCII-seguro antes de adjuntarlo
 * a un FormData. Safari en iOS a veces entrega un `File.name` vacío al elegir
 * fotos desde la Biblioteca de Fotos (en vez de la Cámara) — un nombre vacío
 * en el FormData dispara el mismo error, así que también hay que cubrir ese caso.
 */
export function nombreArchivoSeguro(nombre: string): string {
  const sinAcentos = (nombre || "").normalize("NFD").replace(/\p{Mn}/gu, "");
  const limpio = sinAcentos.replace(/[^a-zA-Z0-9.-]/g, "_");
  return limpio || "archivo";
}
