"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

interface AuthContextType {
  user: any | null;
  loading: boolean;
  logout: () => void;
  loginUser: (token: string, userData: any) => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  loginUser: () => {},
  refetchUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {

    const savedTheme = localStorage.getItem("smartdoc_theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    
    refetchUser();
  }, []);

  const refetchUser = async () => {
    setLoading(true);
    const token = localStorage.getItem("smartdoc_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      if (pathname?.startsWith("/dashboard")) {
        router.push("/login");
      }
      return;
    }
    
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (e) {
      console.warn("Token validation failed, logging out", e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginUser = (token: string, userData: any) => {
    localStorage.setItem("smartdoc_token", token);
    setUser(userData);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("smartdoc_token");
    setUser(null);
    router.push("/login");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("smartdoc_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  useEffect(() => {
    if (!loading) {
      if (!user && pathname?.startsWith("/dashboard")) {
        router.push("/login");
      } else if (user && (pathname === "/login" || pathname === "/signup")) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, pathname]);

  const showProtectedLoading = loading && pathname?.startsWith("/dashboard");
  const isUnauthenticatedProtected = !loading && !user && pathname?.startsWith("/dashboard");

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <AuthContext.Provider value={{ user, loading, logout, loginUser, refetchUser }}>
          {showProtectedLoading || isUnauthenticatedProtected ? (
            <div className="min-h-screen bg-[#040309] text-[#fafafa] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none overflow-hidden aurora-bg z-0" />
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-sm font-semibold tracking-wide text-zinc-400 animate-pulse font-mono">Verifying credentials...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
