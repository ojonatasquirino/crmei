"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { arrayUnion, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db } from "./client";

interface Session { user: User | null; companyId: string | null; loading: boolean; setCompanyId: (id: string) => void }
const Ctx = createContext<Session>({ user: null, companyId: null, loading: true, setCompanyId: () => {} });

/** Descobre a empresa do usuário. Se não tiver, tenta aceitar um convite pendente para o e-mail dele. */
async function resolveCompany(user: User): Promise<string | null> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().companyId) return snap.data().companyId as string;
  if (!user.email) return null;
  const invites = await getDocs(query(collection(db, "companies"), where("inviteEmails", "array-contains", user.email)));
  const invite = invites.docs[0];
  if (!invite) return null;
  await updateDoc(invite.ref, { members: arrayUnion(user.uid), inviteEmails: [] });
  await setDoc(ref, { companyId: invite.id }, { merge: true });
  return invite.id;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<Session, "setCompanyId">>({ user: null, companyId: null, loading: true });
  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setState({ user: null, companyId: null, loading: false });
    setState((s) => ({ ...s, user, loading: true }));
    const companyId = await resolveCompany(user).catch(() => null);
    setState({ user, companyId, loading: false });
  }), []);
  return <Ctx.Provider value={{ ...state, setCompanyId: (companyId) => setState((s) => ({ ...s, companyId })) }}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);
