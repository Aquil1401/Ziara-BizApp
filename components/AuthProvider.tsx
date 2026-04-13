"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabaseClient";
import { usePathname, useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    // Safety timeout: If Supabase doesn't respond in 3 seconds, stop spinning.
    // This prevents the screen from being "locked" on network/auth errors.
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("AuthProvider: getSession timeout reached. Forcing loading = false.");
        setLoading(false);
      }
    }, 4000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      clearTimeout(timeout);
    }).catch(err => {
      console.error("AuthProvider: getSession error", err);
      if (mounted) setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log("AuthProvider: Auth event", event);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // If signed in, force a redirect to dashboard immediately
      if (event === 'SIGNED_IN' && pathname === '/login') {
        router.push('/');
      }
      // If signed out, force to login
      if (event === 'SIGNED_OUT' && pathname !== '/login') {
        router.push('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [pathname, router]);

  // Client-side route guard
  useEffect(() => {
    if (loading) return;
    const isLoginPage = pathname === "/login";
    if (!user && !isLoginPage) {
      router.replace("/login");
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
