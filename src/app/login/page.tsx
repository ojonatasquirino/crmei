"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useSession } from "@/lib/firebase/session";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";

export default function Login() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => { if (!loading && user) router.replace("/"); }, [user, loading, router]);

  // Volta do link mágico enviado por e-mail.
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    const saved = window.localStorage.getItem("crmei:email") ?? window.prompt("Confirme seu e-mail para entrar") ?? "";
    signInWithEmailLink(auth, saved, window.location.href).then(() => window.localStorage.removeItem("crmei:email")).catch(() => { setState("error"); setError("Esse link expirou ou já foi usado. Peça um novo."); });
  }, []);

  async function google() {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch { setState("error"); setError("Não foi possível entrar com o Google. Tente de novo."); }
  }
  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await sendSignInLinkToEmail(auth, email.trim(), { url: `${window.location.origin}/login`, handleCodeInApp: true });
      window.localStorage.setItem("crmei:email", email.trim());
      setState("sent");
    } catch { setState("error"); setError("Não conseguimos enviar o link. Confira o e-mail e tente de novo."); }
  }

  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-border bg-surface p-14 md:flex">
        <Logo />
        <div className="max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Entenda o dinheiro do seu negócio em um minuto por dia.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted">Quanto você tem, quanto pode usar e se vai faltar nos próximos 90 dias. Feito para MEI e pequenos negócios.</p>
        </div>
        <p className="text-xs text-muted">Seus dados ficam separados e protegidos.</p>
      </section>
      <section className="grid place-items-center p-6">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <div className="md:hidden"><Logo /></div>
          <h1 className="text-[28px] font-semibold tracking-tight">Entrar</h1>
          <p className="-mt-2 text-sm text-muted">Use sua conta Google ou receba um link no e-mail.</p>
          <Button variant="outline" size="lg" onClick={google}>Continuar com Google</Button>
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
          {state === "sent" ? (
            <div role="status" className="rounded-xl bg-accent p-4 text-sm">Enviamos um link para <strong>{email}</strong>. Abra o e-mail neste aparelho para entrar.</div>
          ) : (
            <form onSubmit={sendLink} className="flex flex-col gap-3">
              <Field label="E-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@seunegocio.com.br" className="h-12" /></Field>
              <Button size="lg" disabled={state === "sending"}>{state === "sending" ? "Enviando..." : "Receber link de acesso"}</Button>
            </form>
          )}
          {error && <p role="alert" className="text-sm text-negative">{error}</p>}
          <p className="text-center text-xs text-muted">Sem senha para lembrar. Primeira vez? A conta é criada automaticamente.</p>
        </div>
      </section>
    </div>
  );
}
