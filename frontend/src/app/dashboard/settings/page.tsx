"use client";

import React, { useState, useEffect } from "react";
import { useAuth, useTheme } from "../../providers";
import { 
  User as UserIcon, 
  Moon, 
  Sun, 
  Key, 
  ShieldAlert, 
  Save, 
  Loader2,
  CheckCircle
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [savingKeys, setSavingKeys] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [openaiKey, setOpenaiKey] = useState("");
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureKey, setAzureKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOpenaiKey(localStorage.getItem("smartdoc_openai_key") || "");
      setAzureEndpoint(localStorage.getItem("smartdoc_azure_endpoint") || "");
      setAzureKey(localStorage.getItem("smartdoc_azure_key") || "");
    }
  }, []);

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    setSaveSuccess(false);

    setTimeout(() => {
      localStorage.setItem("smartdoc_openai_key", openaiKey.trim());
      localStorage.setItem("smartdoc_azure_endpoint", azureEndpoint.trim());
      localStorage.setItem("smartdoc_azure_key", azureKey.trim());
      setSavingKeys(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 800);
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
      <div className="border-b border-border pb-5 mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">System Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">Configure user profile, toggle display theme, and save API credentials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-2">
          <h2 className="text-sm font-bold text-foreground">Preferences & Profile</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Manage your account status and toggle the application dark or light mode setting.
          </p>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="p-5 glass-card-premium rounded-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-sm text-foreground uppercase">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">{user?.full_name || "Workspace User"}</h3>
                <span className="text-[10px] text-muted-foreground">{user?.email || "user@smartdocai.com"}</span>
              </div>
            </div>
            
            <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Account Status</span>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold rounded-full">
                Active
              </span>
            </div>
          </div>

          <div className="p-5 glass-card-premium rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-foreground">Color Theme</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Toggle between dark mode or light mode layouts</p>
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 bg-secondary/50 hover:bg-secondary border border-border rounded-xl text-foreground transition-all duration-300 flex items-center space-x-2 text-xs hover:scale-105"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-primary" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <hr className="border-border my-8" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-2">
          <h2 className="text-sm font-bold text-foreground">API Credentials</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Provide your personal OpenAI or Azure OCR credentials. If left blank, requests will execute using host variables or fallback models.
          </p>
        </div>

        <div className="md:col-span-2">
          <form onSubmit={handleSaveKeys} className="p-5 glass-card-premium rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                <span>OpenAI API Key Override</span>
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-border text-foreground font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Azure OCR Endpoint Override</label>
              <input
                type="text"
                value={azureEndpoint}
                onChange={(e) => setAzureEndpoint(e.target.value)}
                placeholder="https://your-resource.cognitiveservices.azure.com/"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-border text-foreground font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Azure OCR Key Override</label>
              <input
                type="password"
                value={azureKey}
                onChange={(e) => setAzureKey(e.target.value)}
                placeholder="Azure resource key"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-border text-foreground font-mono"
              />
            </div>

            {saveSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-xs rounded-xl flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Credentials saved locally in browser context.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingKeys}
              className="px-4 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02]"
            >
              {savingKeys ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Credentials</span>
            </button>
          </form>
          
          <div className="mt-4 p-4 bg-secondary/50 border border-border rounded-2xl flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              API keys saved here are stored <strong>only inside your browser's localStorage</strong>. They never touch external tracking systems and are attached solely as authorization headers to your requests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
