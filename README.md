# La Terraza

PWA para el box de CrossFit La Terraza. Ver `prd-la-terraza.md` y `roadmap-la-terraza.md` para el detalle de producto y el plan de construcción por fases.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Copia `.env.example` a `.env.local` y complétalo con las claves del proyecto de Firebase antes de usar autenticación, Firestore o Storage.

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui · Firebase (Auth, Firestore, Storage) · Serwist (PWA / service worker) · Vercel (hosting).
