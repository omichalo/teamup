"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { USER_ROLES } from "@/lib/auth/roles";

// Stub minimal pour compatibilité avec l'ancien code
// Le nouveau système utilise les cookies HTTP-only côté serveur
export const useAuth = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/session/verify");
      if (res.ok) {
        const data = await res.json();
        setUser(data?.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const signOut = async () => {
    await fetch("/api/session", { method: "DELETE", credentials: "include" });
    setUser(null);
    router.push("/login");
  };

  const refreshUser = async () => {
    setLoading(true);
    await fetchUser();
  };

  return {
    user,
    firebaseUser: user,
    loading,
    signOut,
    signIn: async () => ({ success: false, error: "Use /login page" }),
    signUp: async () => ({ success: false, error: "Use /signup page" }),
    isAdmin: user?.role === USER_ROLES.ADMIN,
    isSecretary: user?.role === USER_ROLES.SECRETARY,
    isCoach:
      user?.role === USER_ROLES.COACH || user?.role === USER_ROLES.ADMIN,
    isPlayer: user?.role === USER_ROLES.PLAYER,
    refreshUser,
    sendEmailVerification: async () => {},
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
