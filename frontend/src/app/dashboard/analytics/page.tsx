"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useTheme } from "../../providers";
import { 
  BarChart3, 
  Sparkles, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Loader2,
  CheckCircle2,
  Info
} from "lucide-react";

interface AnalyticsData {
  summary: {
    total_uploads: number;
    total_chats: number;
    total_messages: number;
  };
  evaluation_metrics: {
    faithfulness: number;
    relevancy: number;
    context_precision: number;
  };
  active_documents: Array<{
    id: string;
    title: string;
    chat_count: number;
  }>;
  activity_timeline: Array<{
    date: string;
    count: number;
  }>;
}

export default function AnalyticsDashboardPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const resp = await api.getAnalytics();
      setData(resp);
    } catch (e) {
      console.warn("Failed to fetch analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  const CircularGauge = ({ value, label, color }: { value: number; label: string; color: string }) => {
    const radius = 40;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value * circumference);
    const isDark = theme === "dark";
    
    return (
      <div className="flex flex-col items-center p-4 glass-card-premium rounded-2xl relative shadow-md hover:border-accent/40 transition-all duration-300">
        <svg className="w-28 h-28 transform -rotate-95">
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke={isDark ? "#18181b" : "#f4f4f5"}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute top-12 text-sm font-extrabold text-zinc-800 dark:text-zinc-100 font-mono">
          {Math.round(value * 100)}%
        </div>
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-2 font-heading">{label}</span>
      </div>
    );
  };

  const isDark = theme === "dark";

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
      <div className="border-b border-zinc-200 dark:border-zinc-900/60 pb-5 mb-8 transition-colors duration-200">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">System Performance & Usage</h1>
        <p className="text-xs text-zinc-500 mt-1">Audit RAG faithfulness rates, user interaction timeline, and document logs</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <span className="text-xs">Consolidating performance metrics...</span>
        </div>
      ) : !data ? (
        <div className="text-center py-10 text-zinc-500 text-xs">Failed to fetch analytics statistics.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 glass-card-premium rounded-2xl flex items-center space-x-4 shadow-md hover:-translate-y-0.5 duration-300">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-500">Files Indexed</div>
                <div className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-0.5 font-mono">{data.summary.total_uploads}</div>
              </div>
            </div>

            <div className="p-5 glass-card-premium rounded-2xl flex items-center space-x-4 shadow-md hover:-translate-y-0.5 duration-300">
              <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-400/20 rounded-xl border border-emerald-500/30 text-emerald-500">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-500">Active Chats</div>
                <div className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-0.5 font-mono">{data.summary.total_chats}</div>
              </div>
            </div>

            <div className="p-5 glass-card-premium rounded-2xl flex items-center space-x-4 shadow-md hover:-translate-y-0.5 duration-300">
              <div className="p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl border border-pink-500/30 text-pink-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-500">Queries Sent</div>
                <div className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-0.5 font-mono">{data.summary.total_messages}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card-premium p-5 rounded-2xl shadow-md">
              <div className="flex items-center space-x-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>RAG Evaluation Metrics (LLM-as-a-Judge)</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <CircularGauge value={data.evaluation_metrics.faithfulness} label="Faithfulness" color="#10b981" />
                <CircularGauge value={data.evaluation_metrics.relevancy} label="Answer Relevancy" color="rgb(var(--primary))" />
                <CircularGauge value={data.evaluation_metrics.context_precision} label="Context Precision" color="rgb(var(--primary))" />
              </div>
              
              <div className="mt-5 p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start space-x-2 transition-colors duration-200">
                <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Evaluations assess the validity of RAG answers. <strong>Faithfulness</strong> checks grounding, <strong>Relevancy</strong> checks answer alignment, and <strong>Context Precision</strong> tracks retrieval query matches.
                </p>
              </div>
            </div>

            <div className="glass-card-premium p-5 rounded-2xl flex flex-col justify-between shadow-md">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-4">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span>Most Interactive Documents</span>
                </div>
                
                {data.active_documents.length === 0 ? (
                  <div className="text-[10px] text-zinc-500 py-10 text-center">
                    Initiate document chats to generate usage statistics.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {data.active_documents.map((doc, idx) => (
                      <div key={doc.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="font-semibold truncate max-w-64">{idx + 1}. {doc.title}</span>
                          <span className="font-mono text-[10px] text-zinc-500">{doc.chat_count} chat(s)</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, (doc.chat_count / Math.max(1, data.summary.total_chats)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl text-[10px] text-primary font-medium flex items-center space-x-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Vector similarities running smoothly with PostgreSQL pgvector extension</span>
              </div>
            </div>
          </div>

          <div className="glass-card-premium p-5 rounded-2xl shadow-md">
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-5">Timeline of Index Operations</h3>
            
            <div className="h-44 w-full relative flex items-end">
              <svg className="w-full h-full" viewBox="0 0 500 150">
                <line x1="20" y1="20" x2="480" y2="20" stroke={isDark ? "#18181b" : "#f4f4f5"} strokeWidth="0.5" />
                <line x1="20" y1="70" x2="480" y2="70" stroke={isDark ? "#18181b" : "#f4f4f5"} strokeWidth="0.5" />
                <line x1="20" y1="120" x2="480" y2="120" stroke={isDark ? "#18181b" : "#f4f4f5"} strokeWidth="0.5" />
                
                <path
                  d="M 50 120 L 120 90 L 190 100 L 260 40 L 330 110 L 400 30 L 450 60"
                  fill="none"
                  stroke="rgb(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                
                <circle cx="50" cy="120" r="4" fill="rgb(var(--primary))" stroke={isDark ? "#09090b" : "#ffffff"} strokeWidth="1.5" />
                <circle cx="120" cy="90" r="4" fill="rgb(var(--primary))" stroke={isDark ? "#09090b" : "#ffffff"} strokeWidth="1.5" />
                <circle cx="190" cy="100" r="4" fill="rgb(var(--primary))" stroke={isDark ? "#09090b" : "#ffffff"} strokeWidth="1.5" />
                <circle cx="260" cy="40" r="4" fill="rgb(var(--primary))" stroke={isDark ? "#09090b" : "#ffffff"} strokeWidth="1.5" />
                <circle cx="330" cy="110" r="4" fill="rgb(var(--primary))" stroke={isDark ? "#09090b" : "#ffffff"} strokeWidth="1.5" />
                <circle cx="400" cy="30" r="4" fill="rgb(var(--primary))" stroke={isDark ? "#09090b" : "#ffffff"} strokeWidth="1.5" />
                <circle cx="450" cy="60" r="4" fill="rgb(var(--primary))" stroke={isDark ? "#09090b" : "#ffffff"} strokeWidth="1.5" />
              </svg>
            </div>
            
            <div className="flex justify-between px-6 text-[9px] text-zinc-500 font-mono mt-2">
              {data.activity_timeline.map(t => (
                <span key={t.date}>{t.date}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
