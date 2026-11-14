"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { useFinance } from "@/lib/use-finance";
import { useData } from "@/lib/data";
import { useSession } from "@/lib/firebase/session";
import { markDone } from "@/lib/actions";
import { pendingCents } from "@/lib/domain/engine";
import { formatBRL, formatSigned } from "@/lib/domain/money";
import { addDays, monthLabel, shortDate } from "@/lib/domain/dates";
import { Card, CardTitle, Label } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { BalanceChart, InOutChart } from "@/components/charts";
import { UpcomingRow } from "@/components/tx-row";
import { PageHeader } from "@/components/shell";
import { useNewTx } from "@/components/new-tx";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };

export default function Inicio() {
  const [horizon, setHorizon] = useState<"30" | "60" | "90">("90");
  const f = useFinance(Number(horizon));
  const { txs, accounts } = useData();
  const { companyId, user } = useSession();
  const open = useNewTx();
  const reserva = accounts.find((a) => a.kind === "reserva");
  const upcoming = [...txs, ...f.virtual]
    .filter((t) => t.type !== "transferencia" && pendingCents(t) > 0 && t.status === "previsto" && t.date <= addDays(f.today, 7))
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const diff = f.prev.resultado ? Math.round(((f.summary.resultado - f.prev.resultado) / Math.abs(f.prev.resultado)) * 100) : null;
  const tight = f.min90.balance < f.margin;
  const name = user?.displayName?.split(" ")[0];

  return (
    <>
      <PageHeader title={`${greeting()}${name ? `, ${name}` : ""}`} subtitle={`${f.company?.name} · ${monthLabel(f.month, true)}`}>
        <Button onClick={() => open()} className="hidden md:inline-flex"><Plus />Lançar</Button>
      </PageHeader>

      {tight && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-warn-border bg-warn-bg px-4 py-3 text-sm">
          <AlertTriangle className="size-[18px] shrink-0 text-negative" />
          <div className="flex-1 text-warn-fg"><strong className="text-foreground">{f.min90.balance < 0 ? "Vai faltar dinheiro." : "Seu caixa aperta."}</strong> O saldo deve chegar a {formatBRL(f.min90.balance)} em {shortDate(f.min90.date)}{f.min90.balance >= 0 ? `, abaixo da sua margem de ${formatBRL(f.margin)}` : ""}.</div>
          <Link href="/previsibilidade" className="hidden whitespace-nowrap text-[13px] font-medium underline sm:inline">Ver previsibilidade</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="col-span-2 border-primary/60 bg-highlight lg:order-2 lg:col-span-1">
          <Label className="text-foreground/80">Livre para usar</Label>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{formatBRL(f.free)}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/75">Pode gastar ou guardar sem faltar dinheiro nos próximos 90 dias</p>
        </Card>
        <Card className="lg:order-1">
          <Label>Saldo disponível</Label>
          <div className="mt-2 text-xl font-semibold tracking-tight md:text-[28px]">{formatBRL(f.totals.operacional)}</div>
          <p className="mt-1.5 text-xs text-muted">{accounts.filter((a) => a.kind === "operacional").map((a) => `${a.name} ${formatBRL(f.totals.byAccount.get(a.id) ?? 0)}`).join(" · ")}</p>
        </Card>
        <Card className="lg:order-3">
          <Label>Resultado de {monthLabel(f.month, true)}</Label>
          <div className={`mt-2 text-xl font-semibold tracking-tight md:text-[28px] ${f.summary.resultado >= 0 ? "text-positive" : "text-negative"}`}>{formatSigned(f.summary.resultado)}</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">Entrou {formatBRL(f.summary.entrou)} · Saiu {formatBRL(f.summary.saiu)}{diff !== null && <><br />{diff >= 0 ? "+" : ""}{diff}% vs mês anterior</>}{f.summary.retirada > 0 && <><br />Você tirou {formatBRL(f.summary.retirada)} para você</>}</p>
        </Card>
        <Card className="col-span-2 lg:order-4 lg:col-span-1">
          <Label>Guardado</Label>
          <div className="mt-2 text-xl font-semibold tracking-tight md:text-[28px]">{formatBRL(f.totals.reserva)}</div>
          {reserva?.goalCents ? (<>
            <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-1.5 rounded-full bg-positive" style={{ width: `${Math.min(100, (f.totals.reserva / reserva.goalCents) * 100)}%` }} /></div>
            <p className="mt-2 text-xs text-muted">{Math.round((f.totals.reserva / reserva.goalCents) * 100)}% da meta de {formatBRL(reserva.goalCents)}</p>
          </>) : <p className="mt-1.5 text-xs text-muted">Não entra no saldo disponível. <Link href="/ajustes" className="underline">Definir meta</Link></p>}
        </Card>
      </div>

      <Card className="mt-4 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><CardTitle>Seu saldo, dia a dia</CardTitle><Label className="mt-0.5">Últimos 30 dias e o que vem pela frente</Label></div>
          <Segmented label="Horizonte" value={horizon} onChange={setHorizon} options={[{ value: "30", label: "30 dias" }, { value: "60", label: "60 dias" }, { value: "90", label: "90 dias" }]} />
        </div>
        <div className="mt-4"><BalanceChart points={f.proj.points} past={f.past} margin={f.margin} /></div>
        <p className="mt-2 text-xs text-muted">Linha cheia: já aconteceu. Tracejada: previsto. Menor ponto em {horizon} dias: <strong className="text-foreground">{formatBRL(f.proj.min.balance)} em {shortDate(f.proj.min.date)}</strong></p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="mb-1 flex items-center justify-between"><CardTitle>Próximos 7 dias</CardTitle><Link href="/lancamentos" className="text-[13px] underline">Ver tudo</Link></div>
          {upcoming.length ? upcoming.map((t) => <UpcomingRow key={t.id} t={t} today={f.today} onDone={(x) => markDone(companyId!, x)} />)
            : <p className="border-t border-border py-6 text-center text-sm text-muted">Nada vencendo nos próximos 7 dias. <button onClick={() => open("saida")} className="underline cursor-pointer">Lançar uma conta a pagar</button></p>}
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><CardTitle>Entrou × Saiu</CardTitle>
            <div className="flex gap-3 text-xs text-muted"><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-lime" />Entrou</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-negative" />Saiu</span></div></div>
          <InOutChart data={f.history} />
        </Card>
      </div>
    </>
  );
}
