"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useTheme } from "../../../providers";

import { 
  FileText, 
  MessageSquare, 
  Network as GraphIcon, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  FileDown, 
  Share2, 
  Sparkles, 
  Loader2, 
  Info,
  ChevronRight,
  Maximize2
} from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

interface Source {
  citation_index: number;
  chunk_id: string;
  document_id: string;
  filename: string;
  content: string;
  page_number?: number;
  start_char: number;
  end_char: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  evaluation_metrics?: {
    faithfulness: number;
    relevancy: number;
    context_precision: number;
  };
  created_at: string;
}

interface DocPreviewParagraph {
  text: string;
  page: number;
  start_char: number;
  end_char: number;
}

function renderFormattedInlineText(text: string) {
  if (!text) return "";
  
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return boldParts.map((boldChunk, boldIdx) => {
    if (boldChunk.startsWith("**") && boldChunk.endsWith("**")) {
      const clean = boldChunk.slice(2, -2);
      return <strong key={`b-${boldIdx}`} className="font-extrabold text-zinc-900 dark:text-zinc-50">{clean}</strong>;
    }
    
    const italicParts = boldChunk.split(/(\*[^*]+\*)/g);
    return italicParts.map((italicChunk, italicIdx) => {
      if (italicChunk.startsWith("*") && italicChunk.endsWith("*") && italicChunk.length > 2) {
        const clean = italicChunk.slice(1, -1);
        return <em key={`i-${boldIdx}-${italicIdx}`} className="italic text-zinc-800 dark:text-zinc-200">{clean}</em>;
      }
      return italicChunk;
    });
  });
}

