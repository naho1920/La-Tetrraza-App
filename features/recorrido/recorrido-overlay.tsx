"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PASOS } from "./pasos";

/** Aire alrededor del elemento resaltado, para que el spotlight no lo corte. */
const PADDING = 8;

/**
 * Cuánto esperamos a que aparezca el ancla de un paso antes de saltarlo. La
 * pantalla puede estar cargando datos, o el elemento puede simplemente no
 * existir para este alumno (una tarjeta condicional): en ningún caso el
 * recorrido debe quedarse colgado esperando.
 */
const TIMEOUT_ANCLA_MS = 3000;

/** Cada cuánto se reintenta encontrar el ancla mientras la pantalla carga. */
const INTERVALO_BUSQUEDA_MS = 100;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Fase = "oferta" | "pasos" | "final";

export function RecorridoOverlay({
  conOferta,
  onCerrar,
}: {
  /** Primera vez: se pregunta antes de arrancar. "Ver de nuevo": arranca ya. */
  conOferta: boolean;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [fase, setFase] = useState<Fase>(conOferta ? "oferta" : "pasos");
  const [indice, setIndice] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const paso = fase === "pasos" ? PASOS[indice] : null;

  // El elemento resaltado se guarda en un ref para poder re-medirlo desde los
  // listeners de resize sin volver a buscarlo en el DOM.
  const elRef = useRef<HTMLElement | null>(null);

  const medir = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    });
  }, []);

  const avanzar = useCallback(() => {
    if (indice + 1 >= PASOS.length) setFase("final");
    else setIndice(indice + 1);
  }, [indice]);

  // Navega si hace falta, espera a que el ancla exista, la encuadra y la mide.
  useEffect(() => {
    if (!paso) {
      elRef.current = null;
      return;
    }
    if (pathname !== paso.ruta) {
      router.push(paso.ruta);
      return; // el efecto vuelve a correr solo cuando cambia el pathname
    }

    const { ancla } = paso;
    let observer: ResizeObserver | undefined;

    // Se busca con temporizadores y no con requestAnimationFrame a propósito:
    // rAF no corre en una pestaña en segundo plano, y ahí el recorrido se
    // quedaría en pantalla oscura sin que el timeout llegara nunca a saltar el
    // paso (el timeout vivía dentro del mismo bucle).
    const intervalo = setInterval(buscar, INTERVALO_BUSQUEDA_MS);
    const limite = setTimeout(() => {
      clearInterval(intervalo);
      avanzar();
    }, TIMEOUT_ANCLA_MS);

    function buscar() {
      const el = document.querySelector<HTMLElement>(`[data-tour="${ancla}"]`);
      if (!el) return;
      clearInterval(intervalo);
      clearTimeout(limite);
      elRef.current = el;
      // Sin animación: hay que medir inmediatamente después y un scroll suave
      // daría un rectángulo desfasado.
      el.scrollIntoView({ block: "center", behavior: "instant" });
      medir();
      // Varios tiles cambian de alto cuando terminan de cargar sus datos. Se
      // observa también el body porque si el contenido que está *arriba* del
      // elemento crece (la lista de próximas clases, un banner de error), el
      // elemento se mueve sin cambiar de tamaño: observarlo a él no alcanza.
      observer = new ResizeObserver(medir);
      observer.observe(el);
      observer.observe(document.body);
    }

    buscar(); // el caso normal: el elemento ya está ahí, sin esperar un tick

    return () => {
      clearInterval(intervalo);
      clearTimeout(limite);
      observer?.disconnect();
    };
  }, [paso, pathname, router, medir, avanzar]);

  useEffect(() => {
    window.addEventListener("resize", medir);
    window.addEventListener("orientationchange", medir);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("orientationchange", medir);
    };
  }, [medir]);

  // El cartelito se ancla al borde opuesto al agujero, así nunca lo tapa ni se
  // sale de la pantalla en móvil (el paso de la TabBar es el caso extremo).
  const enMitadInferior =
    rect !== null && rect.top + rect.height / 2 > window.innerHeight / 2;

  return (
    // El contenedor captura todos los toques: mientras el recorrido corre solo
    // se avanza con los botones del cartelito.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recorrido de la app"
      className="fixed inset-0 z-50"
    >
      {paso && rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-3xl ring-2 ring-primary-light transition-all duration-300 motion-reduce:transition-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            // Oscurece toda la pantalla menos este rectángulo, sin SVG ni máscaras.
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-black/65" />
      )}

      <div
        className={cn(
          "absolute inset-x-4 mx-auto flex max-w-sm flex-col gap-3 rounded-3xl bg-card p-5 shadow-xl ring-1 ring-foreground/10",
          enMitadInferior ? "top-6" : "bottom-24"
        )}
      >
        {fase === "oferta" && (
          <>
            <h2 className="font-heading text-lg font-semibold">¿Te muestro la app en 1 minuto? 💜</h2>
            <p className="text-sm text-muted-foreground">
              Un recorrido cortito por lo que podés hacer acá. Podés cortarlo cuando quieras.
            </p>
            <div className="mt-1 flex gap-2">
              <Button className="flex-1" onClick={() => setFase("pasos")}>
                Sí, dale
              </Button>
              <Button variant="ghost" className="flex-1" onClick={onCerrar}>
                Ahora no
              </Button>
            </div>
          </>
        )}

        {paso && (
          <>
            <p className="text-xs font-medium text-muted-foreground">
              Paso {indice + 1} de {PASOS.length}
            </p>
            <h2 className="font-heading text-lg font-semibold">{paso.titulo}</h2>
            <p className="text-sm text-muted-foreground">{paso.detalle}</p>
            <div className="mt-1 flex items-center gap-2">
              <Button className="flex-1" onClick={avanzar}>
                {indice + 1 === PASOS.length ? "Terminar" : "Siguiente"}
              </Button>
              <Button variant="ghost" onClick={onCerrar}>
                Saltar
              </Button>
            </div>
          </>
        )}

        {fase === "final" && (
          <>
            <h2 className="font-heading text-lg font-semibold">¡Listo! 💜</h2>
            <p className="text-sm text-muted-foreground">
              Ya conocés lo esencial. Si querés volver a verlo, está al final de tu Perfil.
            </p>
            <Button className="mt-1" onClick={onCerrar}>
              Empezar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
