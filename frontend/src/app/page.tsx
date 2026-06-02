"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers";
import { 
  FileText, 
  MessageSquare, 
  Share2, 
  Zap, 
  ShieldAlert, 
  Network, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  BarChart3 
} from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#040309] text-[#fafafa] selection:bg-primary selection:text-white relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden aurora-bg z-0" />

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse z-0" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-3xl z-0" />

      <header className="border-b border-border bg-[#040309]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg text-white shadow-md shadow-primary/25">
              <Network className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              SmartDoc <span className="text-accent font-black">AI</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center space-x-6 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#demo" className="hover:text-white transition">Interactive Demo</a>
          </nav>
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-24 bg-zinc-800/40 rounded-lg animate-pulse border border-zinc-700/50" />
            ) : user ? (
              <Link 
                href="/dashboard"
                className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white rounded-lg transition-all duration-300 shadow-lg shadow-primary/20 hover:scale-[1.02]"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition">
                  Sign In
                </Link>
                <Link 
                  href="/signup"
                  className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg transition"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-full text-xs text-zinc-200 font-semibold mb-6 shadow-sm shadow-primary/5"
        >
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span>Vector Hybrid RAG + Knowledge Graph Visualization</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6"
        >
          Talk to Your Documents, <br />
          <span className="bg-gradient-to-r from-primary via-fuchsia-500 to-accent bg-clip-text text-transparent font-black">
            Visualize the Knowledge Network
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10"
        >
          The next-generation document platform. Upload scanned PDFs, extract interactive knowledge networks, chat across multiple resources, and trace exact sources with real-time citations.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16"
        >
          <Link 
            href={user ? "/dashboard" : "/signup"}
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white font-bold rounded-lg shadow-lg shadow-primary/35 transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-[1.03]"
          >
            <span>{user ? "Go to Dashboard" : "Start Analyzing Free"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a 
            href="#demo"
            className="w-full sm:w-auto px-8 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 text-zinc-300 font-semibold rounded-lg transition"
          >
            See Dashboard Preview
          </a>
        </motion.div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">Engineered for Technical Excellence</h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm">
            Powered by a production-ready AI stack including hybrid dense-sparse search, cross-encoder rerankers, and automated RAG evaluation.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#0b0816]/40 border border-primary/15 backdrop-blur-md rounded-2xl relative overflow-hidden group hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition" />
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border border-primary/30 text-primary w-fit mb-6">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Knowledge Graph Network</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Automatically extracts core entities and relationships from PDFs to draw interactive SVG connection graphs. Visualize concepts rather than scanning tables of contents.
            </p>
          </div>
          
          <div className="p-6 bg-[#0b0816]/40 border border-primary/15 backdrop-blur-md rounded-2xl relative overflow-hidden group hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-xl group-hover:bg-indigo-600/10 transition" />
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-xl border border-indigo-500/30 text-indigo-500 w-fit mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Hybrid Retrieval + Reranking</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Combines semantic vector search (`pgvector`) with exact keyword match (`Postgres FTS`) via Reciprocal Rank Fusion, followed by a BGE Cross-Encoder reranker. High relevance guaranteed.
            </p>
          </div>
          
          <div className="p-6 bg-[#0b0816]/40 border border-primary/15 backdrop-blur-md rounded-2xl relative overflow-hidden group hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-xl group-hover:bg-purple-600/10 transition" />
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-xl border border-purple-500/30 text-purple-500 w-fit mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">RAG Evaluation (LLM-as-a-Judge)</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Monitors response quality in real-time. Calculates and plots Faithfulness, Answer Relevancy, and Context Precision metrics to guarantee system trust and avoid hallucinations.
            </p>
          </div>
 
          <div className="p-6 bg-[#0b0816]/40 border border-primary/15 backdrop-blur-md rounded-2xl hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-xl border border-primary/30 text-primary w-fit mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Multi-Format Document Parsing</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Support for PDFs, DOCX, and TXT. Features intelligent scanned PDF detection using text density analysis, with fallback to PyTesseract OCR if standard parsing fails.
            </p>
          </div>
 
          <div className="p-6 bg-[#0b0816]/40 border border-primary/15 backdrop-blur-md rounded-2xl hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className="p-3 bg-gradient-to-br from-accent/20 to-cyan-500/20 rounded-xl border border-accent/30 text-accent w-fit mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Source Citations & Highlighting</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Every assistant claim contains clean reference tags. Clicking a citation highlights the exact paragraph source inside the preview pane. No more guessing.
            </p>
          </div>
 
          <div className="p-6 bg-[#0b0816]/40 border border-primary/15 backdrop-blur-md rounded-2xl hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            <div className="p-3 bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 rounded-xl border border-fuchsia-500/30 text-fuchsia-500 w-fit mb-6">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Resume-Grade Design System</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Glassmorphism workspace, collapsible panels, interactive Recharts dashboard, skeleton loaders, and responsive layouts built with Next.js 15, Framer Motion, and Tailwind CSS.
            </p>
          </div>
        </div>
      </section>

      <section id="demo" className="max-w-7xl mx-auto px-6 py-20 border-t border-zinc-900">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 font-heading">Interactive Interface</h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm">
            Experience the dual-pane workspace where you chat on the right, and review source citations or knowledge nodes on the left.
          </p>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 overflow-hidden relative shadow-2xl">
          <div className="flex items-center space-x-1.5 border-b border-zinc-800 pb-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500/30" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
            <div className="w-3 h-3 rounded-full bg-green-500/30" />
            <div className="text-xs text-zinc-500 font-mono pl-4">app.smartdocai.com/dashboard/chat/annual_report</div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
            <div className="border border-zinc-800 rounded-xl bg-zinc-950 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                <span className="text-xs font-semibold text-zinc-400">Knowledge Graph View</span>
                <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] rounded font-mono">14 Entities</span>
              </div>
              <div className="flex-1 flex items-center justify-center relative">
                <svg className="w-full h-full opacity-60" viewBox="0 0 200 100">
                  <circle cx="50" cy="50" r="8" fill="rgb(var(--primary))" />
                  <circle cx="100" cy="30" r="10" fill="#6366f1" />
                  <circle cx="100" cy="70" r="8" fill="#10b981" />
                  <circle cx="150" cy="50" r="12" fill="#8b5cf6" />
                  
                  <line x1="58" y1="48" x2="90" y2="34" stroke="#374151" strokeWidth="1" />
                  <line x1="58" y1="52" x2="92" y2="68" stroke="#374151" strokeWidth="1" />
                  <line x1="110" y1="34" x2="138" y2="46" stroke="#374151" strokeWidth="1" />
                  <line x1="108" y1="68" x2="138" y2="54" stroke="#374151" strokeWidth="1" />
                  
                  <text x="50" y="38" fill="#94a3b8" fontSize="6" textAnchor="middle">User Node</text>
                  <text x="100" y="16" fill="#94a3b8" fontSize="6" textAnchor="middle">AI Agent</text>
                  <text x="100" y="86" fill="#94a3b8" fontSize="6" textAnchor="middle">PostgreSQL</text>
                  <text x="150" y="34" fill="#94a3b8" fontSize="6" textAnchor="middle">RAG Pipeline</text>
                </svg>
              </div>
            </div>
            
            <div className="border border-zinc-800 rounded-xl bg-zinc-950 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                <span className="text-xs font-semibold text-zinc-400">Assistant Chat</span>
                <span className="px-2 py-0.5 bg-green-600/10 border border-green-500/20 text-green-500 text-[10px] rounded font-mono">RAG metrics: Grounded 0.98</span>
              </div>
              
              <div className="space-y-3 overflow-y-auto flex-1 pr-2 text-xs">
                <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300">
                  <span className="font-semibold text-primary">User:</span> What database does the project utilize?
                </div>
                <div className="p-2 bg-zinc-900/60 border border-zinc-900 rounded-lg text-zinc-400 leading-relaxed">
                  <span className="font-semibold text-green-400">Assistant:</span> The platform utilizes <strong className="text-zinc-200">PostgreSQL</strong> with the <strong className="text-zinc-200">pgvector</strong> extension <span className="text-primary font-bold px-1 bg-primary/10 rounded cursor-pointer">[1]</span> for high performance vector storage and dense semantic queries. It also includes local FAISS support <span className="text-primary font-bold px-1 bg-primary/10 rounded cursor-pointer">[2]</span>.
                </div>
              </div>
              
              <div className="mt-3 flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5">
                <input type="text" placeholder="Ask a question..." disabled className="bg-transparent border-none outline-none text-xs flex-1 text-zinc-400 px-2" />
                <button disabled className="px-3 py-1 bg-primary text-primary-foreground rounded text-[10px] font-semibold">Send</button>
              </div>
            </div>
          </div>
        </div>
      </section>



      <footer className="border-t border-zinc-900 bg-[#020204] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500">
          <div>© {new Date().getFullYear()} SmartDoc AI platform. All rights reserved.</div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="https://github.com/YugVarshney" target="_blank" rel="noreferrer" className="hover:text-zinc-400 transition">GitHub Portfolio</a>
            <a href="https://www.linkedin.com/in/yug-varshney-488094290/" target="_blank" rel="noreferrer" className="hover:text-zinc-400 transition">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
