"use client";
import { useMemo, useState } from "react";
import { Download, MoreHorizontal, Plus, Search } from "lucide-react";
import { useData, pay, removeTx, updateTx } from "@/lib/data";
import { useSession } from "@/lib/firebase/session";
import { useFinance } from "@/lib/use-finance";
import { markDone } from "@/lib/actions";
import { isOverdue, monthSummary, pendingCents } from "@/lib/domain/engine";
import { formatBRL, formatSigned, parseBRL } from "@/lib/domain/money";
import { addMonths, monthLabel, monthOf, shortDate } from "@/lib/domain/dates";
import type { Transaction } from "@/lib/domain/types";
import { Card, Label } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { PageHeader } from "@/components/shell";
import { useNewTx } from "@/components/new-tx";
import { signed, statusOf } from "@/components/tx-row";
import { cn } from "@/lib/utils";

type Filter = "tudo" | "feito" | "futuro" | "atrasado";

function toCSV(rows: Transaction[], names: Map<string, string>) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const head = "data;descricao;tipo;categoria;conta;situacao;valor;pago";
  const body = rows.map((t) => [t.date, esc(t.description), t.type, esc(t.category), esc(names.get(t.accountId) ?? ""), t.status, (t.amountCents / 100).toFixed(2).replace(".", ","), (t.paidCents / 100).toFixed(2).replace(".", ",")].join(";"));
  return "﻿" + [head, ...body].join("\n");
}

