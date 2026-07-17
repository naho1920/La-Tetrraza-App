"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type Vista = "pendientes" | "pines";

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

  const lista = vista === "pendientes" ? pendientes : pines;
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
        <Button render={<Link href="/medallas-admin/catalogo" />} size="sm" variant="ghost">
          Catálogo
        </Button>
      </div>

      <Card>
        <CardContent>
          {lista.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {vista === "pendientes" ? "No hay logros por validar." : "No hay pines pendientes de entregar."}
            </p>
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
