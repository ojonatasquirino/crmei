import { describe, expect, it } from "vitest";
import { balances, freeToUse, monthSummary, project, recurrenceOccurrences, totals } from "./engine";
import { parseBRL } from "./money";
import type { Account, Recurrence, Transaction } from "./types";

const acc: Account[] = [
  { id: "banco", name: "Banco", kind: "operacional", initialCents: 100_000 },
  { id: "res", name: "Guardado", kind: "reserva", initialCents: 0 },
];
const tx = (p: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), type: "saida", status: "realizado", amountCents: 0, paidCents: 0, date: "2026-11-10", accountId: "banco", category: "x", description: "x", ...p });

describe("dinheiro", () => {
  it("parse em centavos inteiros", () => {
    expect(parseBRL("1.234,56")).toBe(123456);
    expect(parseBRL("0,1")).toBe(10);
    expect(parseBRL("abc")).toBeNull();
  });
});

describe("saldo", () => {
  it("previsto não entra no saldo", () => {
    const t = totals(acc, [tx({ type: "entrada", status: "previsto", amountCents: 50_000 })]);
    expect(t.operacional).toBe(100_000);
  });
  it("pagamento parcial conta só a parte paga", () => {
    const t = totals(acc, [tx({ type: "entrada", status: "previsto", amountCents: 100_000, paidCents: 60_000 })]);
    expect(t.operacional).toBe(160_000);
  });
  it("transferência move entre contas e não é receita nem despesa", () => {
    const txs = [tx({ type: "transferencia", amountCents: 30_000, toAccountId: "res" })];
    const b = balances(acc, txs);
    expect(b.get("banco")).toBe(70_000);
    expect(b.get("res")).toBe(30_000);
    expect(monthSummary(txs, "2026-11")).toEqual({ entrou: 0, saiu: 0, resultado: 0, retirada: 0 });
  });
  it("cancelado e excluído não contam", () => {
    const t = totals(acc, [tx({ amountCents: 10_000, status: "cancelado" }), tx({ amountCents: 10_000, deleted: true })]);
    expect(t.operacional).toBe(100_000);
  });
});

describe("fixas", () => {
  const rec: Recurrence = { id: "aluguel", type: "saida", amountCents: 180_000, dayOfMonth: 31, startMonth: "2026-11", accountId: "banco", category: "Aluguel", description: "Aluguel", active: true };
  it("gera um por mês e ajusta dia 31 em mês curto", () => {
    const occ = recurrenceOccurrences([rec], [], "2026-11-01", "2027-02-28");
    expect(occ.map((o) => o.date)).toEqual(["2026-11-30", "2026-12-31", "2027-01-31", "2027-02-28"]);
  });
  it("não duplica quando a ocorrência já virou lançamento", () => {
    const occ = recurrenceOccurrences([rec], [tx({ occurrenceKey: "aluguel:2026-11" })], "2026-11-01", "2026-12-31");
    expect(occ).toHaveLength(1);
  });
});

describe("projeção", () => {
  it("encontra o menor saldo e trata atrasado como hoje", () => {
    const txs = [
      tx({ status: "previsto", amountCents: 20_000, date: "2026-11-01" }), // atrasado
      tx({ status: "previsto", amountCents: 90_000, date: "2026-11-20" }),
      tx({ type: "entrada", status: "previsto", amountCents: 50_000, date: "2026-11-25" }),
    ];
    const { points, min } = project(acc, txs, [], "2026-11-13", 30);
    expect(points[0].balance).toBe(80_000);
    expect(min).toMatchObject({ date: "2026-11-20", balance: -10_000 });
    expect(points.at(-1)!.balance).toBe(40_000);
    expect(freeToUse(min.balance, 10_000)).toBe(0);
  });
  it("transferência futura para a reserva reduz o operacional", () => {
    const { points } = project(acc, [tx({ type: "transferencia", status: "previsto", amountCents: 10_000, toAccountId: "res", date: "2026-11-14" })], [], "2026-11-13", 2);
    expect(points[1].balance).toBe(90_000);
  });
});

import { pastBalances } from "./engine";
describe("histórico", () => {
  it("reconstrói o saldo dos dias anteriores", () => {
    const p = pastBalances(acc, [tx({ type: "entrada", amountCents: 5_000, date: "2026-11-12", paidAt: "2026-11-12" })], "2026-11-13", 2);
    expect(p.map((x) => x.balance)).toEqual([100_000, 105_000, 105_000]);
  });
});
