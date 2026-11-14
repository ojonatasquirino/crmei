"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { Home, List, LogOut, Moon, Plus, Settings, Sun, TrendingUp } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { useData } from "@/lib/data";
import { Logo } from "./logo";
import { useNewTx } from "./new-tx";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/lancamentos", label: "Lançamentos", icon: List },
  { href: "/previsibilidade", label: "Previsibilidade", icon: TrendingUp },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { company } = useData();
  const open = useNewTx();
  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col gap-1 border-r border-border bg-surface px-4 py-6 md:flex">
        <div className="px-2 pb-6"><Logo /></div>
        {NAV.map(({ href, label, icon: I }) => (
          <Link key={href} href={href} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-2", path === href && "bg-surface-2 font-medium text-foreground")}><I className="size-[18px]" />{label}</Link>
        ))}
        <div className="mt-auto border-t border-border px-2 pt-4 text-[13px]">
          <div className="font-medium">{company?.name}</div>
          <div className="mt-3 flex gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema"><Sun className="dark:hidden" /><Moon className="hidden dark:block" /></Button>
            <Button variant="ghost" size="icon" onClick={() => signOut(auth)} aria-label="Sair"><LogOut /></Button>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-5 md:px-10 md:pb-12 md:pt-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-20 items-center justify-around border-t border-border bg-surface pb-3 md:hidden">
        {NAV.slice(0, 2).map(({ href, label, icon: I }) => <MobileLink key={href} href={href} label={label} active={path === href}><I className="size-5" /></MobileLink>)}
        <button onClick={() => open()} aria-label="Lançar" className="-mt-7 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer"><Plus className="size-6" /></button>
        {NAV.slice(2).map(({ href, label, icon: I }) => <MobileLink key={href} href={href} label={label === "Previsibilidade" ? "Previsão" : label} active={path === href}><I className="size-5" /></MobileLink>)}
      </nav>
    </div>
  );
}
const MobileLink = ({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) => (
  <Link href={href} className={cn("flex min-w-14 flex-col items-center gap-0.5 text-[11px] text-muted", active && "text-foreground font-medium")}>{children}{label}</Link>
);

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      {children}
    </div>
  );
}
