"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { WeightLog } from "./api";

function formatFecha(log: WeightLog): string {
  const date = log.fecha?.toDate();
  if (!date) return "";
  return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
}

export function WeightChart({ logs }: { logs: WeightLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no registras tu peso.</p>;
  }

  if (logs.length === 1) {
    return (
      <p className="text-sm text-muted-foreground">
        Peso actual: <span className="font-medium text-foreground">{logs[0].pesoKg} kg</span>. Registra
        otra vez para ver tu evolución en un gráfico.
      </p>
    );
  }

  const data = logs.map((log) => ({ fecha: formatFecha(log), pesoKg: log.pesoKg }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="var(--muted-foreground)"
            domain={["dataMin - 2", "dataMax + 2"]}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--card-foreground)",
            }}
            formatter={(value) => [`${value} kg`, "Peso"]}
          />
          <Line
            type="monotone"
            dataKey="pesoKg"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--primary)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
