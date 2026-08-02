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
 * a un FormData.
 */
export function nombreArchivoSeguro(nombre: string): string {
  const sinAcentos = nombre.normalize("NFD").replace(/\p{Mn}/gu, "");
  return sinAcentos.replace(/[^a-zA-Z0-9.-]/g, "_");
}
