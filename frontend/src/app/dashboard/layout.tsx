"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../providers";
import { 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  Network
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { label: "Documents", href: "/dashboard", icon: FileText },
    { label: "Chats", href: "/dashboard/chats", icon: MessageSquare },
    { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
  ];

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 p-3 bg-primary hover:opacity-90 text-white rounded-full shadow-lg transition-opacity duration-200"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-card border-r border-border transition-all duration-300 flex flex-col justify-between
        ${sidebarWidth}
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        md:relative
      `}>
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link href="/dashboard" className="flex items-center space-x-2.5 overflow-hidden">
              <div className="p-1.5 bg-gradient-to-br from-primary to-accent text-white rounded-lg shrink-0 shadow-md shadow-primary/25">
                <Network className="w-4 h-4" />
              </div>
              {!collapsed && (
                <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent truncate">
                  SmartDoc <span className="text-accent font-black">AI</span>
                </span>
              )}
            </Link>
            
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:block p-1 hover:bg-accent border border-border rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 group
                    ${active 
                      ? "bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/30 text-foreground shadow-sm shadow-primary/5" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"}
                  `}
                >
                  <item.icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-xs text-foreground uppercase shrink-0">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{user?.full_name || "Workspace User"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user?.email || "user@smartdocai.com"}</div>
                </div>
              )}
            </div>
            
            {!collapsed && (
              <button 
                onClick={logout}
                title="Log Out"
                className="p-1.5 hover:bg-accent border border-border rounded text-muted-foreground hover:text-red-500 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto relative bg-background text-foreground">
        <div className="absolute inset-0 pointer-events-none overflow-hidden aurora-bg z-0" />

        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
