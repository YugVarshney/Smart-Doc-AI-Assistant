const API_BASE = (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_BASE)
  ? process.env.NEXT_PUBLIC_API_BASE
  : "http://127.0.0.1:8000/api";

function getHeaders(isMultipart = false) {
  const token = typeof window !== "undefined" ? localStorage.getItem("smartdoc_token") : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function request(url: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...getHeaders(options.body instanceof FormData),
      ...(options.headers || {}),
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "An error occurred";
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.detail || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  async signup(email: string, password: string, fullName?: string) {
    return request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  },
  
  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });
    
    if (!resp.ok) {
      const errorText = await resp.text();
      let errorMessage = "Invalid login credentials";
      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed.detail || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }
    
    const data = await resp.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("smartdoc_token", data.access_token);
    }
    return data;
  },
  
  async getMe() {
    return request("/auth/me");
  },
  
  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/documents/upload", {
      method: "POST",
      body: formData,
    });
  },
  
  async listDocuments() {
    return request("/documents");
  },
  
  async deleteDocument(docId: string) {
    return request(`/documents/${docId}`, {
      method: "DELETE",
    });
  },
  
  async getDocumentGraph(docId: string) {
    return request(`/documents/${docId}/graph`);
  },
  
  async getDocumentPreview(docId: string) {
    return request(`/documents/${docId}/preview`);
  },
  
  async getRecommendations() {
    return request("/documents/recommendations/list");
  },
  
  async createChat(title: string, documentIds: string[]) {
    return request("/chats", {
      method: "POST",
      body: JSON.stringify({ title, document_ids: documentIds }),
    });
  },
  
  async listChats() {
    return request("/chats");
  },
  
  async deleteChat(chatId: string) {
    return request(`/chats/${chatId}`, {
      method: "DELETE",
    });
  },
  
  async listMessages(chatId: string) {
    return request(`/chats/${chatId}/messages`);
  },
  
  async sendMessage(chatId: string, content: string) {
    return request(`/chats/${chatId}/message`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
  
  async toggleBookmark(chatId: string) {
    return request(`/chats/${chatId}/bookmark`, {
      method: "PUT",
    });
  },
  
  async getShareLink(chatId: string) {
    return request(`/chats/${chatId}/share`);
  },
  
  async getAnalytics() {
    return request("/analytics");
  },
  
  getExportUrl(chatId: string) {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartdoc_token") : "";
    return `${API_BASE}/chats/${chatId}/export?token=${token}`;
  }
};
export type apiType = typeof api;
