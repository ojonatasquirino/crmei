"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createCompany } from "@/lib/data";
import { useSession } from "@/lib/firebase/session";
import { parseBRL } from "@/lib/domain/money";
import { monthOf, todayISO } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { description: "DAS MEI", category: "Impostos", day: 20 },
  { description: "Aluguel", category: "Aluguel", day: 10 },
  { description: "Energia", category: "Contas da casa/loja", day: 15 },
  { description: "Internet e celular", category: "Contas da casa/loja", day: 15 },
  { description: "Retirada pessoal (pró-labore)", category: "Retirada pessoal", day: 5 },
];

export default function Onboarding() {
  const { user, companyId, loading, setCompanyId } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [money, setMoney] = useState({ banco: "", carteira: "", reserva: "" });
  const [fixas, setFixas] = useState<Record<string, { on: boolean; value: string; day: string }>>(Object.fromEntries(TEMPLATES.map((t) => [t.description, { on: false, value: "", day: String(t.day) }])));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/login"); if (!loading && companyId) router.replace("/"); }, [loading, user, companyId, router]);

  async function finish() {
    const c = (s: string) => (s.trim() ? parseBRL(s) : 0);
    const banco = c(money.banco), carteira = c(money.carteira), reserva = c(money.reserva);
    if (banco === null || carteira === null || reserva === null) { setStep(2); return setError("Algum valor está inválido. Use o formato 1.250,00"); }
    const chosen = TEMPLATES.filter((t) => fixas[t.description].on).map((t) => ({ description: t.description, category: t.category, amountCents: parseBRL(fixas[t.description].value) ?? 0, dayOfMonth: Math.min(31, Math.max(1, Number(fixas[t.description].day) || t.day)) }));
    if (chosen.some((f) => !f.amountCents)) return setError("Preencha o valor de cada conta fixa marcada");
    setSaving(true); setError("");
    try { const id = await createCompany({ name, bancoCents: banco, carteiraCents: carteira, reservaCents: reserva, fixas: chosen, month: monthOf(todayISO()) }); setCompanyId(id); router.replace("/"); }
    catch { setSaving(false); setError("Não foi possível criar sua conta. Tente de novo."); }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6 pt-10">
      <Logo />
      <div className="flex gap-1.5" aria-label={`Passo ${step} de 3`}>{[1, 2, 3].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-border")} />)}</div>
      {step === 1 && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep(2); }}>
          <h1 className="text-2xl font-semibold tracking-tight">Como se chama seu negócio?</h1>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ateliê da Ana" maxLength={80} className="h-12" />
          <Button size="lg" disabled={!name.trim()}>Continuar</Button>
        </form>
      )}
      {step === 2 && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(""); setStep(3); }}>
          <div><h1 className="text-2xl font-semibold tracking-tight">Quanto você tem hoje?</h1><p className="mt-1 text-sm text-muted">Só o dinheiro do negócio. Deixe em branco o que não tiver.</p></div>
          <Field label="No banco"><Input autoFocus inputMode="decimal" placeholder="0,00" value={money.banco} onChange={(e) => setMoney({ ...money, banco: e.target.value })} className="h-12" /></Field>
          <Field label="Em dinheiro (carteira/caixa)"><Input inputMode="decimal" placeholder="0,00" value={money.carteira} onChange={(e) => setMoney({ ...money, carteira: e.target.value })} className="h-12" /></Field>
          <Field label="Guardado (reserva, não conta no dia a dia)"><Input inputMode="decimal" placeholder="0,00" value={money.reserva} onChange={(e) => setMoney({ ...money, reserva: e.target.value })} className="h-12" /></Field>
          <Button size="lg">Continuar</Button>
        </form>
      )}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div><h1 className="text-2xl font-semibold tracking-tight">Quais contas você paga todo mês?</h1><p className="mt-1 text-sm text-muted">Marque e coloque o valor. Elas entram sozinhas na previsão.</p></div>
          {TEMPLATES.map((t) => { const f = fixas[t.description]; return (
            <div key={t.description} className={cn("rounded-xl border p-3", f.on ? "border-primary bg-highlight" : "border-border-strong")}>
              <button type="button" onClick={() => setFixas({ ...fixas, [t.description]: { ...f, on: !f.on } })} aria-pressed={f.on} className="flex w-full items-center gap-3 text-left text-sm font-medium cursor-pointer">
                <span className={cn("grid size-5 place-items-center rounded-md border", f.on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong")}>{f.on && <Check className="size-3.5" />}</span>{t.description}
              </button>
              {f.on && <div className="mt-3 grid grid-cols-[1fr_88px] gap-2">
                <Input inputMode="decimal" placeholder="Valor" aria-label={`Valor de ${t.description}`} value={f.value} onChange={(e) => setFixas({ ...fixas, [t.description]: { ...f, value: e.target.value } })} />
                <Input type="number" min={1} max={31} aria-label="Dia do vencimento" value={f.day} onChange={(e) => setFixas({ ...fixas, [t.description]: { ...f, day: e.target.value } })} />
              </div>}
            </div>); })}
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
          <Button size="lg" onClick={finish} disabled={saving}>{saving ? "Criando..." : "Ver meu painel"}</Button>
          <button className="text-sm text-muted underline cursor-pointer" onClick={() => setStep(2)}>Voltar</button>
        </div>
      )}
    </div>
  );
}
