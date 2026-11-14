"use client";
import { createContext, useContext, useState } from "react";
import { Sheet } from "./ui/sheet";
import { Segmented } from "./ui/segmented";
import { Button } from "./ui/button";
import { Field, Input, Select } from "./ui/input";
import { createTx, useData } from "@/lib/data";
import { parseBRL } from "@/lib/domain/money";
import { addDays, todayISO } from "@/lib/domain/dates";
import { RETIRADA } from "@/lib/domain/types";
import { useSession } from "@/lib/firebase/session";
import { cn } from "@/lib/utils";

export const CATEGORIAS = {
  saida: ["Materiais", "Fornecedor", "Aluguel", "Contas da casa/loja", "Impostos", "Transporte", "Marketing", RETIRADA, "Outros"],
  entrada: ["Vendas", "Serviços", "Outros"],
};

const Ctx = createContext<(type?: "entrada" | "saida") => void>(() => {});
export const useNewTx = () => useContext(Ctx);

export function NewTxProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<"entrada" | "saida">("saida");
  return (
    <Ctx.Provider value={(t = "saida") => { setInitial(t); setOpen(true); }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen} title="Novo lançamento">
        {open && <NewTxForm initial={initial} onDone={() => setOpen(false)} />}
      </Sheet>
    </Ctx.Provider>
  );
}

function NewTxForm({ initial, onDone }: { initial: "entrada" | "saida"; onDone: () => void }) {
  const { companyId } = useSession();
  const { accounts } = useData();
  const today = todayISO();
  const ops = accounts.filter((a) => a.kind === "operacional");
  const [type, setType] = useState<"entrada" | "saida" | "transferencia">(initial);
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIAS[initial][0]);
  const [when, setWhen] = useState<"hoje" | "amanha" | "outra">("hoje");
  const [date, setDate] = useState(today);
  const [done, setDone] = useState(true);
  const [accountId, setAccountId] = useState(ops[0]?.id ?? accounts[0]?.id ?? "");
  const [toAccountId, setTo] = useState(accounts.find((a) => a.kind === "reserva")?.id ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const realDate = when === "hoje" ? today : when === "amanha" ? addDays(today, 1) : date;
  const future = realDate > today;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseBRL(value);
    if (!cents) return setError("Digite um valor, por exemplo 120,00");
    setSaving(true); setError("");
    try {
      await createTx(companyId!, { type, amountCents: cents, date: realDate, done: future ? false : done, accountId, toAccountId: type === "transferencia" ? toAccountId : null, category, description: description || (type === "transferencia" ? "Transferência" : category) });
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar. Tente de novo."); setSaving(false); }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Segmented label="Tipo" value={type} onChange={(t) => { setType(t); if (t !== "transferencia") setCategory(CATEGORIAS[t][0]); }}
        options={[{ value: "saida", label: "Saiu" }, { value: "entrada", label: "Entrou" }, { value: "transferencia", label: "Transferir" }]} className="w-full" />
      <label className="text-center">
        <span className="text-[13px] text-muted">Valor</span>
        <div className="flex items-baseline justify-center gap-1"><span className="text-2xl text-muted">R$</span>
          <input autoFocus inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ""))}
            className={cn("w-48 bg-transparent text-center text-4xl font-semibold tracking-tight outline-none placeholder:text-border-strong", type === "entrada" && "text-positive")} />
        </div>
      </label>
      <Field label="Descrição"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === "entrada" ? "Ex.: Venda para Bia" : "Ex.: Material de embalagem"} maxLength={120} /></Field>
      {type !== "transferencia" ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoria">
          {CATEGORIAS[type].map((c) => (
            <button key={c} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)}
              className={cn("min-h-9 rounded-full border px-3 text-[13px] cursor-pointer", category === c ? "border-primary bg-accent font-medium" : "border-border-strong")}>{c}</button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="De"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label="Para"><Select value={toAccountId} onChange={(e) => setTo(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Data" value={when} onChange={setWhen} options={[{ value: "hoje", label: "Hoje" }, { value: "amanha", label: "Amanhã" }, { value: "outra", label: "Outra data" }]} />
        {when === "outra" && <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-auto" aria-label="Data" />}
        {type !== "transferencia" && (
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="ml-auto h-9 w-auto" aria-label="Conta">
            {ops.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        )}
      </div>
      {!future && (
        <label className="flex items-center justify-between text-sm">
          {type === "entrada" ? "Já recebi" : type === "saida" ? "Já paguei" : "Já transferi"}
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="size-5 accent-[var(--primary)]" />
        </label>
      )}
      {future && <p className="text-xs text-muted">Data futura: fica como previsto e entra na previsibilidade, não no saldo.</p>}
      {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      <Button size="lg" disabled={saving}>{saving ? "Salvando..." : type === "entrada" ? "Salvar entrada" : type === "saida" ? "Salvar saída" : "Salvar transferência"}</Button>
    </form>
  );
}
