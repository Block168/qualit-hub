import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "responsable_qualite" | "pilote" | "auditeur";

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
}

interface AuthCtx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("users_profiles")
      .select("id, full_name, role")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <Ctx.Provider value={{ session, profile, loading, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  responsable_qualite: "Responsable Qualité",
  pilote: "Pilote",
  auditeur: "Auditeur",
};

export const can = {
  manageNC: (r?: AppRole | null) => r === "admin" || r === "responsable_qualite",
  createNC: (r?: AppRole | null) => r === "admin" || r === "responsable_qualite" || r === "pilote",
  manageCAPA: (r?: AppRole | null) => r === "admin" || r === "responsable_qualite",
  createCAPA: (r?: AppRole | null) => r === "admin" || r === "responsable_qualite" || r === "pilote",
  manageAMDEC: (r?: AppRole | null) => r === "admin" || r === "responsable_qualite",
  manageKPI: (r?: AppRole | null) => r === "admin" || r === "responsable_qualite",
};
