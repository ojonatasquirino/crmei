"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useSession } from "@/lib/firebase/session";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Logo, LogoMark } from "@/components/logo";

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
    <div className="grid min-h-dvh bg-[linear-gradient(150deg,#3E8E3C_0%,#1C5233_30%,#0E2E1D_60%,#050F0A_100%)] md:grid-cols-2">
      <section className="hidden flex-col justify-between p-14 text-white md:flex">
        <Logo inverted />
        <div className="max-w-md rounded-3xl bg-[#0B2416]/55 p-8 backdrop-blur-sm">
          <LogoMark className="mb-6 size-16 text-[#CDEFB0]" />
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Entenda o dinheiro do seu negócio em um minuto por dia.</h2>
          <p className="mt-4 text-base leading-relaxed text-white/85">Quanto você tem, quanto pode usar e se vai faltar nos próximos 90 dias. Feito para MEI e pequenos negócios.</p>
        </div>
        <p className="text-xs text-white/80">Seus dados ficam separados e protegidos.</p>
      </section>
      <section className="grid place-items-center p-6">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border bg-surface p-7 shadow-2xl">
          <div className="md:hidden"><Logo /></div>
          <h1 className="text-[28px] font-semibold tracking-tight">Entrar</h1>
          <p className="-mt-2 text-sm text-muted">Use sua conta Google ou receba um link no e-mail.</p>
          <Button variant="outline" size="lg" onClick={google}><svg viewBox="0 0 48 48" className="size-5" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>Continuar com Google</Button>
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
