"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useTheme } from "../providers";
import { 
  FileText, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Search, 
  Sparkles, 
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Sun,
  Moon
} from "lucide-react";

interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  doc_size: number;
  summary?: string;
  tags?: string[];
  created_at: string;
}

export default function DocumentsPage() {
  const { theme, toggleTheme } = useTheme();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [recommendedDocs, setRecommendedDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatTitle, setNewChatTitle] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const documents = await api.listDocuments();
      setDocs(documents || []);
      const recommended = await api.getRecommendations();
      setRecommendedDocs(recommended || []);
    } catch (e) {
      console.warn("Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document? All embedded chunks and graphs will be permanently erased.")) return;
    try {
      await api.deleteDocument(id);
      setDocs(docs.filter(d => d.id !== id));
      setSelectedIds(selectedIds.filter(x => x !== id));
    } catch (e) {
      console.warn("Failed to delete document:", e);
      alert("Failed to delete document.");
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    
    setCreatingChat(true);
    const title = newChatTitle.trim() || `Chat over ${selectedIds.length} file(s)`;
    try {
      const chat = await api.createChat(title, selectedIds);
      router.push(`/dashboard/chat/${chat.id}`);
    } catch (e: any) {
      console.warn("Failed to initialize chat session:", e);
      alert(e.message || "Failed to initialize chat session.");
    } finally {
      setCreatingChat(false);
    }
  };

  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (d.tags && d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">Documents Workspace</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1.5">Upload files, view parsed layouts and spin up context-aware chats</p>
        </div>
        <div className="flex items-center space-x-3 w-fit">
          <button
            onClick={toggleTheme}
            className="p-3 bg-secondary/50 hover:bg-secondary border border-border rounded-xl text-foreground transition-all duration-300 flex items-center justify-center hover:scale-[1.02] shadow-sm shrink-0"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-yellow-500" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
          </button>
          
          <Link 
            href="/dashboard/upload"
            className="px-5 py-3 bg-gradient-to-r from-primary to-accent hover:opacity-95 text-white rounded-xl text-sm font-black tracking-wide transition-all duration-300 flex items-center justify-center space-x-2 w-fit shadow-lg shadow-primary/20 hover:scale-[1.02] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload File</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <span className="text-xs font-medium">Loading document index...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 glass-card-premium p-3.5 rounded-2xl">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Search file title or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/80 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50 transition text-foreground font-medium"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              </div>
              
              {selectedIds.length > 0 && (
                <form onSubmit={handleCreateChat} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    required
                    placeholder="Enter chat title..."
                    value={newChatTitle}
                    onChange={(e) => setNewChatTitle(e.target.value)}
                    className="bg-secondary/50 border border-border/80 rounded-lg py-2 px-3 text-sm outline-none focus:border-primary/50 transition text-foreground w-full sm:w-44 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={creatingChat}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-sm font-black tracking-wide shrink-0 transition-all duration-300 flex items-center space-x-1.5 shadow-lg shadow-primary/25 hover:scale-[1.02]"
                  >
                    {creatingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    <span>Chat ({selectedIds.length})</span>
                  </button>
                </form>
              )}
            </div>

            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-card border border-dashed border-border rounded-2xl text-muted-foreground">
                <FileText className="w-10 h-10 stroke-[1.5] text-muted-foreground/60 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No documents indexed</h3>
                <p className="text-xs mt-1 text-center max-w-xs text-muted-foreground">
                  {searchQuery ? "No search results match your criteria." : "Get started by uploading and processing your first document."}
                </p>
                {!searchQuery && (
                  <Link href="/dashboard/upload" className="mt-4 px-4 py-2 bg-secondary border border-border text-foreground rounded-lg text-xs font-semibold hover:bg-accent transition">
                    Go to Uploads
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => {
                  const isChecked = selectedIds.includes(doc.id);
                  return (
                    <div 
                      key={doc.id}
                      onClick={() => handleSelect(doc.id)}
                      className={`
                        cursor-pointer p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative group overflow-hidden
                        ${isChecked 
                          ? "bg-gradient-to-b from-primary/10 to-accent/5 border-primary/50 shadow-xl shadow-primary/15 scale-[1.02]" 
                          : "glass-card-premium hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"}
                      `}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all duration-300 ${isChecked ? "from-primary to-accent opacity-100" : "from-secondary to-secondary opacity-20 group-hover:opacity-100 group-hover:from-primary/30 group-hover:to-accent/30"}`} />
 
                      <div
                        className={`
                          absolute top-4 right-4 w-4 h-4 rounded border transition flex items-center justify-center duration-300
                          ${isChecked 
                            ? "bg-gradient-to-br from-primary to-accent border-transparent text-white" 
                            : "border-border hover:border-primary/40 bg-secondary/40"}
                        `}
                      >
                        {isChecked && (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
 
                      <div className="pt-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 flex items-center justify-center text-primary font-black font-mono text-xs uppercase mb-4 shadow-sm">
                          {doc.file_type}
                        </div>
                        
                        <h3 className="font-extrabold text-base text-foreground tracking-tight truncate pr-6 mb-1.5" title={doc.title}>
                          {doc.title}
                        </h3>
                        
                        <div className="flex items-center space-x-3 text-xs font-semibold text-muted-foreground mb-3.5 font-mono">
                          <span className="flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5" />
                            <span>{formatSize(doc.doc_size)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>
 
                        {doc.summary && (
                          <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                            {doc.summary}
                          </p>
                        )}
                      </div>
 
                      <div className="flex items-center justify-between mt-auto border-t border-border/60 pt-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags && doc.tags.map(t => (
                            <span key={t} className="px-2.5 py-1 bg-primary/5 border border-primary/20 text-primary dark:text-primary-foreground/90 text-[10px] rounded-md font-semibold">
                              {t}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc.id);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-500/5 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-card-premium rounded-2xl p-5 shadow-lg shadow-black/10">
              <div className="flex items-center space-x-2 text-foreground font-bold text-xs mb-4">
                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                <span>Document Recommendations</span>
              </div>
              
              {recommendedDocs.length === 0 ? (
                <div className="text-[10px] text-muted-foreground py-4 text-center">
                  Create and tag documents to generate similarity recommendations.
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendedDocs.slice(0, 3).map((r) => (
                    <div 
                      key={r.id}
                      onClick={() => {
                        setSelectedIds([r.id]);
                        setNewChatTitle(`Chat over ${r.title}`);
                      }}
                      className="p-3 bg-secondary/40 border-l-2 border-l-transparent hover:border-l-accent border-y border-r border-border rounded-r-xl transition-all cursor-pointer flex items-center justify-between group duration-300 hover:bg-secondary/70"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition">{r.title}</h4>
                        <div className="flex space-x-1.5 mt-1">
                          {r.tags && r.tags.slice(0, 2).map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-card border border-border text-[8px] text-muted-foreground rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="glass-card-premium rounded-2xl p-5 text-sm text-muted-foreground leading-relaxed shadow-lg shadow-black/10">
              <h3 className="font-bold text-foreground mb-2">How to start chatting:</h3>
              <ol className="list-decimal list-inside space-y-1.5 pl-0.5 text-xs">
                <li>Click the check boxes on files you want to inspect.</li>
                <li>Enter a custom chat session title.</li>
                <li>Click the Chat button to launch the RAG viewer.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
