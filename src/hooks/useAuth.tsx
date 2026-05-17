import { createContext, useCallback, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  approval_status: "pending" | "approved" | "rejected";
  profile_completed: boolean;
  credits: number;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs para evitar stale closure no listener do onAuthStateChange
  const userRef = useRef<User | null>(null);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
  }, [user, profile]);

  const getProfilePayload = (currentUser: User) => ({
    id: currentUser.id,
    email: currentUser.email ?? "",
    full_name:
      (currentUser.user_metadata?.full_name as string | undefined) ??
      (currentUser.user_metadata?.name as string | undefined) ??
      currentUser.email ??
      null,
    approval_status: "pending" as const,
    profile_completed: false,
  });

  const loadProfileAndRole = useCallback(async (currentUser: User) => {
    // 1) Tenta carregar perfil + role existentes (com pequenos retries para vencer
    // condições de corrida do auth.uid() logo após restaurar a sessão).
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, approval_status, profile_completed, credits, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();
      return { data, error };
    };

    let existingProfile: Profile | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await fetchProfile();
      if (data) {
        existingProfile = data as Profile;
        break;
      }
      if (error) {
        // backoff curto antes de tentar de novo
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        continue;
      }
      // sem erro e sem dado: realmente não existe — para de tentar
      break;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("role", "admin")
      .maybeSingle();

    let profileData: Profile | null = existingProfile;

    // 2) Só cria um perfil novo se confirmado que não existe. Usa upsert com
    // ignoreDuplicates para nunca sobrescrever dados existentes (ex.: perfil
    // já tem profile_completed=true mas SELECT falhou temporariamente).
    if (!profileData) {
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(getProfilePayload(currentUser), {
          onConflict: "id",
          ignoreDuplicates: true,
        });

      if (upsertError) {
        console.error("[useAuth] upsert profile error:", upsertError);
      }

      // Sempre re-busca o estado canônico — se a linha já existia, queremos os
      // dados reais (profile_completed=true, etc.), não o payload novo.
      const { data: refetched } = await fetchProfile();
      profileData = (refetched as Profile | null) ?? null;
    }

    setProfile(profileData);
    setIsAdmin(!!roleData);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      const isSameUser = userRef.current && newSession?.user && userRef.current.id === newSession.user.id;
      const hasProfile = !!profileRef.current;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        // Só define loading=true se for um login novo, se o usuário mudou,
        // ou se ainda não tivermos o perfil carregado.
        // Se for apenas uma revalidação/atualização de token do mesmo usuário,
        // carregamos no background mantendo loading=false para evitar piscar/recarregar a tela.
        const shouldShowLoader = !isSameUser || !hasProfile;
        
        if (shouldShowLoader) {
          setLoading(true);
        }
        
        setTimeout(() => {
          if (!mounted) return;
          loadProfileAndRole(newSession.user).finally(() => {
            if (mounted) setLoading(false);
          });
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Checa sessão existente
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        loadProfileAndRole(existingSession.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileAndRole]);


  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
