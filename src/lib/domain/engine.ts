import type { Account, ISODate, Recurrence, Transaction } from "./types";
import { RETIRADA } from "./types";
import { addDays, addMonths, daysInMonth, monthOf } from "./dates";

const live = (t: Transaction) => !t.deleted && t.status !== "cancelado";

/** Quanto do lançamento já virou dinheiro de verdade. Previsto parcial conta só a parte paga. */
export const realizedCents = (t: Transaction) => (t.status === "realizado" ? t.amountCents : Math.min(t.paidCents, t.amountCents));
export const pendingCents = (t: Transaction) => (t.status === "previsto" ? t.amountCents - Math.min(t.paidCents, t.amountCents) : 0);

function applyEffect(map: Map<string, number>, t: Transaction, cents: number) {
  if (cents === 0) return;
  if (t.type === "entrada") map.set(t.accountId, (map.get(t.accountId) ?? 0) + cents);
  else if (t.type === "saida") map.set(t.accountId, (map.get(t.accountId) ?? 0) - cents);
  else if (t.toAccountId) {
    map.set(t.accountId, (map.get(t.accountId) ?? 0) - cents);
    map.set(t.toAccountId, (map.get(t.toAccountId) ?? 0) + cents);
  }
}

/** Saldo de cada conta: inicial + tudo que efetivamente aconteceu. Nunca é armazenado. */
export function balances(accounts: Account[], txs: Transaction[]) {
  const map = new Map<string, number>(accounts.map((a) => [a.id, a.initialCents]));
  for (const t of txs) if (live(t)) applyEffect(map, t, realizedCents(t));
  return map;
}

export function totals(accounts: Account[], txs: Transaction[]) {
  const b = balances(accounts, txs);
  let operacional = 0, reserva = 0;
  for (const a of accounts) (a.kind === "reserva" ? (reserva += b.get(a.id) ?? 0) : (operacional += b.get(a.id) ?? 0));
  return { operacional, reserva, byAccount: b };
}

/** Ocorrências virtuais de fixas que ainda não viraram lançamento real. */
export function recurrenceOccurrences(recs: Recurrence[], txs: Transaction[], from: ISODate, to: ISODate): Transaction[] {
  const taken = new Set(txs.filter((t) => t.occurrenceKey && !t.deleted).map((t) => t.occurrenceKey!));
  const out: Transaction[] = [];
  for (const r of recs) {
    if (!r.active) continue;
    for (let ym = monthOf(from) < r.startMonth ? r.startMonth : monthOf(from); ym <= monthOf(to); ym = addMonths(ym, 1)) {
      if (r.endMonth && ym > r.endMonth) break;
      const key = `${r.id}:${ym}`;
      if (taken.has(key)) continue;
      const date = `${ym}-${String(Math.min(r.dayOfMonth, daysInMonth(ym))).padStart(2, "0")}`;
      if (date < from || date > to) continue;
      out.push({ id: `virtual:${key}`, type: r.type, status: "previsto", amountCents: r.amountCents, paidCents: 0, date, accountId: r.accountId, category: r.category, description: r.description, occurrenceKey: key });
    }
  }
  return out;
}

export interface ProjectionPoint { date: ISODate; balance: number; items: { description: string; cents: number }[] }

/**
 * Saldo operacional dia a dia, de hoje até hoje+days.
 * Previstos vencidos e não pagos entram hoje (o dinheiro ainda vai ter que sair/entrar).
 * Transferências só mexem no operacional quando cruzam operacional <-> reserva.
 * Ocorrências de fixas sem lançamento real entram como previstas.
 */
export function project(accounts: Account[], txs: Transaction[], recs: Recurrence[], today: ISODate, days: number) {
  const kind = new Map(accounts.map((a) => [a.id, a.kind]));
  const isOp = (id?: string | null) => !!id && kind.get(id) !== "reserva";
  const end = addDays(today, days);
  // ocorrências virtuais desde o início do mês: uma fixa do dia 5 não paga continua pendente.
  const future = [...txs.filter(live), ...recurrenceOccurrences(recs, txs, `${monthOf(today)}-01`, end)];
  const byDay = new Map<ISODate, ProjectionPoint["items"]>();
  for (const t of future) {
    const left = pendingCents(t);
    if (left <= 0 || t.date > end) continue;
    let delta = 0;
    if (t.type === "entrada" && isOp(t.accountId)) delta = left;
    else if (t.type === "saida" && isOp(t.accountId)) delta = -left;
    else if (t.type === "transferencia") delta = (isOp(t.toAccountId) ? left : 0) - (isOp(t.accountId) ? left : 0);
    if (!delta) continue;
    const day = t.date < today ? today : t.date;
    byDay.set(day, [...(byDay.get(day) ?? []), { description: t.description, cents: delta }]);
  }
  let bal = totals(accounts, txs).operacional;
  const points: ProjectionPoint[] = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(today, i);
    const items = byDay.get(d) ?? [];
    bal += items.reduce((s, x) => s + x.cents, 0);
    points.push({ date: d, balance: bal, items });
  }
  const min = points.reduce((m, p) => (p.balance < m.balance ? p : m), points[0]);
  return { points, min };
}

/** Quanto dá pra gastar ou guardar sem furar a margem em nenhum dia do horizonte. */
export const freeToUse = (minBalance: number, marginCents: number) => Math.max(0, minBalance - marginCents);

/** Entrou/saiu realizados no mês (por data de pagamento). Transferência nunca conta. */
export function monthSummary(txs: Transaction[], ym: string) {
  let entrou = 0, saiu = 0, retirada = 0;
  for (const t of txs) {
    if (!live(t) || t.type === "transferencia") continue;
    const when = t.paidAt ?? t.date;
    const cents = realizedCents(t);
    if (!cents || monthOf(when) !== ym) continue;
    if (t.type === "entrada") entrou += cents;
    else { saiu += cents; if (t.category === RETIRADA) retirada += cents; }
  }
  return { entrou, saiu, resultado: entrou - saiu, retirada };
}

/** Lançamentos previstos vencidos: calculado, nunca armazenado. */
export const isOverdue = (t: Transaction, today: ISODate) => t.status === "previsto" && pendingCents(t) > 0 && t.date < today;

/** Saldo operacional ao fim de cada um dos últimos `days` dias (pela data da baixa). */
export function pastBalances(accounts: Account[], txs: Transaction[], today: ISODate, days: number) {
  const kind = new Map(accounts.map((a) => [a.id, a.kind]));
  const isOp = (id?: string | null) => !!id && kind.get(id) !== "reserva";
  const current = totals(accounts, txs).operacional;
  const delta = new Map<ISODate, number>();
  for (const t of txs) {
    const c = live(t) ? realizedCents(t) : 0;
    if (!c) continue;
    let d = 0;
    if (t.type === "entrada" && isOp(t.accountId)) d = c;
    else if (t.type === "saida" && isOp(t.accountId)) d = -c;
    else if (t.type === "transferencia") d = (isOp(t.toAccountId) ? c : 0) - (isOp(t.accountId) ? c : 0);
    const when = t.paidAt ?? t.date;
    delta.set(when, (delta.get(when) ?? 0) + d);
  }
  // anda de trás pra frente a partir do saldo de hoje
  const out: { date: ISODate; balance: number }[] = [];
  let bal = current;
  for (const [day, d] of delta) if (day > today) bal -= d; // baixas com data futura não contam no passado
  for (let i = 0; i <= days; i++) {
    const day = addDays(today, -i);
    out.push({ date: day, balance: bal });
    bal -= delta.get(day) ?? 0;
  }
  return out.reverse();
}
