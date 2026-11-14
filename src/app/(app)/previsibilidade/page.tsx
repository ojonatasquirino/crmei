"use client";
import { useMemo, useState } from "react";
import { useFinance } from "@/lib/use-finance";
import { useData } from "@/lib/data";
import { pendingCents } from "@/lib/domain/engine";
import { formatBRL, formatSigned } from "@/lib/domain/money";
import { addDays, monthLabel, monthOf, shortDate } from "@/lib/domain/dates";
import { Card, CardTitle, Label } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { BalanceChart } from "@/components/charts";
import { PageHeader } from "@/components/shell";
import { cn } from "@/lib/utils";

export default function Previsibilidade() {
  const [h, setH] = useState<"30" | "60" | "90">("90");
  const days = Number(h);
  const f = useFinance(days);
  const { txs } = useData();
  const [salesDrop, setSalesDrop] = useState(0);
  const [costUp, setCostUp] = useState(0);

  const { entra, sai, months } = useMemo(() => {
    let entra = 0, sai = 0;
    const months = new Map<string, { start: number; in: number; out: number; end: number }>();
    for (const p of f.proj.points) {
      const ym = monthOf(p.date);
      const m = months.get(ym) ?? { start: p.balance - p.items.reduce((s, i) => s + i.cents, 0), in: 0, out: 0, end: 0 };
      for (const i of p.items) i.cents > 0 ? ((m.in += i.cents), (entra += i.cents)) : ((m.out -= i.cents), (sai -= i.cents));
      m.end = p.balance;
      months.set(ym, m);
    }
    return { entra, sai, months };
  }, [f.proj]);

  const sim = useMemo(() => {
    let bal = f.totals.operacional, min = { date: f.today, balance: Infinity }, negDays = 0;
    for (const p of f.proj.points) {
      bal += p.items.reduce((s, i) => s + (i.cents > 0 ? Math.round(i.cents * (1 - salesDrop / 100)) : Math.round(i.cents * (1 + costUp / 100))), 0);
      if (bal < min.balance) min = { date: p.date, balance: bal };
      if (bal < 0) negDays++;
    }
    return { min, negDays };
  }, [f.proj, f.totals.operacional, f.today, salesDrop, costUp]);

  const heavy = useMemo(() => {
    const end = addDays(f.today, days);
    const by = new Map<string, number>();
    for (const t of [...txs, ...f.virtual]) if (t.type === "saida" && t.status === "previsto" && t.date <= end) by.set(t.category, (by.get(t.category) ?? 0) + pendingCents(t));
    const list = [...by].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { list, max: list[0]?.[1] ?? 1 };
  }, [txs, f.virtual, f.today, days]);

  const below = f.proj.min.balance < f.margin;
  return (
    <>
      <PageHeader title="Previsibilidade" subtitle="Se tudo acontecer como está lançado, é assim que seu caixa fica">
        <Segmented label="Horizonte" value={h} onChange={setH} options={[{ value: "30", label: "30 dias" }, { value: "60", label: "60 dias" }, { value: "90", label: "90 dias" }]} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card><Label>Saldo hoje</Label><div className="mt-2 text-xl font-semibold md:text-[28px]">{formatBRL(f.totals.operacional)}</div><p className="mt-1 text-xs text-muted">Confirmado</p></Card>
        <Card><Label>Vai entrar</Label><div className="mt-2 text-xl font-semibold text-positive md:text-[28px]">{formatSigned(entra)}</div><p className="mt-1 text-xs text-muted">Recebimentos lançados</p></Card>
        <Card><Label>Vai sair</Label><div className="mt-2 text-xl font-semibold md:text-[28px]">{formatSigned(-sai)}</div><p className="mt-1 text-xs text-muted">Contas lançadas e fixas mensais</p></Card>
        <Card className={cn(below && "border-warn-border bg-warn-bg")}><Label className={cn(below && "text-warn-fg")}>Menor saldo</Label><div className={cn("mt-2 text-xl font-semibold md:text-[28px]", below && "text-negative")}>{formatBRL(f.proj.min.balance)}</div>
          <p className={cn("mt-1 text-xs", below ? "text-warn-fg" : "text-muted")}>Em {shortDate(f.proj.min.date)} · {f.proj.min.balance >= f.margin ? `${formatBRL(f.proj.min.balance - f.margin)} acima` : `${formatBRL(f.margin - f.proj.min.balance)} abaixo`} da margem</p></Card>
      </div>

      <Card className="mt-4 pb-3">
        <CardTitle>Saldo projetado</CardTitle>
        <div className="mt-4"><BalanceChart points={f.proj.points} margin={f.margin} height={300} /></div>
        <p className="mt-2 text-xs text-muted">Contas atrasadas entram como se fossem pagas hoje. Vendas que você ainda não lançou não aparecem aqui: lance o que já está combinado.</p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="overflow-x-auto">
          <CardTitle className="mb-3">Mês a mês</CardTitle>
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-normal">Período</th><th className="pb-2 text-right font-normal">Começa com</th><th className="pb-2 text-right font-normal">Vai entrar</th><th className="pb-2 text-right font-normal">Vai sair</th><th className="pb-2 text-right font-normal">Termina com</th></tr></thead>
            <tbody>{[...months].map(([ym, m]) => (
              <tr key={ym} className="border-t border-border"><td className="py-3 font-medium capitalize">{monthLabel(ym, true)}</td><td className="text-right">{formatBRL(m.start)}</td><td className="text-right text-positive">{formatSigned(m.in)}</td><td className="text-right">{formatSigned(-m.out)}</td><td className={cn("text-right font-semibold", m.end < 0 && "text-negative")}>{formatBRL(m.end)}</td></tr>
            ))}</tbody>
          </table>
        </Card>
        <Card>
          <CardTitle>Simular</CardTitle><Label className="mb-4 mt-1">E se as coisas mudarem?</Label>
          <label className="block text-[13px] text-muted">Recebimentos caem <strong className="text-foreground">{salesDrop}%</strong>
            <input type="range" min={0} max={50} step={5} value={salesDrop} onChange={(e) => setSalesDrop(Number(e.target.value))} className="mb-4 mt-2 w-full accent-[var(--primary)]" /></label>
          <label className="block text-[13px] text-muted">Contas sobem <strong className="text-foreground">{costUp}%</strong>
            <input type="range" min={0} max={50} step={5} value={costUp} onChange={(e) => setCostUp(Number(e.target.value))} className="mb-4 mt-2 w-full accent-[var(--primary)]" /></label>
          <div className={cn("rounded-xl border p-4", sim.min.balance < 0 ? "border-warn-border bg-warn-bg" : "border-border bg-surface-2")}>
            <Label className={cn(sim.min.balance < 0 && "text-warn-fg")}>Nesse cenário o menor saldo vira</Label>
            <div className={cn("mt-1 text-xl font-semibold", sim.min.balance < 0 && "text-negative")}>{formatBRL(sim.min.balance)} em {shortDate(sim.min.date)}</div>
            {sim.negDays > 0 && <p className="mt-1 text-xs text-warn-fg">Faltaria dinheiro por {sim.negDays} {sim.negDays === 1 ? "dia" : "dias"}.{f.totals.reserva > 0 && ` Você tem ${formatBRL(f.totals.reserva)} guardado.`}</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle className="mb-1">O que mais pesa nos próximos {days} dias</CardTitle>
        {heavy.list.length === 0 && <p className="py-4 text-sm text-muted">Nenhuma conta prevista. Cadastre suas fixas em Ajustes.</p>}
        {heavy.list.map(([cat, v]) => (
          <div key={cat} className="border-t border-border py-3">
            <div className="flex justify-between text-sm"><span className="font-medium">{cat}</span><span>{formatBRL(v)}</span></div>
            <div className="mt-2 h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-negative" style={{ width: `${(v / heavy.max) * 100}%` }} /></div>
          </div>
        ))}
      </Card>
    </>
  );
}
