"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { api } from "@/lib/api";
import { KeyRound, Mail, Network, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { loginUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const data = await api.login(email, password);
      const userProfile = await api.getMe();
      loginUser(data.access_token, userProfile);
    } catch (err: any) {
      console.warn("Failed to login:", err);
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0816] text-[#fafafa] flex items-center justify-center px-4 relative overflow-hidden aurora-bg">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md bg-[#0b0816]/40 border border-primary/15 backdrop-blur-md p-8 rounded-3xl relative shadow-2xl shadow-black/20">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center space-x-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg text-white shadow-md shadow-primary/25">
              <Network className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              SmartDoc <span className="text-accent font-black">AI</span>
            </span>
          </Link>
          <h2 className="text-lg font-bold">Welcome Back</h2>
          <p className="text-xs text-zinc-500 mt-1">Sign in to your document workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Gmail"
                className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-primary rounded-xl px-4 py-2.5 pl-10 text-sm outline-none transition"
              />
              <Mail className="w-4 h-4 text-zinc-600 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-primary rounded-xl px-4 py-2.5 pl-10 text-sm outline-none transition"
              />
              <KeyRound className="w-4 h-4 text-zinc-600 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-primary to-accent hover:opacity-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-[1.02] shadow-lg shadow-primary/20"
          >
            <span>{loading ? "Signing In..." : "Sign In"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
