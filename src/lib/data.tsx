"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { z } from "zod";
import { auth, db } from "./firebase/client";
import type { Account, Recurrence, Transaction } from "./domain/types";

export interface Company { id: string; name: string; ownerUid: string; members: string[]; inviteEmails: string[]; marginCents: number }
interface Data { company: Company | null; accounts: Account[]; txs: Transaction[]; recs: Recurrence[]; ready: boolean }
const Ctx = createContext<Data>({ company: null, accounts: [], txs: [], recs: [], ready: false });

/** Um MEI tem dezenas a poucas centenas de lançamentos por mês: escutar tudo da empresa é simples e barato. */
export function CompanyDataProvider({ companyId, children }: { companyId: string; children: React.ReactNode }) {
  const [d, setD] = useState<Data>({ company: null, accounts: [], txs: [], recs: [], ready: false });
  useEffect(() => {
    const base = doc(db, "companies", companyId);
    const got = new Set<string>();
    const mark = (k: string, patch: Partial<Data>) => { got.add(k); setD((s) => ({ ...s, ...patch, ready: got.size === 4 })); };
    const u = [
      onSnapshot(base, (s) => mark("c", { company: { id: s.id, ...(s.data() as Omit<Company, "id">) } })),
      onSnapshot(collection(base, "accounts"), (s) => mark("a", { accounts: s.docs.map((x) => ({ id: x.id, ...x.data() }) as Account) })),
      onSnapshot(collection(base, "transactions"), (s) => mark("t", { txs: s.docs.map((x) => ({ id: x.id, ...x.data() }) as Transaction).filter((t) => !t.deleted) })),
      onSnapshot(collection(base, "recurrences"), (s) => mark("r", { recs: s.docs.map((x) => ({ id: x.id, ...x.data() }) as Recurrence) })),
    ];
    return () => u.forEach((f) => f());
  }, [companyId]);
  return <Ctx.Provider value={d}>{children}</Ctx.Provider>;
}
export const useData = () => useContext(Ctx);

const uid = () => auth.currentUser!.uid;
const col = (cid: string, name: string) => collection(db, "companies", cid, name);

export const TxInput = z.object({
  type: z.enum(["entrada", "saida", "transferencia"]),
  amountCents: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean(),
  accountId: z.string().min(1),
  toAccountId: z.string().nullable().optional(),
  category: z.string().max(40),
  description: z.string().trim().min(1, "Escreva uma descrição").max(120),
  occurrenceKey: z.string().nullable().optional(),
});
export type TxInput = z.infer<typeof TxInput>;

export async function createTx(cid: string, input: TxInput) {
  const v = TxInput.parse(input);
  if (v.type === "transferencia" && (!v.toAccountId || v.toAccountId === v.accountId)) throw new Error("Escolha contas diferentes");
  return addDoc(col(cid, "transactions"), {
    type: v.type, amountCents: v.amountCents, date: v.date, accountId: v.accountId, toAccountId: v.toAccountId ?? null,
    category: v.type === "transferencia" ? "Transferência" : v.category, description: v.description, occurrenceKey: v.occurrenceKey ?? null,
    status: v.done ? "realizado" : "previsto", paidCents: v.done ? v.amountCents : 0, paidAt: v.done ? v.date : null,
    deleted: false, createdBy: uid(), updatedBy: uid(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function updateTx(cid: string, id: string, patch: Partial<Transaction>) {
  return updateDoc(doc(db, "companies", cid, "transactions", id), { ...patch, updatedBy: uid(), updatedAt: serverTimestamp() });
}

/** Baixa total ou parcial. Quando completa o valor, vira realizado. */
export async function pay(cid: string, t: Transaction, cents: number, when: string) {
  const paid = Math.min(t.amountCents, t.paidCents + cents);
  return updateTx(cid, t.id, { paidCents: paid, paidAt: when, status: paid >= t.amountCents ? "realizado" : "previsto" });
}
export const removeTx = (cid: string, id: string) => updateTx(cid, id, { deleted: true });

export async function saveAccount(cid: string, a: Omit<Account, "id"> & { id?: string }) {
  const { id, ...rest } = a;
  if (id) return setDoc(doc(db, "companies", cid, "accounts", id), rest, { merge: true });
  return addDoc(col(cid, "accounts"), rest);
}
export async function saveRecurrence(cid: string, r: Omit<Recurrence, "id"> & { id?: string }) {
  const { id, ...rest } = r;
  if (id) return setDoc(doc(db, "companies", cid, "recurrences", id), rest, { merge: true });
  return addDoc(col(cid, "recurrences"), rest);
}
export const updateCompany = (cid: string, patch: Partial<Omit<Company, "id" | "ownerUid">>) => updateDoc(doc(db, "companies", cid), patch);

/** Onboarding: cria empresa, contas e fixas numa única escrita atômica. */
export async function createCompany(input: { name: string; bancoCents: number; carteiraCents: number; reservaCents: number; fixas: { description: string; amountCents: number; dayOfMonth: number; category: string }[]; month: string }) {
  const me = uid();
  const batch = writeBatch(db);
  const cref = doc(collection(db, "companies"));
  batch.set(cref, { name: input.name.trim(), ownerUid: me, members: [me], inviteEmails: [], marginCents: 100_000, createdAt: serverTimestamp() });
  const banco = doc(collection(cref, "accounts"));
  batch.set(banco, { name: "Banco", kind: "operacional", initialCents: input.bancoCents });
  batch.set(doc(collection(cref, "accounts")), { name: "Carteira", kind: "operacional", initialCents: input.carteiraCents });
  batch.set(doc(collection(cref, "accounts")), { name: "Guardado", kind: "reserva", initialCents: input.reservaCents, goalCents: null });
  for (const f of input.fixas) batch.set(doc(collection(cref, "recurrences")), { ...f, type: "saida", startMonth: input.month, endMonth: null, accountId: banco.id, active: true });
  batch.set(doc(db, "users", me), { companyId: cref.id }, { merge: true });
  await batch.commit();
  return cref.id;
}
