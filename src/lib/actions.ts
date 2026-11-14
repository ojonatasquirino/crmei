"use client";
import type { Transaction } from "./domain/types";
import { createTx, pay } from "./data";
import { pendingCents } from "./domain/engine";
import { todayISO } from "./domain/dates";

/** "Feito": quita o restante. Ocorrência virtual de fixa vira lançamento real já pago. */
export async function markDone(cid: string, t: Transaction) {
  if (t.id.startsWith("virtual:")) {
    return createTx(cid, { type: t.type, amountCents: t.amountCents, date: t.date, done: true, accountId: t.accountId, category: t.category, description: t.description, occurrenceKey: t.occurrenceKey });
  }
  return pay(cid, t, pendingCents(t), todayISO());
}
