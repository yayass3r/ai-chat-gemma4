import { create } from 'zustand';
import type { ChatMessage } from '@/lib/types';

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface SupabaseProject {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  isLoading: boolean;

  loadConversations: () => Promise<void>;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversation: (id: string) => Promise<void>;
  addMessage: (conversationId: string, role: 'user' | 'assistant', content: string) => Promise<void>;
  updateLastAssistantMessage: (content: string) => void;
  setIsGenerating: (v: boolean) => void;
  getActiveConversation: () => Conversation | undefined;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isGenerating: false,
  isLoading: false,

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) throw new Error('Failed');
      const data: SupabaseProject[] = await res.json();

      const convs: Conversation[] = data.map((p) => ({
        id: p.id,
        title: p.name || 'محادثة جديدة',
        messages: [],
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
      }));

      set({ conversations: convs });
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createConversation: async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'محادثة جديدة' }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      const newConv: Conversation = {
        id: data.id,
        title: data.name || 'محادثة جديدة',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((s) => ({
        conversations: [newConv, ...s.conversations],
        activeConversationId: newConv.id,
      }));
    } catch (err) {
      console.error('Create error:', err);
    }
  },

  deleteConversation: async (id: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('Delete failed:', res.status);
        return; // Don't delete locally if server fails
      }

      set((s) => {
        const filtered = s.conversations.filter((c) => c.id !== id);
        return {
          conversations: filtered,
          activeConversationId: s.activeConversationId === id ? (filtered[0]?.id ?? null) : s.activeConversationId,
        };
      });
    } catch (err) {
      console.error('Delete error:', err);
    }
  },

  setActiveConversation: async (id: string) => {
    set({ activeConversationId: id });
    const conv = get().conversations.find((c) => c.id === id);
    if (conv && conv.messages.length === 0) {
      try {
        const res = await fetch(`/api/messages?conversation_id=${id}`);
        if (!res.ok) return;
        const data: SupabaseMessage[] = await res.json();

        const messages: ChatMessage[] = data.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
        }));

        set((s) => ({
          conversations: s.conversations.map((c) => c.id === id ? { ...c, messages } : c),
        }));
      } catch (err) {
        console.error('Load messages error:', err);
      }
    }
  },

  addMessage: async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, role, content }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      const msg: ChatMessage = {
        id: data.id,
        role: data.role,
        content: data.content,
        timestamp: Date.now(),
      };

      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, msg], title: c.messages.length === 0 && role === 'user' ? content.slice(0, 40) + (content.length > 40 ? '...' : '') : c.title, updatedAt: Date.now() }
            : c
        ),
      }));
    } catch (err) {
      console.error('Add message error:', err);
    }
  },

  updateLastAssistantMessage: (content: string) => {
    const { activeConversationId, conversations } = get();
    if (!activeConversationId) return;
    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv || conv.messages.length === 0) return;
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: [...c.messages.slice(0, -1), { ...lastMsg, content }] }
          : c
      ),
    }));
  },

  setIsGenerating: (v: boolean) => set({ isGenerating: v }),

  getActiveConversation: () => {
    const s = get();
    return s.conversations.find((c) => c.id === s.activeConversationId);
  },
}));
