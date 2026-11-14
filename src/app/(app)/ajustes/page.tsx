"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { saveAccount, saveRecurrence, updateCompany, useData } from "@/lib/data";
import { useSession } from "@/lib/firebase/session";
import { formatBRL, parseBRL } from "@/lib/domain/money";
import { monthOf, todayISO } from "@/lib/domain/dates";
import { Card, CardTitle, Label } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, toggleTheme } from "@/components/shell";
import { CATEGORIAS } from "@/components/new-tx";

export default function Ajustes() {
  const { company, accounts, recs } = useData();
  const { companyId, user } = useSession();
  const cid = companyId!;
  const [msg, setMsg] = useState("");
  const done = (p: Promise<unknown>, ok = "Salvo") => p.then(() => setMsg(ok)).catch(() => setMsg("Não foi possível salvar. Tente de novo."));
  const owner = company?.ownerUid === user?.uid;

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Empresa, contas, fixas mensais e quem usa o app" />
      {msg && <p role="status" className="mb-4 text-sm text-positive">{msg}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Empresa</CardTitle>
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const m = parseBRL(String(fd.get("margin")));
            if (m === null) return setMsg("Margem inválida"); done(updateCompany(cid, { name: String(fd.get("name")).trim(), marginCents: m })); }}>
            <Field label="Nome do negócio"><Input name="name" defaultValue={company?.name} maxLength={80} disabled={!owner} /></Field>
            <Field label="Margem de segurança (o mínimo que quero sempre ter)"><Input name="margin" inputMode="decimal" defaultValue={((company?.marginCents ?? 0) / 100).toFixed(2).replace(".", ",")} disabled={!owner} /></Field>
            <div className="flex gap-2">{owner && <Button>Salvar</Button>}<Button type="button" variant="outline" onClick={toggleTheme}>Alternar modo claro/escuro</Button></div>
          </form>
        </Card>

        <Card>
          <CardTitle className="mb-1">Quem usa</CardTitle>
          <Label className="mb-4">Até 2 pessoas por negócio, com acesso total.</Label>
          <p className="text-sm">{company?.members.length} de 2 pessoas</p>
          {company?.inviteEmails?.[0] && <p className="mt-2 text-sm">Convite pendente para <strong>{company.inviteEmails[0]}</strong>. Ela entra com esse e-mail e já cai aqui.</p>}
          {owner && (company?.members.length ?? 0) < 2 && (
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); const email = String(new FormData(e.currentTarget).get("email")).trim().toLowerCase();
              if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("E-mail inválido"); done(updateCompany(cid, { inviteEmails: [email] }), "Convite criado"); }}>
              <Input name="email" type="email" placeholder="email@da.pessoa" aria-label="E-mail para convidar" />
              <Button className="h-11">Convidar</Button>
            </form>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-1">Contas</CardTitle>
          <Label className="mb-2">O saldo inicial é quanto tinha quando começou a usar o CRMEI.</Label>
          {accounts.map((a) => (
            <form key={a.id} className="grid grid-cols-[1fr_auto] items-end gap-2 border-t border-border py-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget);
              const ini = parseBRL(String(fd.get("ini"))); const goal = fd.get("goal") ? parseBRL(String(fd.get("goal"))) : null;
              if (ini === null) return setMsg("Valor inválido"); done(saveAccount(cid, { ...a, name: String(fd.get("name")).trim(), initialCents: ini, goalCents: goal })); }}>
              <Field label={a.kind === "reserva" ? "Guardado (reserva)" : "Conta"}><Input name="name" defaultValue={a.name} maxLength={40} /></Field>
              <Field label="Saldo inicial"><Input name="ini" inputMode="decimal" defaultValue={(a.initialCents / 100).toFixed(2).replace(".", ",")} /></Field>
              {a.kind === "reserva" ? <Field label="Meta"><Input name="goal" inputMode="decimal" placeholder="Ex.: 5.000,00" defaultValue={a.goalCents ? (a.goalCents / 100).toFixed(2).replace(".", ",") : ""} /></Field> : <div className="hidden sm:block" />}
              <Button variant="outline" className="h-11">Salvar</Button>
            </form>
          ))}
          <Button variant="ghost" className="mt-2" onClick={() => done(saveAccount(cid, { name: "Nova conta", kind: "operacional", initialCents: 0 }), "Conta criada")}><Plus />Adicionar conta</Button>
        </Card>

        <Card>
          <CardTitle className="mb-1">Fixas mensais</CardTitle>
          <Label className="mb-2">Aparecem sozinhas todo mês na previsibilidade. Você só marca como feito.</Label>
          {recs.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-t border-border py-3 text-sm">
              <div className="flex-1"><div className="font-medium">{r.description}</div><div className="text-xs text-muted">Todo dia {r.dayOfMonth} · {r.category}</div></div>
              {!r.active && <Badge>Pausada</Badge>}
              <span className="font-semibold">{formatBRL(r.amountCents)}</span>
              <Button variant="ghost" size="sm" onClick={() => done(saveRecurrence(cid, { ...r, active: !r.active }))}>{r.active ? "Pausar" : "Retomar"}</Button>
            </div>
          ))}
          <NewRecurrence onSave={(r) => done(saveRecurrence(cid, { ...r, type: r.type, startMonth: monthOf(todayISO()), endMonth: null, accountId: accounts.find((a) => a.kind === "operacional")!.id, active: true }), "Fixa criada")} />
        </Card>
      </div>
    </>
  );
}

function NewRecurrence({ onSave }: { onSave: (r: { type: "entrada" | "saida"; description: string; amountCents: number; dayOfMonth: number; category: string }) => void }) {
  const [err, setErr] = useState("");
  return (
    <form className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-[1.5fr_1fr_0.6fr_1fr]" onSubmit={(e) => {
      e.preventDefault(); const fd = new FormData(e.currentTarget); const c = parseBRL(String(fd.get("v"))); const d = Number(fd.get("d"));
      const description = String(fd.get("desc")).trim();
      if (!description || !c || !(d >= 1 && d <= 31)) return setErr("Preencha descrição, valor e dia (1 a 31)");
      setErr(""); onSave({ type: "saida", description, amountCents: c, dayOfMonth: d, category: String(fd.get("cat")) }); e.currentTarget.reset(); }}>
      <Input name="desc" placeholder="Ex.: Aluguel" aria-label="Descrição" className="col-span-2 sm:col-span-1" />
      <Input name="v" inputMode="decimal" placeholder="Valor" aria-label="Valor" />
      <Input name="d" type="number" min={1} max={31} placeholder="Dia" aria-label="Dia do mês" />
      <Select name="cat" aria-label="Categoria">{CATEGORIAS.saida.map((c) => <option key={c}>{c}</option>)}</Select>
      <Button variant="soft" className="col-span-2 sm:col-span-4"><Plus />Adicionar fixa</Button>
      {err && <p role="alert" className="col-span-2 text-sm text-negative sm:col-span-4">{err}</p>}
    </form>
  );
}
