"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  MessageSquare, 
  Bookmark, 
  Trash2, 
  ArrowRight, 
  Loader2,
  Calendar,
  Layers
} from "lucide-react";

interface ChatItem {
  id: string;
  title: string;
  is_bookmarked: boolean;
  created_at: string;
  document_ids: string[];
}

export default function ChatsListPage() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const data = await api.listChats();
      setChats(data || []);
    } catch (e) {
      console.warn("Failed to load chats:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this chat session? All message history will be permanently lost.")) return;
    try {
      await api.deleteChat(id);
      setChats(chats.filter(c => c.id !== id));
    } catch (e) {
      console.warn("Failed to delete chat session:", e);
      alert("Failed to delete chat session.");
    }
  };

  const handleToggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const updated = await api.toggleBookmark(id);
      setChats(chats.map(c => c.id === id ? { ...c, is_bookmarked: updated.is_bookmarked } : c));
    } catch (e) {
      console.warn("Failed to toggle bookmark:", e);
      alert("Failed to toggle bookmark.");
    }
  };

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
      <div className="border-b border-zinc-200 dark:border-zinc-900/60 pb-5 mb-8 transition-colors">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">Saved Conversations</h1>
        <p className="text-xs text-zinc-500 mt-1">Review, delete, or resume context-aware chats linked to your document stack</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <span className="text-xs">Loading conversations...</span>
        </div>
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-50/50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 transition-colors">
          <MessageSquare className="w-10 h-10 stroke-[1.5] text-zinc-400 dark:text-zinc-700 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-400">No chats found</h3>
          <p className="text-xs mt-1 text-center max-w-xs text-zinc-500 dark:text-zinc-400">
            Start a chat by selecting one or more documents from your Workspace.
          </p>
          <Link href="/dashboard" className="mt-4 px-4 py-2 bg-white hover:bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg text-xs font-semibold transition">
            Go to Documents
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chats.map((chat) => (
            <Link 
              key={chat.id}
              href={`/dashboard/chat/${chat.id}`}
              className="p-5 glass-card-premium rounded-2xl flex flex-col justify-between group transition-all duration-300 hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition truncate pr-4">
                    {chat.title}
                  </h3>
                  
                  <button
                    onClick={(e) => handleToggleBookmark(chat.id, e)}
                    className="p-1 text-zinc-400 hover:text-yellow-500 dark:text-zinc-500 dark:hover:text-yellow-500 transition shrink-0"
                  >
                    <Bookmark className={`w-4 h-4 ${chat.is_bookmarked ? "fill-yellow-500 text-yellow-500" : ""}`} />
                  </button>
                </div>
                
                <div className="flex items-center space-x-3 text-[10px] text-zinc-500 mb-2 font-mono">
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{chat.document_ids.length} Linked File(s)</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(chat.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 border-t border-zinc-200 dark:border-zinc-900/60 pt-3">
                <span className="text-[10px] text-primary group-hover:text-accent font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-all duration-300">
                  <span>Resume Chat</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
                
                <button
                  onClick={(e) => handleDelete(chat.id, e)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-500 rounded-lg hover:bg-red-500/5 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
