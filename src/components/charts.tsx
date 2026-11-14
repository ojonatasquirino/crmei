"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProjectionPoint } from "@/lib/domain/engine";
import { formatBRL, formatCompact, formatSigned } from "@/lib/domain/money";
import { monthLabel, shortDate } from "@/lib/domain/dates";

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

function ProjectionTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; balance: number; items: ProjectionPoint["items"]; today: boolean } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="min-w-48 rounded-lg border border-border-strong bg-surface p-3 text-xs shadow-lg">
      <div className="text-muted">{shortDate(p.date)} · {p.today ? "hoje" : "previsto"}</div>
      <div className="mt-1 text-[15px] font-semibold">{formatBRL(p.balance)}</div>
      {p.items.slice(0, 4).map((i, k) => (
        <div key={k} className={`mt-1 flex justify-between gap-3 ${i.cents < 0 ? "text-negative" : "text-positive"}`}><span className="truncate">{i.description}</span><span>{formatSigned(i.cents)}</span></div>
      ))}
      {p.items.length > 4 && <div className="mt-1 text-muted">+{p.items.length - 4} lançamentos</div>}
    </div>
  );
}

type Row = { date: string; balance: number; items: ProjectionPoint["items"]; real?: number; prev?: number; today: boolean };

export function BalanceChart({ points, past = [], margin, height = 260 }: { points: ProjectionPoint[]; past?: { date: string; balance: number }[]; margin: number; height?: number }) {
  const data: Row[] = [
    ...past.slice(0, -1).map((p) => ({ ...p, items: [], real: p.balance, today: false })),
    ...points.map((p, i) => ({ ...p, prev: p.balance, real: i === 0 ? p.balance : undefined, today: i === 0 })),
  ];
  const min = Math.min(0, margin, ...data.map((p) => p.balance));
  return (
    <div role="img" aria-label="Saldo dia a dia: o que já aconteceu e o previsto" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillBal" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--lime)" stopOpacity={0.35} /><stop offset="1" stopColor="var(--lime)" stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={40} />
          <YAxis {...axis} width={56} tickFormatter={formatCompact} domain={[min, "auto"]} />
          <Tooltip content={<ProjectionTooltip />} cursor={{ stroke: "var(--line)", strokeDasharray: "3 3" }} />
          <ReferenceLine y={margin} stroke="var(--negative)" strokeDasharray="6 5" label={{ value: "Margem", position: "insideTopRight", fill: "var(--negative)", fontSize: 11 }} />
          <ReferenceLine y={0} stroke="var(--border-strong)" />
          {past.length > 0 && <ReferenceLine x={points[0]?.date} stroke="var(--border-strong)" label={{ value: "Hoje", position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} />}
          <Area type="stepAfter" dataKey="real" stroke="var(--line)" strokeWidth={2.5} fill="url(#fillBal)" isAnimationActive={false} connectNulls={false} />
          <Area type="stepAfter" dataKey="prev" stroke="var(--line)" strokeWidth={2.5} strokeDasharray="7 5" fill="url(#fillBal)" isAnimationActive={false} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InOutChart({ data }: { data: { ym: string; entrou: number; saiu: number }[] }) {
  return (
    <div role="img" aria-label="Entrou e saiu nos últimos 6 meses" style={{ height: 210 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="ym" {...axis} tickFormatter={(v) => monthLabel(v)} />
          <YAxis {...axis} width={48} tickFormatter={formatCompact} />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={({ active, payload, label }) => active && payload?.length ? (
            <div className="rounded-lg border border-border-strong bg-surface p-3 text-xs shadow-lg">
              <div className="mb-1 font-medium capitalize">{monthLabel(String(label), true)}</div>
              <div className="text-positive">Entrou {formatBRL(Number(payload[0].value))}</div>
              <div className="text-negative">Saiu {formatBRL(Number(payload[1].value))}</div>
            </div>) : null} />
          <Bar dataKey="entrou" fill="var(--lime)" radius={[5, 5, 0, 0]} />
          <Bar dataKey="saiu" fill="var(--negative)" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
