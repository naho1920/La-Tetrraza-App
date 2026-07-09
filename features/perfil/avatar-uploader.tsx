"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { subirFotoPerfil } from "./api";

/**
 * Avatar con botón de cámara superpuesto: al tocarlo se elige una imagen
 * de la galería/cámara del teléfono y se reemplaza la foto de perfil.
 */
export function AvatarUploader({
  uid,
  nombre,
  foto,
  onUploaded,
}: {
  uid: string;
  nombre: string;
  foto: string | null;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = preview ?? foto;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setError(null);
    setSubiendo(true);
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    try {
      await subirFotoPerfil(uid, archivo);
      onUploaded?.();
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="size-20 overflow-hidden rounded-full ring-2 ring-white/20">
          {src ? (
            <Image
              src={src}
              alt={nombre}
              width={80}
              height={80}
              className={`size-full object-cover ${subiendo ? "opacity-60" : ""}`}
              unoptimized={Boolean(preview)}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-white/10 font-heading text-2xl font-semibold">
              {nombre.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          aria-label="Cambiar foto de perfil"
          className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity disabled:opacity-60"
        >
          <Camera className="size-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      {error && <p className="max-w-52 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