export default function Lancamentos() {
  const { txs, accounts } = useData();
  const { companyId } = useSession();
  const { today, month: current, virtual } = useFinance();
  const open = useNewTx();
  const [month, setMonth] = useState(current);
  const [filter, setFilter] = useState<Filter>("tudo");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const names = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  const all = useMemo(() => [...txs, ...virtual.filter((v) => monthOf(v.date) === month)], [txs, virtual, month]);
  const rows = all
    .filter((t) => monthOf(t.date) === month || (filter === "atrasado" && isOverdue(t, today)))
    .filter((t) => filter === "tudo" || (filter === "feito" ? t.status === "realizado" : filter === "futuro" ? t.status === "previsto" && !isOverdue(t, today) : isOverdue(t, today)))
    .filter((t) => { const s = q.trim().toLowerCase(); return !s || `${t.description} ${t.category} ${(t.amountCents / 100).toFixed(2).replace(".", ",")}`.toLowerCase().includes(s); })
    .sort((a, b) => b.date.localeCompare(a.date));
  const overdue = txs.filter((t) => isOverdue(t, today)).length;
  const sum = monthSummary(txs, month);

  const groups = new Map<string, Transaction[]>();
  for (const t of rows) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);

  function exportCSV() {
    const blob = new Blob([toCSV(rows.filter((t) => !t.id.startsWith("virtual:")), names)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `crmei-${month}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader title="Lançamentos" subtitle="Tudo o que entrou, saiu e ainda vai acontecer">
        <div className="flex gap-2"><Button variant="outline" onClick={exportCSV}><Download />CSV</Button><Button onClick={() => open()} className="hidden md:inline-flex"><Plus />Lançar</Button></div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex h-10 min-w-60 flex-1 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 text-muted">
          <Search className="size-4" /><span className="sr-only">Buscar</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por descrição, categoria ou valor" className="flex-1 bg-transparent text-sm text-foreground outline-none" />
        </label>
        <Segmented label="Filtro" value={filter} onChange={setFilter} options={[{ value: "tudo", label: "Tudo" }, { value: "feito", label: "Feito" }, { value: "futuro", label: "Futuro" }, { value: "atrasado", label: `Atrasado${overdue ? ` · ${overdue}` : ""}` }]} />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, -1))} aria-label="Mês anterior">‹</Button>
          <span className="w-24 text-center text-sm font-medium capitalize">{monthLabel(month, true)} {month.slice(0, 4)}</span>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês">›</Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="p-4"><Label>Entrou</Label><div className="mt-1 text-lg font-semibold text-positive md:text-xl">{formatBRL(sum.entrou)}</div></Card>
        <Card className="p-4"><Label>Saiu</Label><div className="mt-1 text-lg font-semibold md:text-xl">{formatBRL(sum.saiu)}</div></Card>
        <Card className="p-4"><Label>Resultado</Label><div className="mt-1 text-lg font-semibold md:text-xl">{formatSigned(sum.resultado)}</div></Card>
      </div>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 && <div className="p-10 text-center text-sm text-muted">Nenhum lançamento aqui. <button onClick={() => open()} className="underline cursor-pointer">Lançar o primeiro</button></div>}
        {[...groups].map(([date, items]) => (
          <div key={date}>
            <div className="px-5 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-wider text-muted">{date === today ? "Hoje, " : ""}{shortDate(date)}</div>
            {items.map((t) => {
              const s = statusOf(t, today);
              return (
                <button key={t.id} onClick={() => setSelected(t)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-t border-border px-5 py-3 text-left text-sm hover:bg-surface-2 md:grid-cols-[2.2fr_1.1fr_1fr_1.4fr_1fr] cursor-pointer">
                  <span className="font-medium">{t.description}</span>
                  <span className={cn("text-right font-semibold md:order-last", t.type === "entrada" && "text-positive")}>{t.type === "transferencia" ? formatBRL(t.amountCents) : formatSigned(signed(t))}</span>
                  <span className="hidden md:block"><Badge>{t.occurrenceKey ? "Fixa mensal" : t.category}</Badge></span>
                  <span className="hidden text-muted md:block">{names.get(t.accountId)}{t.toAccountId ? ` → ${names.get(t.toAccountId)}` : ""}</span>
                  <span><Badge tone={s.tone}>{s.label}</Badge></span>
                </button>
              );
            })}
          </div>
        ))}
      </Card>
      <p className="mt-3 text-xs text-muted">Transferências entre contas aparecem na lista, mas não entram em Entrou nem em Saiu.</p>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={selected?.description ?? ""}>
        {selected && <TxDetail t={selected} cid={companyId!} today={today} onClose={() => setSelected(null)} />}
      </Sheet>
    </>
  );
}

function TxDetail({ t, cid, today, onClose }: { t: Transaction; cid: string; today: string; onClose: () => void }) {
  const [partial, setPartial] = useState("");
  const [err, setErr] = useState("");
  const left = pendingCents(t);
  const virtual = t.id.startsWith("virtual:");
  const run = (p: Promise<unknown>) => p.then(onClose).catch(() => setErr("Não foi possível salvar. Tente de novo."));
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-xl bg-surface-2 p-4">
        <div className="text-2xl font-semibold">{formatBRL(t.amountCents)}</div>
        <div className="mt-1 text-muted">{shortDate(t.date)} · {t.category}{virtual ? " · fixa mensal" : ""}</div>
        {t.paidCents > 0 && t.status === "previsto" && <div className="mt-2">Pago {formatBRL(t.paidCents)} · restam {formatBRL(left)}</div>}
      </div>
      {t.status === "previsto" && (<>
        <Button size="lg" onClick={() => run(markDone(cid, t))}>Marcar como feito ({formatBRL(left)})</Button>
        {!virtual && (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = parseBRL(partial); if (!c || c > left) return setErr(`Digite um valor até ${formatBRL(left)}`); run(pay(cid, t, c, today)); }}>
            <Input inputMode="decimal" placeholder="Pagou só uma parte? Ex.: 300,00" value={partial} onChange={(e) => setPartial(e.target.value)} aria-label="Valor parcial" />
            <Button variant="outline" className="h-11">Registrar</Button>
          </form>
        )}
      </>)}
      {t.status === "realizado" && !virtual && <Button variant="outline" onClick={() => run(updateTx(cid, t.id, { status: "previsto", paidCents: 0, paidAt: null }))}>Desfazer: voltar para previsto</Button>}
      {!virtual && (
        <div className="flex gap-2">
          {t.status === "previsto" && <Button variant="ghost" className="flex-1" onClick={() => run(updateTx(cid, t.id, { status: "cancelado" }))}>Cancelar lançamento</Button>}
          <Button variant="ghost" className="flex-1 text-negative" onClick={() => confirmDelete() && run(removeTx(cid, t.id))}><MoreHorizontal />Excluir</Button>
        </div>
      )}
      {err && <p role="alert" className="text-negative">{err}</p>}
    </div>
  );
}
const confirmDelete = () => window.confirm("Excluir este lançamento? Ele sai do saldo e dos relatórios.");
