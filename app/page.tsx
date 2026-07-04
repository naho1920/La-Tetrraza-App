import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-primary-subtle px-6 py-16 text-center dark:bg-background">
      <Image
        src="/icon-512.png"
        alt="La Terraza"
        width={96}
        height={96}
        className="rounded-2xl shadow-lg"
        priority
      />

      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-primary-dark dark:text-primary-light">
          La Terraza
        </h1>
        <p className="max-w-xs text-base text-muted-foreground">
          Reserva tus clases, sigue tu plan alimenticio y colecciona tus
          medallas — todo en un solo lugar.
        </p>
      </div>

      <Button size="lg" className="h-11 px-6 text-base">
        Continuar con Google
      </Button>
    </div>
  );
}
