"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Award } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    listActivatedUsers().then((users) => setAlumnos(users.filter((u) => u.rol === "alumno")));
    listAllSkillsAdmin().then(setSkills);
  }, []);

  const skillSeleccionado = skills.find((s) => s.id === skillId) ?? null;

  async function handleOtorgar() {
    if (!uid || !skillId || !nivel) return;
    setOtorgando(true);
    try {
      await otorgarMedallaManual(adminUid, uid, skillId, nivel);
      toast("¡Medalla otorgada! El alumno la verá celebrada en su próxima visita.");
      setNivel("");
    } catch {
      toast("No se pudo otorgar la medalla. Inténtalo de nuevo.", "error");
    } finally {
      setOtorgando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Otorgar medalla manualmente</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
      </CardContent>
    </Card>
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

/**
 * TASK-065: muestra qué alumnos están cerca de alcanzar el siguiente nivel
 * de una medalla de Fuerza, basándose en el `pesoLevantadoKg` que declararon
 * al reclamar sus achievements más recientes.
 */
function CercaDeMedalla({ skills }: { skills: Record<string, Skill> }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    listAchievementsConPeso()
      .then(setAchievements)
      .finally(() => setCargando(false));
  }, []);

  const nombres = useNombresAlumnos(achievements.map((a) => a.uid));

  if (cargando) return <p className="py-4 text-sm text-muted-foreground">Cargando…</p>;

  // Por cada achievement con pesoLevantadoKg, calcular cuánto falta para el
  // siguiente nivel. Solo se muestran los que están entre 70 % y 99 %.
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
    if (idxActual < 0 || idxActual === niveles.length - 1) continue; // último nivel → ya está en el top

    const nivelSiguiente = niveles[idxActual + 1];
    const multStr = skill.hitos[nivelSiguiente];
    const mult = parseFloat(multStr ?? "0");
    if (!mult || isNaN(mult)) continue;

    const umbral = Math.round(a.pesoAlReclamo * mult * 10) / 10;
    const progreso = a.pesoLevantadoKg / umbral;
    if (progreso < 0.7 || progreso >= 1) continue; // fuera del rango de interés

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
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Award className="size-5 text-muted-foreground" />
        </span>
        <p className="text-sm text-muted-foreground">
          Nadie está cerca de una medalla en este momento.
        </p>
      </div>
    );
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

/**
 * TASK-063: muestra el umbral calculado para medallas de Fuerza con relativoABW.
 * Formato: "declara 120 kg · umbral plata 97.5 kg ✅" o "❌" si no llega.
 */
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
  const skills = useSkillsMap();

  const lista = vista === "pendientes" ? pendientes : vista === "pines" ? pines : [];
  const nombres = useNombresAlumnos(lista.map((a) => a.uid));

  function cargar() {
    listAchievementsByEstado("pendiente").then(setPendientes);
    listPinesPendientes().then(setPines);
  }

  useEffect(cargar, []);

  async function handleValidar(id: string, aprobado: boolean) {
    if (!userDoc) return;
    await validarAchievement(id, userDoc.uid, aprobado);
    cargar();
  }

  async function handleVerVideo(videoPath: string) {
    const url = await obtenerUrlVideo(videoPath);
    window.open(url, "_blank");
  }

  async function handlePin(id: string) {
    await marcarPinEntregado(id);
    cargar();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4 pb-8">
      {userDoc && <OtorgarMedallaCard adminUid={userDoc.uid} />}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={vista === "pendientes" ? "default" : "outline"}
          onClick={() => setVista("pendientes")}
        >
          Por validar ({pendientes.length})
        </Button>
        <Button
          size="sm"
          variant={vista === "pines" ? "default" : "outline"}
          onClick={() => setVista("pines")}
        >
          Pines pendientes ({pines.length})
        </Button>
        <Button
          size="sm"
          variant={vista === "cerca" ? "default" : "outline"}
          onClick={() => setVista("cerca")}
        >
          Cerca 🎯
        </Button>
        <Button render={<Link href="/medallas-admin/catalogo" />} size="sm" variant="ghost">
          Catálogo
        </Button>
      </div>

      <Card>
        <CardContent>
          {vista === "cerca" ? (
            <CercaDeMedalla skills={skills} />
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Award className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm text-muted-foreground">
                {vista === "pendientes" ? "No hay logros por validar." : "No hay pines pendientes de entregar."}
              </p>
            </div>
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
                        <Button size="sm" variant="destructive" onClick={() => handleValidar(a.id, false)}>
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
    </div>
  );
}
