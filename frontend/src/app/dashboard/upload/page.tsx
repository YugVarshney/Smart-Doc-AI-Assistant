"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowLeft 
} from "lucide-react";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    setLoading(true);
    setError("");
    setSuccess("");
    setProgress(20);
    
    try {
      setProgress(50);
      const resp = await api.uploadDocument(file);
      setProgress(80);
      
      setTimeout(() => {
        setProgress(100);
        setSuccess(`Document "${file.name}" uploaded and queued for indexing successfully!`);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      console.warn("Failed to upload document:", err);
      setError(err.message || "Failed to upload document.");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col justify-center">
      <button 
        onClick={() => router.push("/dashboard")}
        className="mb-8 flex items-center space-x-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition w-fit text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Documents</span>
      </button>

      <div className="glass-card-premium rounded-3xl p-8 shadow-xl shadow-black/10 transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">Upload Document</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Upload a PDF, DOCX, or TXT file to process embeddings and generate graph maps</p>
        </div>

        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center transition-all duration-300 cursor-pointer
              ${dragActive 
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" 
                : "border-border hover:border-primary/40 bg-secondary/20"}
            `}
          onClick={onButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleChange}
          />
          
          <div className="p-4 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-500 dark:text-zinc-400 mb-4 transition-colors">
            <Upload className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
          </div>
          
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Drag & drop your file here</h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 mb-4">or click to browse from folders</p>
          
          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-600 dark:text-zinc-400 rounded-md font-mono transition-colors">
            PDF, DOCX, TXT, MD up to 15MB
          </span>
        </div>

        {loading && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Running Parser & OCR Pipeline...</span>
              </span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-500 rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-500" />
            <div>
              <div className="font-bold">Upload Failed</div>
              <div className="text-[11px] mt-0.5 text-red-600/90 dark:text-red-400">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-500 rounded-xl text-xs flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600 dark:text-green-500" />
            <div>
              <div className="font-bold">Success</div>
              <div className="text-[11px] mt-0.5 text-green-600/90 dark:text-green-400">{success}</div>
              <button 
                onClick={() => router.push("/dashboard")}
                className="mt-3 px-3 py-1.5 bg-green-600 dark:bg-green-500 text-white dark:text-zinc-950 font-bold rounded-lg text-[10px] hover:bg-green-500 dark:hover:bg-green-400 transition shadow-sm"
              >
                Go to Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