function renderFormattedText(text: string) {
  if (!text) return null;
  
  const lines = text.split("\n");
  const blocks: Array<{ type: "table" | "standard"; lines: string[] }> = [];
  
  let currentBlock: { type: "table" | "standard"; lines: string[] } | null = null;
  
  const isTableLine = (line: string) => {
    const trimmed = line.trim();
    let sepCount = 0;
    if (trimmed.startsWith("|") || trimmed.startsWith("I ")) sepCount++;
    if (trimmed.endsWith("|") || trimmed.endsWith(" I")) sepCount++;
    
    const middleSeps = trimmed.match(/\s[|I]\s/g);
    if (middleSeps) sepCount += middleSeps.length;
    
    if (sepCount < 3 && /^[|I\s-:]+$/.test(trimmed) && trimmed.length > 2) {
      const separators = trimmed.match(/[|I]/g);
      sepCount = separators ? separators.length : 0;
    }
    
    return sepCount >= 3;
  };
  
  lines.forEach((line) => {
    const isTable = isTableLine(line);
    const type = isTable ? "table" : "standard";
    
    if (!currentBlock || currentBlock.type !== type) {
      currentBlock = { type, lines: [] };
      blocks.push(currentBlock);
    }
    currentBlock.lines.push(line);
  });
  
  return blocks.map((block, blockIdx) => {
    if (block.type === "table") {
      const rows: string[][] = [];
      let hasHeader = false;
      
      block.lines.forEach((line) => {
        let trimmed = line.trim();
        if (/^[|I\s-:]+$/.test(trimmed)) {
          hasHeader = true;
          return;
        }
        
        if (trimmed.startsWith("I ")) {
          trimmed = "|" + trimmed.substring(1);
        } else if (trimmed === "I") {
          trimmed = "|";
        }
        if (trimmed.endsWith(" I")) {
          trimmed = trimmed.substring(0, trimmed.length - 1) + "|";
        }
        trimmed = trimmed.replace(/(\s)I(\s)/g, "$1|$2");
        
        let content = trimmed;
        if (content.startsWith("|")) {
          content = content.substring(1);
        }
        if (content.endsWith("|")) {
          content = content.substring(0, content.length - 1);
        }
        
        const cols = content.split("|").map(col => col.trim());
        rows.push(cols);
      });
      
      if (rows.length === 0) return null;
      
      const headerRow = (hasHeader || rows.length > 1) ? rows[0] : null;
      const bodyRows = (hasHeader || rows.length > 1) ? rows.slice(1) : rows;
      
      return (
        <div key={`table-${blockIdx}`} className="my-3 overflow-x-auto rounded-xl border border-border bg-card/45 shadow-sm max-w-full">
          <table className="min-w-full divide-y divide-border/60 text-xs text-left">
            {headerRow && (
              <thead className="bg-secondary/40">
                <tr>
                  {headerRow.map((col, colIdx) => (
                    <th key={`th-${colIdx}`} className="px-3.5 py-2.5 font-extrabold text-foreground tracking-wider border-b border-border">
                      {renderFormattedInlineText(col)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-border/40">
              {bodyRows.map((row, rowIdx) => (
                <tr key={`tr-${rowIdx}`} className="hover:bg-secondary/20 transition-colors">
                  {row.map((col, colIdx) => (
                    <td key={`td-${colIdx}`} className="px-3.5 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
                      {renderFormattedInlineText(col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      return block.lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        
        let isHeading = false;
        let headingLevel = 0;
        let content = line;
        
        if (trimmed.startsWith("#### ")) {
          isHeading = true;
          headingLevel = 4;
          content = trimmed.substring(5);
        } else if (trimmed.startsWith("### ")) {
          isHeading = true;
          headingLevel = 3;
          content = trimmed.substring(4);
        } else if (trimmed.startsWith("## ")) {
          isHeading = true;
          headingLevel = 2;
          content = trimmed.substring(3);
        } else if (trimmed.startsWith("# ")) {
          isHeading = true;
          headingLevel = 1;
          content = trimmed.substring(2);
        }
        
        const isBullet = !isHeading && (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• "));
        const parseContent = isBullet ? trimmed.substring(2) : content;
        
        const boldParts = parseContent.split(/(\*\*[^*]+\*\*)/g);
        
        const renderedLine = boldParts.map((boldChunk, boldIdx) => {
          if (boldChunk.startsWith("**") && boldChunk.endsWith("**")) {
            const clean = boldChunk.slice(2, -2);
            return <strong key={`b-${boldIdx}`} className="font-extrabold text-zinc-900 dark:text-zinc-50">{clean}</strong>;
          }
          
          const italicParts = boldChunk.split(/(\*[^*]+\*)/g);
          return italicParts.map((italicChunk, italicIdx) => {
            if (italicChunk.startsWith("*") && italicChunk.endsWith("*") && italicChunk.length > 2) {
              const clean = italicChunk.slice(1, -1);
              return <em key={`i-${boldIdx}-${italicIdx}`} className="italic text-zinc-800 dark:text-zinc-200">{clean}</em>;
            }
            return italicChunk;
          });
        });
        
        if (isHeading) {
          const headingClass = headingLevel === 1 
            ? "block text-base font-bold text-zinc-900 dark:text-zinc-50 mt-3 mb-1.5" 
            : headingLevel === 2
            ? "block text-sm font-bold text-zinc-900 dark:text-zinc-200 mt-2.5 mb-1"
            : "block text-xs font-bold text-zinc-900 dark:text-zinc-200 mt-2 mb-1";
          return (
            <span key={`${blockIdx}-${lineIdx}`} className={headingClass}>
              {renderedLine}
            </span>
          );
        }
        
        const isLastLine = lineIdx === block.lines.length - 1;
        
        if (isLastLine) {
          if (isBullet) {
            return (
              <span key={`${blockIdx}-${lineIdx}`} className="inline-block pl-4 my-1 text-xs text-zinc-700 dark:text-zinc-300">
                <span className="inline-block mr-2 text-primary shrink-0 select-none">•</span>
                <span>{renderedLine}</span>
              </span>
            );
          }
          return <React.Fragment key={`${blockIdx}-${lineIdx}`}>{renderedLine}</React.Fragment>;
        }
        
        if (isBullet) {
          return (
            <span key={`${blockIdx}-${lineIdx}`} className="block pl-4 my-1 text-xs text-zinc-700 dark:text-zinc-300">
              <span className="inline-block mr-2 text-primary shrink-0 select-none">•</span>
              <span>{renderedLine}</span>
            </span>
          );
        }
        
        if (trimmed === "") {
          return <span key={`${blockIdx}-${lineIdx}`} className="block h-2" />;
        }
        
        return (
          <span key={`${blockIdx}-${lineIdx}`} className="block my-0.5">
            {renderedLine}
          </span>
        );
      });
    }
  });
}

export default function ChatSessionWorkspace() {
  const params = useParams();
  const chatId = params.id as string;
  const router = useRouter();
  const { theme } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "graph">("preview");
  
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [docPreview, setDocPreview] = useState<DocPreviewParagraph[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [streamedResponse, setStreamedResponse] = useState("");
  const [streamedSources, setStreamedSources] = useState<Source[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [graphZoom, setGraphZoom] = useState(1);
  const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
  const [isDraggingGraph, setIsDraggingGraph] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);

  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const paragraphRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) {
      loadWorkspace();
    }
  }, [chatId]);

  useEffect(() => {
    if (selectedDocId) {
      loadDocPreviewAndGraph(selectedDocId);
    }
  }, [selectedDocId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponse]);

  const loadWorkspace = async () => {
    setLoadingWorkspace(true);
    try {
      const chatsList = await api.listChats();
      const currentChat = chatsList?.find((c: any) => c.id === chatId);
      if (!currentChat) {
        alert("Conversation log not found.");
        router.push("/dashboard");
        return;
      }
      setChatInfo(currentChat);
      
      const msgList = await api.listMessages(chatId);
      setMessages(msgList || []);
      
      const allDocs = await api.listDocuments();
      const docsLinked = allDocs?.filter((d: any) => currentChat.document_ids.includes(d.id)) || [];
      setLinkedDocs(docsLinked);
      
      if (docsLinked.length > 0) {
        setSelectedDocId(docsLinked[0].id);
      }
    } catch (e) {
      console.warn("Failed to load workspace data:", e);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const loadDocPreviewAndGraph = async (docId: string) => {
    try {
      const preview = await api.getDocumentPreview(docId);
      setDocPreview(preview || []);
    } catch (e) {
      console.warn("Failed to load document preview:", e);
      setDocPreview([]);
    }

    try {
      const graph = await api.getDocumentGraph(docId);
      setGraphData(graph || { nodes: [], edges: [] });
    } catch (e) {
      console.warn("Failed to load document graph:", e);
      setGraphData({ nodes: [], edges: [] });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendingMsg) return;
    
    const userQuery = inputText.trim();
    setInputText("");
    setSendingMsg(true);
    setStreamedResponse("");
    setStreamedSources([]);
    
    const fakeUserMsg: Message = {
      id: uuidv4(),
      role: "user",
      content: userQuery,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, fakeUserMsg]);
    
    try {
      const token = localStorage.getItem("smartdoc_token");
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000/api";
      const sseUrl = `${apiBase}/chats/${chatId}/message/stream`;
      
      const response = await fetch(sseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: userQuery })
      });
      
      if (!response.ok) throw new Error("Failed to start SSE response stream.");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader initialized.");
      
      let answerBuffer = "";
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkText = decoder.decode(value);
        const lines = chunkText.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("event: metadata")) {
            const dataStr = line.replace("event: metadata\ndata: ", "").trim();
            try {
              const meta = JSON.parse(dataStr);
              setStreamedSources(meta.sources || []);
            } catch (err) {}
          } else if (line.startsWith("event: chunk")) {
            const dataStr = line.replace("event: chunk\ndata: ", "").trim();
            try {
              const payload = JSON.parse(dataStr);
              answerBuffer += payload.text;
              setStreamedResponse(answerBuffer);
            } catch (err) {}
          }
        }
      }
      
      setTimeout(async () => {
        const updatedMsgList = await api.listMessages(chatId);
        setMessages(updatedMsgList || []);
        setStreamedResponse("");
        setStreamedSources([]);
        
        const lastMsg = updatedMsgList?.[updatedMsgList.length - 1];
        if (isSpeakingEnabled && lastMsg && lastMsg.role === "assistant") {
          speakText(lastMsg.content);
        }
      }, 800);
      
    } catch (e) {
      console.warn("Failed to send query:", e);
      alert("Failed to send query.");
    } finally {
      setSendingMsg(false);
    }
  };

  const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleCitationClick = (source: Source) => {
    setActiveTab("preview");
    setSelectedDocId(source.document_id);
    
    setHighlightedText(source.content);
    
    setTimeout(() => {
      const cleanMatchContent = source.content.replace(/\s+/g, " ").trim();
      const matchKey = Object.keys(paragraphRefs.current).find(key => 
        key.replace(/\s+/g, " ").trim().includes(cleanMatchContent) ||
        cleanMatchContent.includes(key.replace(/\s+/g, " ").trim())
      );
      
      if (matchKey && paragraphRefs.current[matchKey]) {
        paragraphRefs.current[matchKey]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  };

  
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    
    rec.onstart = () => {
      setIsRecording(true);
    };
    
    rec.onresult = (e: any) => {
      const resultText = e.results[0][0].transcript;
      setInputText(prev => prev ? prev + " " + resultText : resultText);
    };
    
    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      setIsRecording(false);
    };
    
    rec.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = rec;
    rec.start();
  };

  const speakText = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    synth.cancel();
    
    const cleanText = text.replace(/\[\d+\]/g, "").trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    synth.speak(utterance);
  };

  const toggleVoiceOutput = () => {
    const nextVal = !isSpeakingEnabled;
    setIsSpeakingEnabled(nextVal);
    if (!nextVal) {
      window.speechSynthesis?.cancel();
    } else {
      const lastMsg = [...messages].reverse().find(m => m.role === "assistant");
      if (lastMsg) {
        speakText(lastMsg.content);
      }
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleShare = async () => {
    try {
      const data = await api.getShareLink(chatId);
      navigator.clipboard.writeText(window.location.origin + data.share_url);
      alert("Shareable chat link copied to clipboard!");
    } catch (e) {
      console.warn("Failed to generate share link:", e);
    }
  };

  const handleGraphMouseDown = (e: React.MouseEvent) => {
    setIsDraggingGraph(true);
    dragStart.current = { x: e.clientX - graphPan.x, y: e.clientY - graphPan.y };
  };

  const handleGraphMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingGraph) return;
    setGraphPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleGraphMouseUp = () => {
    setIsDraggingGraph(false);
  };

  const handleGraphWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setGraphZoom(prev => Math.min(3, Math.max(0.5, prev * zoomFactor)));
  };

  const getNodeCoordinates = (index: number, total: number) => {
    const radius = 110;
    const centerX = 200;
    const centerY = 150;
    if (total === 1) return { x: centerX, y: centerY };
    
    const angle = (index / total) * 2 * Math.PI;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  const nodesWithCoords = graphData.nodes.map((node, index) => {

    if (index === 0) return { ...node, x: 200, y: 150 };
    const coords = getNodeCoordinates(index, graphData.nodes.length - 1);
    return { ...node, x: coords.x, y: coords.y };
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {loadingWorkspace ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <span className="text-xs">Assembling document indexes & chat workspace...</span>
        </div>
      ) : (
        <>
          <div className="w-full lg:w-1/2 border-r border-border bg-card/15 backdrop-blur-md flex flex-col overflow-hidden h-1/2 lg:h-full transition-all duration-300">
            <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0 transition-all duration-300">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition
                    ${activeTab === "preview" 
                      ? "bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/40 text-primary font-bold shadow-sm shadow-primary/5" 
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}
                  `}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Document Layout</span>
                </button>
                <button
                  onClick={() => setActiveTab("graph")}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition
                    ${activeTab === "graph" 
                      ? "bg-gradient-to-r from-primary/15 to-accent/5 border border-primary/40 text-primary font-bold shadow-sm shadow-primary/5" 
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}
                  `}
                >
                  <GraphIcon className="w-3.5 h-3.5" />
                  <span>Knowledge Map</span>
                </button>
              </div>
              
              {linkedDocs.length > 1 && activeTab === "preview" && (
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 px-2 text-[10px] text-zinc-700 dark:text-zinc-300 outline-none max-w-40 truncate transition-colors duration-200"
                >
                  {linkedDocs.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex-1 overflow-hidden relative">
              {activeTab === "preview" && (
                <div className="h-full overflow-y-auto p-6 space-y-4">
                  {docPreview.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs">
                      <FileText className="w-8 h-8 mb-2 stroke-[1.5]" />
                      <span>Parsing document content structure...</span>
                    </div>
                  ) : (
                    docPreview.map((p, idx) => {
                      const isHighlighted = highlightedText && p.text.includes(highlightedText);
                      return (
                        <p
                          key={idx}
                          ref={el => { paragraphRefs.current[p.text] = el; }}
                          className={`
                            text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 p-2.5 rounded-lg border transition-all duration-300
                            ${isHighlighted 
                              ? "bg-accent/10 border-accent/40 text-foreground scale-[1.01] shadow-lg shadow-accent/5" 
                              : "border-transparent"}
                          `}
                        >
                          {p.text}
                        </p>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "graph" && (
                <div className="h-full relative overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/40 select-none transition-colors duration-200">
                  <div className="absolute top-4 left-4 z-10 px-2.5 py-1 glass-card-premium rounded-lg text-[10px] text-muted-foreground pointer-events-none transition-all">
                    Scroll to Zoom • Drag to Pan • Click Nodes
                  </div>

                  {graphData.nodes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs">
                      <GraphIcon className="w-8 h-8 mb-2 stroke-[1.5] animate-pulse" />
                      <span>Mapping entity relationships...</span>
                    </div>
                  ) : (
                    <div 
                      className="w-full h-full cursor-grab active:cursor-grabbing"
                      onMouseDown={handleGraphMouseDown}
                      onMouseMove={handleGraphMouseMove}
                      onMouseUp={handleGraphMouseUp}
                      onMouseLeave={handleGraphMouseUp}
                      onWheel={handleGraphWheel}
                    >
                      <svg className="w-full h-full">
                        <g transform={`translate(${graphPan.x}, ${graphPan.y}) scale(${graphZoom})`}>
                          {graphData.edges.map((edge, idx) => {
                            const sourceNode = nodesWithCoords.find(n => n.id === edge.source);
                            const targetNode = nodesWithCoords.find(n => n.id === edge.target);
                            if (!sourceNode || !targetNode) return null;
                            
                            const midX = (sourceNode.x + targetNode.x) / 2;
                            const midY = (sourceNode.y + targetNode.y) / 2;
                            
                            return (
                              <g key={`edge-${idx}`}>
                                <line
                                  x1={sourceNode.x}
                                  y1={sourceNode.y}
                                  x2={targetNode.x}
                                  y2={targetNode.y}
                                  stroke={theme === "dark" ? "rgba(63, 63, 70, 0.4)" : "rgba(161, 161, 170, 0.5)"}
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={midX}
                                  y={midY - 4}
                                  fill="#71717a"
                                  fontSize="6"
                                  textAnchor="middle"
                                  className="font-mono bg-zinc-950"
                                >
                                  {edge.label}
                                </text>
                              </g>
                            );
                          })}

                          {nodesWithCoords.map((node) => {
                             const isSelected = selectedGraphNode?.id === node.id;
                             const color = node.type.toLowerCase().includes("doc") 

                               ? (theme === "dark" ? "#d699ff" : "#8b2ce2") 
                               : (theme === "dark" ? "#a855f7" : "#7c3aed");
                            return (
                              <g 
                                key={node.id} 
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGraphNode(node);
                                }}
                              >
                                <circle
                                  cx={node.x}
                                  cy={node.y}
                                  r={isSelected ? "14" : "10"}
                                  fill={color}
                                  fillOpacity="0.15"
                                  stroke={color}
                                  strokeWidth={isSelected ? "2.5" : "1.5"}
                                  className="transition-all duration-300"
                                />
                                <circle
                                  cx={node.x}
                                  cy={node.y}
                                  r="4"
                                  fill={color}
                                />
                                <text
                                  x={node.x}
                                  y={node.y + 22}
                                  fill={theme === "dark" ? "#e4e4e7" : "#27272a"}
                                  fontSize="8"
                                  fontWeight="600"
                                  textAnchor="middle"
                                  className="pointer-events-none drop-shadow"
                                >
                                  {node.label}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      </svg>
                    </div>
                  )}

                  {selectedGraphNode && (
                    <div className="absolute bottom-4 right-4 z-10 w-64 glass-card-premium p-4 rounded-2xl shadow-xl shadow-black/20 transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/30 text-primary text-[8px] rounded uppercase font-bold tracking-wider font-mono">
                          {selectedGraphNode.type}
                        </span>
                        <button 
                          onClick={() => setSelectedGraphNode(null)}
                          className="text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{selectedGraphNode.label}</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Extracted entity linked to document themes. Ask queries relating to {selectedGraphNode.label} in the assistant panel to retrieve detailed answers.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col overflow-hidden h-1/2 lg:h-full bg-background/50 border-l border-border backdrop-blur-md transition-all duration-300">
            <div className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-md transition-all duration-300">
              <span className="text-xs font-bold tracking-tight text-zinc-700 dark:text-zinc-300 truncate max-w-60">
                {chatInfo?.title}
              </span>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleVoiceOutput}
                  className={`
                    p-1.5 rounded-lg border transition
                    ${isSpeakingEnabled 
                      ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-500" 
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}
                  `}
                  title={isSpeakingEnabled ? "Disable Read Aloud" : "Enable Read Aloud"}
                >
                  {isSpeakingEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleShare}
                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition"
                  title="Share Conversation"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <a
                  href={api.getExportUrl(chatId)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition flex items-center justify-center"
                  title="Export PDF Report"
                >
                  <FileDown className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent transition-all duration-300">
              {messages.length === 0 && !streamedResponse && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-450 dark:text-zinc-600 text-xs">
                  <MessageSquare className="w-8 h-8 mb-2 stroke-[1.5]" />
                  <span>Send a query to retrieve source-backed document answers</span>
                </div>
              )}
              
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div 
                      className={`
                        max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed relative group transition-all duration-200
                        ${isUser 
                          ? "bg-gradient-to-r from-primary to-accent text-white rounded-tr-none shadow-md shadow-primary/10" 
                          : "glass-card-premium border border-border/80 text-foreground rounded-tl-none shadow-md shadow-black/10"}
                      `}
                    >
                      <div className="prose">
                        {m.content.split(/(\[\d+\])/g).map((part, index) => {
                          const isCite = part.match(/^\[\d+\]$/);
                          if (isCite) {
                            const indexNum = parseInt(part.replace(/[\[\]]/g, ""));
                            const matchingSource = m.sources?.find(s => s.citation_index === indexNum);
                            return (
                              <span
                                key={index}
                                onClick={() => matchingSource && handleCitationClick(matchingSource)}
                                className={`
                                  font-bold px-1 rounded mx-0.5 select-none text-[10px] transition-all
                                  ${matchingSource 
                                    ? "bg-accent/15 text-accent border border-accent/30 cursor-pointer hover:bg-accent/30 hover:scale-105" 
                                    : "text-muted-foreground bg-secondary/80"}
                                `}
                                title={matchingSource ? `Source: ${matchingSource.filename} page ${matchingSource.page_number}` : ""}
                              >
                                {part}
                              </span>
                            );
                          }
                          return <React.Fragment key={index}>{renderFormattedText(part)}</React.Fragment>;
                        })}
                      </div>

                      <div className="absolute right-2 bottom-1 hidden group-hover:flex items-center space-x-1.5">
                        <button
                          onClick={() => copyMessage(m.id, m.content)}
                          className="p-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
                        >
                          {copiedId === m.id ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                    
                    {!isUser && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1.5">
                        {m.evaluation_metrics && (
                          <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-[9px] text-zinc-500">
                            <Sparkles className="w-2.5 h-2.5 text-primary" />
                            <span>Groundedness: {m.evaluation_metrics.faithfulness}</span>
                          </div>
                        )}
                        {m.sources && m.sources.map(s => (
                          <button
                            key={s.chunk_id}
                            onClick={() => handleCitationClick(s)}
                            className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 text-[9px] rounded-md truncate max-w-40 font-mono transition-colors"
                          >
                            [{s.citation_index}] {s.filename}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {streamedResponse && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-850 dark:text-zinc-300 rounded-2xl rounded-tl-none text-xs leading-relaxed prose shadow-sm">
                    {renderFormattedText(streamedResponse)}
                  </div>
                  {streamedSources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 pl-1.5">
                      {streamedSources.map(s => (
                        <span key={s.chunk_id} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] rounded-md font-mono">
                          [{s.citation_index}] {s.filename}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {sendingMsg && !streamedResponse && (
                <div className="flex flex-col items-start">
                  <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl rounded-tl-none flex items-center space-x-2 text-xs text-zinc-500 font-medium shadow-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Searching vectors & synthesizing response...</span>
                  </div>
                </div>
              )}
              
              <div ref={messageEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card/60 backdrop-blur-md shrink-0 transition-all duration-300">
              <div className="flex items-center bg-secondary/40 border border-border rounded-xl px-3 py-2 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
                <input
                  type="text"
                  placeholder="Ask document queries..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs flex-1 text-zinc-800 dark:text-zinc-200 px-2 placeholder-zinc-400 dark:placeholder-zinc-500"
                />
                
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`
                    p-1.5 rounded-lg transition mr-1.5
                    ${isRecording 
                      ? "bg-red-500/10 text-red-500 animate-pulse border border-red-500/20" 
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}
                  `}
                  title="Speech to Text"
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  disabled={!inputText.trim() || sendingMsg}
                  className="p-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-95 disabled:opacity-50 text-white rounded-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
