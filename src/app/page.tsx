'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '@/lib/store';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatArea } from '@/components/chat/chat-area';
import { ChatInput } from '@/components/chat/chat-input';
import { ThemeToggle } from '@/components/chat/theme-toggle';
import { Code2, Sparkles, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AI_STREAM_DELAY } from '@/lib/constants';

interface ChatMsg {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

export default function Home() {
  const {
    activeConversationId, isGenerating, isLoading,
    loadConversations, createConversation, addMessage,
    updateLastAssistantMessage, setIsGenerating, getActiveConversation,
  } = useChatStore();

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadConversations();
    return () => { abortRef.current?.abort(); };
  }, [loadConversations]);

  const handleSend = useCallback(async (content: string) => {
    let currentId = activeConversationId;

    if (!currentId) {
      await createConversation();
      currentId = useChatStore.getState().activeConversationId;
      if (!currentId) return;
    }

    setIsGenerating(true);
    await addMessage(currentId, 'user', content);

    // Add empty assistant message locally
    const tempId = crypto.randomUUID();
    const conv = useChatStore.getState().conversations;
    useChatStore.setState((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === currentId
          ? { ...c, messages: [...c.messages, { id: tempId, role: 'assistant', content: '', timestamp: Date.now() }] }
          : c
      ),
    }));

    const currentConv = useChatStore.getState().conversations.find((c) => c.id === currentId);
    const historyMessages = currentConv?.messages
      .filter((m: ChatMsg) => m.content !== '')
      .map((m: ChatMsg) => ({ role: m.role, content: m.content })) || [];

    try {
      abortRef.current = new AbortController();

      // Call our API route (server-side - AI URL hidden)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyMessages,
          stream: false,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const fullContent = data.content || '';

      if (fullContent) {
        // Simulate word-by-word streaming for smooth UX
        const words = fullContent.split(' ');
        let displayed = '';
        for (const word of words) {
          displayed += (displayed ? ' ' : '') + word;
          updateLastAssistantMessage(displayed);
          await new Promise(r => setTimeout(r, AI_STREAM_DELAY));
        }

        // Save assistant response to Supabase
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: currentId, role: 'assistant', content: fullContent }),
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        const msg = error.message.includes('timed out')
          ? 'الاستجابة استغرقت وقتاً طويلاً. حاول مرة أخرى.'
          : 'حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى.';
        updateLastAssistantMessage(msg);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [activeConversationId, createConversation, addMessage, updateLastAssistantMessage, setIsGenerating]);

  const activeConversation = getActiveConversation();

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل المحادثات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <ChatSidebar />
      <main className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b bg-background/80 backdrop-blur-xl px-4 py-3 md:pr-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
                مساعد Full-Stack الذكي
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 font-normal">
                  <Sparkles className="h-3 w-3" /> AI + Supabase
                </Badge>
              </h1>
              <p className="text-[11px] text-muted-foreground/60">متخصص في تطوير تطبيقات الويب الحديثة</p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <ChatArea
          messages={activeConversation?.messages || []}
          isGenerating={isGenerating}
          hasConversation={!!activeConversationId}
          onSuggestionClick={handleSend}
        />
        <ChatInput onSend={handleSend} disabled={isGenerating} />
      </main>
    </div>
  );
}
