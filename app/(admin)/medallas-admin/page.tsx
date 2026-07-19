"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Award } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { listActivatedUsers } from "@/features/admin/api";
import {
  listAllSkillsAdmin,
  listAchievementsByEstado,
  listAchievementsConPeso,
  listPinesPendientes,
  marcarPinEntregado,
  obtenerUrlVideo,
  otorgarMedallaManual,
  validarAchievement,
} from "@/features/medallas/api";
import type { Achievement, Skill } from "@/features/medallas/types";
import { useAuth } from "@/features/auth/AuthProvider";
import { getUserDoc } from "@/features/perfil/api";
import type { UserDoc } from "@/features/auth/types";

function OtorgarMedallaCard({ adminUid }: { adminUid: string }) {
  const [alumnos, setAlumnos] = useState<UserDoc[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [uid, setUid] = useState("");
  const [skillId, setSkillId] = useState("");
  const [nivel, setNivel] = useState("");
  const [otorgando, setOtorgando] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) return;
    listActivatedUsers().then((users) => setAlumnos(users.filter((u) => u.rol === "alumno")));
    listAllSkillsAdmin().then(setSkills);
  }

  const skillSeleccionado = skills.find((s) => s.id === skillId) ?? null;

  async function handleOtorgar() {
    if (!uid || !skillId || !nivel) return;
    setOtorgando(true);
    try {
      await otorgarMedallaManual(adminUid, uid, skillId, nivel);
      toast("¡Medalla otorgada! El alumno la verá celebrada en su próxima visita.");
      setNivel("");
      setSkillId("");
      setUid("");
    } catch {
      toast("No se pudo otorgar la medalla. Inténtalo de nuevo.", "error");
    } finally {
      setOtorgando(false);
    }
  }

  return (
    <CollapsibleSection title="Otorgar medalla manualmente" onOpenChange={handleOpenChange}>
      <Select value={uid} onValueChange={(v) => setUid(v ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Alumno" />
        </SelectTrigger>
        <SelectContent>
          {alumnos.map((a) => (
            <SelectItem key={a.uid} value={a.uid}>
              {a.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={skillId}
        onValueChange={(v) => {
          setSkillId(v ?? "");
          setNivel("");
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Medalla" />
        </SelectTrigger>
        <SelectContent>
          {skills.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nombreMedalla}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {skillSeleccionado && (
        <Select value={nivel} onValueChange={(v) => setNivel(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            {skillSeleccionado.nivelesDisponibles.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button disabled={otorgando || !uid || !skillId || !nivel} onClick={handleOtorgar}>
        {otorgando ? "Otorgando…" : "Otorgar medalla"}
      </Button>
    </CollapsibleSection>
  );
}

type Vista = "pendientes" | "pines" | "cerca";

function useSkillsMap() {
  const [skills, setSkills] = useState<Record<string, Skill>>({});
  useEffect(() => {
    listAllSkillsAdmin().then((lista) => {
      setSkills(Object.fromEntries(lista.map((s) => [s.id, s])));
    });
  }, []);
  return skills;
}

function useNombresAlumnos(uids: string[]) {
  const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    const faltantes = uids.filter((uid) => !(uid in nombres));
    if (faltantes.length === 0) return;
    Promise.all(faltantes.map((uid) => getUserDoc(uid))).then((docs) => {
      setNombres((prev) => {
        const next = { ...prev };
        docs.forEach((doc, i) => {
          next[faltantes[i]] = doc?.nombre ?? faltantes[i];
        });
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uids.join(",")]);
  return nombres;
}

function CercaDeMedalla({ skills }: { skills: Record<string, Skill> }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    listAchievementsConPeso()
      .then(setAchievements)
      .finally(() => setCargando(false));
  }, []);

  const nombres = useNombresAlumnos(achievements.map((a) => a.uid));

  if (cargando) return <p className="py-4 text-sm text-muted-foreground">Cargando…</p>;

  type FilaCerca = {
    achievementId: string;
    uid: string;
    nombre: string;
    skill: Skill;
    nivelActual: string;
    nivelSiguiente: string;
    pesoActual: number;
    umbral: number;
    progreso: number;
  };

  const filas: FilaCerca[] = [];

  for (const a of achievements) {
    if (!a.pesoLevantadoKg || !a.pesoAlReclamo) continue;
    const skill = skills[a.skillId];
    if (!skill?.relativoABW) continue;

    const niveles = skill.nivelesDisponibles;
    const idxActual = niveles.indexOf(a.nivel);
    if (idxActual < 0 || idxActual === niveles.length - 1) continue;

    const nivelSiguiente = niveles[idxActual + 1];
    const multStr = skill.hitos[nivelSiguiente];
    const mult = parseFloat(multStr ?? "0");
    if (!mult || isNaN(mult)) continue;

    const umbral = Math.round(a.pesoAlReclamo * mult * 10) / 10;
    const progreso = a.pesoLevantadoKg / umbral;
    if (progreso < 0.7 || progreso >= 1) continue;

    filas.push({
      achievementId: a.id,
      uid: a.uid,
      nombre: nombres[a.uid] ?? a.uid,
      skill,
      nivelActual: a.nivel,
      nivelSiguiente,
      pesoActual: a.pesoLevantadoKg,
      umbral,
      progreso,
    });
  }

  filas.sort((a, b) => b.progreso - a.progreso);

  if (filas.length === 0) {
    return <EmptyState icon={Award} message="Nadie está cerca de una medalla en este momento." />;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {filas.map((f) => {
        const porcentaje = Math.round(f.progreso * 100);
        return (
          <li key={f.achievementId} className="flex flex-col gap-1.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{f.nombre}</p>
              <Badge variant="outline">{porcentaje}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {f.skill.nombreMedalla} — {f.nivelSiguiente} · levantó{" "}
              <strong>{f.pesoActual} kg</strong> de {f.umbral} kg necesarios
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function tituloMedalla(skill: Skill | undefined, nivel: string) {
  if (!skill) return "Medalla";
  return nivel === "base" ? skill.nombreMedalla : `${skill.nombreMedalla} — ${nivel}`;
}

function UmbralFuerza({ achievement, skill }: { achievement: Achievement; skill: Skill | undefined }) {
  if (!skill?.relativoABW || achievement.pesoLevantadoKg == null) return null;
  const multiplicadorStr = skill.hitos[achievement.nivel];
  const multiplicador = parseFloat(multiplicadorStr ?? "0");
  if (!multiplicador || !achievement.pesoAlReclamo) return (
    <span className="text-xs text-muted-foreground">
      Levantó {achievement.pesoLevantadoKg} kg (sin peso corporal registrado)
    </span>
  );
  const umbral = Math.round(achievement.pesoAlReclamo * multiplicador * 10) / 10;
  const cumple = achievement.pesoLevantadoKg >= umbral;
  return (
    <span className="text-xs">
      {achievement.pesoLevantadoKg} kg · umbral {achievement.nivel}{" "}
      {umbral} kg{" "}
      <span className={cumple ? "text-success" : "text-destructive"}>
        {cumple ? "✅" : "❌"}
      </span>
      {" "}(PC: {achievement.pesoAlReclamo} kg)
    </span>
  );
}

export default function AdminMedallasPage() {
  const { userDoc } = useAuth();
  const [vista, setVista] = useState<Vista>("pendientes");
  const [pendientes, setPendientes] = useState<Achievement[]>([]);
  const [pines, setPines] = useState<Achievement[]>([]);
  const [cargando, setCargando] = useState(true);
  const skills = useSkillsMap();

  const lista = vista === "pendientes" ? pendientes : vista === "pines" ? pines : [];
  const nombres = useNombresAlumnos(lista.map((a) => a.uid));
  const [rechazando, setRechazando] = useState<Achievement | null>(null);

  function cargar() {
    setCargando(true);
    Promise.all([
      listAchievementsByEstado("pendiente").then(setPendientes),
      listPinesPendientes().then(setPines),
    ]).finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  async function handleValidar(id: string, aprobado: boolean) {
    if (!userDoc) return;
    try {
      await validarAchievement(id, userDoc.uid, aprobado);
      toast(aprobado ? "Medalla aprobada." : "Logro rechazado.");
      cargar();
    } catch {
      toast("No se pudo procesar el logro. Inténtalo de nuevo.", "error");
    }
  }

  async function handleVerVideo(videoPath: string) {
    const url = await obtenerUrlVideo(videoPath);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handlePin(id: string) {
    try {
      await marcarPinEntregado(id);
      toast("Pin marcado como entregado.");
      cargar();
    } catch {
      toast("No se pudo marcar el pin. Inténtalo de nuevo.", "error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      <header className="flex items-center gap-3 py-2">
        <h1 className="font-heading text-xl font-semibold">Medallas</h1>
      </header>

      {userDoc && <OtorgarMedallaCard adminUid={userDoc.uid} />}

      <SegmentedTabs
        value={vista}
        onChange={setVista}
        options={[
          { value: "pendientes", label: `Por validar (${pendientes.length})` },
          { value: "pines", label: `Pines (${pines.length})` },
          { value: "cerca", label: "Cerca 🎯" },
        ]}
      />

      <div className="flex gap-2">
        <Button render={<Link href="/medallas-admin/catalogo" />} size="sm" variant="outline" className="flex-1">
          Catálogo
        </Button>
        <Button render={<Link href="/diario-admin" />} size="sm" variant="outline" className="flex-1">
          Diario
        </Button>
      </div>

      <Card>
        <CardContent>
          {vista === "cerca" ? (
            <CercaDeMedalla skills={skills} />
          ) : cargando ? (
            <div className="flex flex-col gap-2 py-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <EmptyState
              icon={Award}
              message={vista === "pendientes" ? "No hay logros por validar." : "No hay pines pendientes de entregar."}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {lista.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium">{nombres[a.uid] ?? "…"}</p>
                      <p className="text-sm text-muted-foreground">
                        {tituloMedalla(skills[a.skillId], a.nivel)}
                        {a.tiempoLogrado && ` — ${a.tiempoLogrado}`}
                      </p>
                      <UmbralFuerza achievement={a} skill={skills[a.skillId]} />
                    </div>
                    <Badge>{a.fechaLogro}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {a.videoPath && (
                      <Button size="sm" variant="outline" onClick={() => handleVerVideo(a.videoPath!)}>
                        Ver video
                      </Button>
                    )}
                    {vista === "pendientes" ? (
                      <>
                        <Button size="sm" onClick={() => handleValidar(a.id, true)}>
                          Aprobar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRechazando(a)}>
                          Rechazar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => handlePin(a.id)}>
                        Marcar pin entregado
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {rechazando && (
        <ConfirmDialog
          title="¿Rechazar este logro?"
          description={
            <>
              Se rechazará {tituloMedalla(skills[rechazando.skillId], rechazando.nivel)} de{" "}
              <strong>{nombres[rechazando.uid] ?? "este alumno"}</strong>. El alumno podrá volver a
              intentarlo.
            </>
          }
          confirmLabel="Sí, rechazar"
          onConfirm={() => handleValidar(rechazando.id, false).then(() => setRechazando(null))}
          onCancel={() => setRechazando(null)}
        />
      )}
    </div>
  );
}
