"use client";
import { Check } from "lucide-react";
import type { Transaction } from "@/lib/domain/types";
import { isOverdue, pendingCents } from "@/lib/domain/engine";
import { formatBRL, formatSigned } from "@/lib/domain/money";
import { shortDate } from "@/lib/domain/dates";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function statusOf(t: Transaction, today: string): { label: string; tone: "default" | "ok" | "warn" } {
  if (t.type === "transferencia") return { label: t.status === "realizado" ? "Transferido" : "Vai transferir", tone: "default" };
  if (isOverdue(t, today)) return { label: "Atrasado", tone: "warn" };
  if (t.status === "realizado") return { label: "Feito", tone: "ok" };
  if (t.paidCents > 0) return { label: `${formatBRL(t.paidCents)} de ${formatBRL(t.amountCents)}`, tone: "default" };
  return { label: t.type === "entrada" ? "Vai entrar" : "Vai sair", tone: "default" };
}

export const signed = (t: Transaction, cents = t.amountCents) => (t.type === "entrada" ? cents : t.type === "saida" ? -cents : 0);

export function UpcomingRow({ t, today, onDone }: { t: Transaction; today: string; onDone: (t: Transaction) => void }) {
  const s = statusOf(t, today);
  const left = pendingCents(t);
  const [d, m] = shortDate(t.date).split(" ");
  return (
    <div className="flex items-center gap-3 border-t border-border py-3">
      <div className="w-11 text-center"><div className="text-base font-semibold">{d}</div><div className="text-[11px] text-muted">{m}</div></div>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{t.description}</div><div className="truncate text-xs text-muted">{t.occurrenceKey ? "Fixa mensal" : t.category}{t.paidCents > 0 ? ` · restam ${formatBRL(left)}` : ""}</div></div>
      <Badge tone={s.tone} className="hidden sm:inline-flex">{s.tone === "warn" ? s.label : t.type === "entrada" ? "Vai entrar" : "Vai sair"}</Badge>
      <div className={cn("w-24 text-right text-sm font-semibold", t.type === "entrada" && "text-positive")}>{formatSigned(signed(t, left))}</div>
      <Button variant="outline" size="sm" onClick={() => onDone(t)} aria-label={`Marcar ${t.description} como feito`}><Check />Feito</Button>
    </div>
  );
}
