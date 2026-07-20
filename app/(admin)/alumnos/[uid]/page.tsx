"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeleton";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { db } from "@/lib/firebase/client";
import type { UserDoc } from "@/features/auth/types";
import { listAchievementsForUser, listSkills } from "@/features/medallas/api";
import { PILARES } from "@/features/medallas/catalogo";
import type { Achievement, Skill } from "@/features/medallas/types";
import { getMembershipForUser, getPlan } from "@/features/membresias/api";
import { ESTADO_BADGE_VARIANT, ESTADO_LABEL, calcularEstadoMembresia } from "@/features/membresias/estado";
import type { Membership, MembershipPlan } from "@/features/membresias/types";
import { getFormForUser } from "@/features/nutricion/api";
import { NutritionStatusStepper } from "@/features/nutricion/status-stepper";
import type { NutritionForm } from "@/features/nutricion/types";
import { getUserDoc, getWeightLogs, type WeightLog } from "@/features/perfil/api";
import type { Booking } from "@/features/reservas/types";

// Recharts (~255 KB) no debe bloquear el render inicial de esta ruta.
const WeightChart = dynamic(
  () => import("@/features/perfil/weight-chart").then((m) => m.WeightChart),
  { ssr: false }
);

async function getBookingsForUser(uid: string): Promise<Booking[]> {
  const snap = await getDocs(query(collection(db, "bookings"), where("uid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));
}

type Tab = "progreso" | "salud" | "cuenta";

export default function FichaAlumnoPage() {
  const params = useParams<{ uid: string }>();
  const uid = params.uid;

  const [tab, setTab] = useState<Tab>("progreso");
  const [alumno, setAlumno] = useState<UserDoc | null>(null);
  const [pesoLogs, setPesoLogs] = useState<WeightLog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [form, setForm] = useState<NutritionForm | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plan, setPlan] = useState<MembershipPlan | null>(null);

  useEffect(() => {
    if (!uid) return;
    getUserDoc(uid).then(setAlumno);
    getWeightLogs(uid).then(setPesoLogs);
    getBookingsForUser(uid).then(setBookings);
    getFormForUser(uid).then(setForm);
    listSkills().then(setSkills);
    listAchievementsForUser(uid).then(setAchievements);
    getMembershipForUser(uid).then(async (m) => {
      setMembership(m);
      if (m) setPlan(await getPlan(m.planId));
    });
  }, [uid]);

  if (!alumno) return <PageSkeleton />;

  const asistencias = bookings.filter((b) => b.asistio === true).length;
  const faltas = bookings.filter((b) => b.asistio === false).length;
  const totalMarcado = asistencias + faltas;
  const porcentajeAsistencia = totalMarcado > 0 ? Math.round((asistencias / totalMarcado) * 100) : null;

  const historialReciente = bookings
    .filter((b) => b.fecha)
    .sort((a, b) => (b.fecha! + (b.hora ?? "")).localeCompare(a.fecha! + (a.hora ?? "")))
    .slice(0, 5);

  const estadoMembresia = membership ? calcularEstadoMembresia(membership.fechaFin) : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center gap-3 py-2">
        <Link
          href="/alumnos"
          aria-label="Volver"
          className="flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-foreground/10 transition-colors active:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold leading-tight">{alumno.nombre}</h1>
          <p className="truncate text-sm text-muted-foreground">{alumno.email}</p>
        </div>
      </header>

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "progreso", label: "Progreso" },
          { value: "salud", label: "Salud" },
          { value: "cuenta", label: "Cuenta" },
        ]}
      />

      {tab === "progreso" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Asistencia</CardTitle>
            </CardHeader>
            <CardContent>
              {porcentajeAsistencia === null ? (
                <p className="text-sm text-muted-foreground">Todavía no hay asistencias marcadas.</p>
              ) : (
                <p className="text-2xl font-semibold">
                  {porcentajeAsistencia}%{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({asistencias} asistió / {faltas} faltó)
                  </span>
                </p>
              )}
              {historialReciente.length > 0 && (
                <ul className="mt-3 flex flex-col divide-y divide-border text-sm">
                  {historialReciente.map((b) => (
                    <li key={b.id} className="flex items-center justify-between py-1.5">
                      <span>
                        {b.fecha} · {b.hora}
                      </span>
                      <Badge variant={b.asistio === true ? "success" : b.asistio === false ? "destructive" : "outline"}>
                        {b.asistio === true ? "Asistió" : b.asistio === false ? "Faltó" : "Sin marcar"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vitrina de medallas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {PILARES.map(({ pilar, label, color }) => {
                const deEstePilar = skills.filter((s) => s.pilar === pilar);
                const total = deEstePilar.reduce((acc, s) => acc + s.nivelesDisponibles.length, 0);
                const logrados = deEstePilar.reduce(
                  (acc, s) =>
                    acc +
                    s.nivelesDisponibles.filter((nivel) =>
                      achievements.some((a) => a.skillId === s.id && a.nivel === nivel && a.estado === "validado")
                    ).length,
                  0
                );
                return (
                  <div key={pilar} className="flex items-center justify-between text-sm">
                    <span style={{ color }}>{label}</span>
                    <span className="text-muted-foreground">
                      {logrados}/{total}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "salud" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Estatura</span>
              <span>{alumno.estaturaCm ? `${alumno.estaturaCm} cm` : "—"}</span>
              <span className="text-muted-foreground">Meta</span>
              <span>{alumno.meta ?? "—"}</span>
              <span className="text-muted-foreground">Lesiones</span>
              <span>{alumno.lesiones?.join(", ") || "—"}</span>
              <span className="text-muted-foreground">Alergias</span>
              <span>{alumno.alergias?.join(", ") || "—"}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolución de peso</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightChart logs={pesoLogs} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nutrición</CardTitle>
            </CardHeader>
            <CardContent>
              {!form ? (
                <p className="text-sm text-muted-foreground">Todavía no llenó el formulario.</p>
              ) : (
                <NutritionStatusStepper estado={form.estado} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "cuenta" && (
        <Card>
          <CardHeader>
            <CardTitle>Membresía</CardTitle>
          </CardHeader>
          <CardContent>
            {!membership ? (
              <p className="text-sm text-muted-foreground">Sin membresía asignada.</p>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span>
                  {plan?.nombre ?? "Plan"} · vence {membership.fechaFin}
                </span>
                {estadoMembresia && (
                  <Badge variant={ESTADO_BADGE_VARIANT[estadoMembresia]}>{ESTADO_LABEL[estadoMembresia]}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
