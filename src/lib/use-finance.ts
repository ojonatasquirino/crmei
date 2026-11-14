"use client";
import { useMemo } from "react";
import { useData } from "./data";
import { freeToUse, pastBalances, monthSummary, project, recurrenceOccurrences, totals } from "./domain/engine";
import { addDays, addMonths, monthOf, todayISO } from "./domain/dates";

/** Todos os números do app saem daqui, calculados a partir do ledger. */
export function useFinance(horizon = 90) {
  const { company, accounts, txs, recs, ready } = useData();
  return useMemo(() => {
    const today = todayISO();
    const month = monthOf(today);
    const t = totals(accounts, txs);
    const proj = project(accounts, txs, recs, today, horizon);
    const proj90 = horizon === 90 ? proj : project(accounts, txs, recs, today, 90);
    const margin = company?.marginCents ?? 0;
    const summary = monthSummary(txs, month);
    const prev = monthSummary(txs, addMonths(month, -1));
    const history = Array.from({ length: 6 }, (_, i) => { const ym = addMonths(month, i - 5); return { ym, ...monthSummary(txs, ym) }; });
    const virtual = recurrenceOccurrences(recs, txs, `${month}-01`, addDays(today, 90));
    const past = pastBalances(accounts, txs, today, 30);
    return { past, ready, company, today, month, totals: t, proj, margin, free: freeToUse(proj90.min.balance, margin), min90: proj90.min, summary, prev, history, virtual };
  }, [company, accounts, txs, recs, ready, horizon]);
}
