"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/firebase/session";
import { CompanyDataProvider, useData } from "@/lib/data";
import { NewTxProvider } from "@/components/new-tx";
import { Shell } from "@/components/shell";

const Loading = () => <div className="grid min-h-dvh place-items-center text-sm text-muted">Carregando…</div>;

function Ready({ children }: { children: React.ReactNode }) {
  const { ready } = useData();
  return ready ? <>{children}</> : <Loading />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, companyId, loading } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!companyId) router.replace("/onboarding");
  }, [user, companyId, loading, router]);
  if (loading || !user || !companyId) return <Loading />;
  return (
    <CompanyDataProvider companyId={companyId}>
      <NewTxProvider><Shell><Ready>{children}</Ready></Shell></NewTxProvider>
    </CompanyDataProvider>
  );
}
