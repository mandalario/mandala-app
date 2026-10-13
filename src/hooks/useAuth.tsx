import { createContext, useCallback, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  type AdminArea,
  canAccessAdminArea,
  isSuperAdminEmail,
} from "@/lib/adminPermissions";
import { isGuestUser } from "@/lib/guestChat";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  approval_status: "pending" | "approved" | "rejected";
  profile_completed: boolean;
  credits: number;
  credits_grupo: number;
  credits_particular: number;
  credits_aluguel: number;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isGuest: boolean;
  isAdmin: boolean;
  /** null = acesso total (admin legado ou super admin) */
  adminAreas: AdminArea[] | null;
  isSuperAdmin: boolean;
  hasAdminArea: (area: AdminArea) => boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (customUser?: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAreas, setAdminAreas] = useState<AdminArea[] | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
    if (isGuestUser(currentUser)) {
      setProfile(null);
      setIsAdmin(false);
      setAdminAreas(null);
      setIsSuperAdmin(false);
      return;
    }

    // 1) Tenta carregar perfil + role existentes (com pequenos retries para vencer
    // condições de corrida do auth.uid() logo após restaurar a sessão).
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, approval_status, profile_completed, credits, credits_grupo, credits_particular, credits_aluguel, avatar_url")
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

    const email = existingProfile?.email ?? currentUser.email ?? "";
    const superAdmin = isSuperAdminEmail(email);
    setIsSuperAdmin(superAdmin);

    let areas: AdminArea[] | null = null;
    if (roleData && !superAdmin) {
      const { data: permRows } = await supabase
        .from("admin_permissions")
        .select("area")
        .eq("user_id", currentUser.id);
      if (permRows && permRows.length > 0) {
        areas = permRows.map((r) => r.area);
      }
    }
    setAdminAreas(areas);

    let profileData: Profile | null = existingProfile;

    // 2) Só cria perfil em conta recém-criada (corrida com handle_new_user).
    // Contas antigas sem perfil foram excluídas — não recriar cadastro pendente.
    if (!profileData) {
      const createdAt = new Date(currentUser.created_at).getTime();
      const isNewAccount = Date.now() - createdAt < 120_000;

      if (isNewAccount) {
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(getProfilePayload(currentUser), {
            onConflict: "id",
            ignoreDuplicates: true,
          });

        if (upsertError) {
          console.error("[useAuth] upsert profile error:", upsertError);
        }

        const { data: refetched } = await fetchProfile();
        profileData = (refetched as Profile | null) ?? null;
      } else {
        console.warn("[useAuth] profile missing for existing user — signing out");
        await supabase.auth.signOut();
        setProfile(null);
        setIsAdmin(false);
        setAdminAreas(null);
        setIsSuperAdmin(false);
        return;
      }
    }

    setProfile(profileData);
    setIsAdmin(!!roleData);
  }, []);

  const hasAdminArea = useCallback(
    (area: AdminArea) => {
      if (!isAdmin) return false;
      return canAccessAdminArea(area, isSuperAdmin, adminAreas);
    },
    [isAdmin, isSuperAdmin, adminAreas],
  );

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
        setAdminAreas(null);
        setIsSuperAdmin(false);
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
    setAdminAreas(null);
    setIsSuperAdmin(false);
  };

  const refreshProfile = async (customUser?: User) => {
    const target = customUser || userRef.current || (await supabase.auth.getUser()).data.user;
    if (target) {
      setUser(target);
      await loadProfileAndRole(target);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isGuest: isGuestUser(user),
        isAdmin,
        adminAreas,
        isSuperAdmin,
        hasAdminArea,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
