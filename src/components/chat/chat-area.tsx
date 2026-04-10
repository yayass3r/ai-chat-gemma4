'use client';

import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './chat-message';
import { TypingIndicator } from './typing-indicator';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { Code2 } from 'lucide-react';

interface Props {
  messages: ChatMessageType[];
  isGenerating: boolean;
  hasConversation: boolean;
  onSuggestionClick?: (text: string) => void;
}

export function ChatArea({ messages, isGenerating, hasConversation, onSuggestionClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  if (!hasConversation || messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 shadow-lg shadow-primary/5">
            <Code2 className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">مساعد Full-Stack الذكي</h2>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              مساعدك الذكي لتطوير تطبيقات الويب. اسأل عن React، Next.js، TypeScript، Tailwind CSS، وأكثر.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full px-4">
          {[
            { title: 'إنشاء API', desc: 'كيف أنشئ REST API بـ Next.js؟', icon: '🔌' },
            { title: 'قاعدة بيانات', desc: 'شرح Supabase مع Next.js', icon: '🗄️' },
            { title: 'تصميم متجاوب', desc: 'أفضل ممارسات Tailwind CSS', icon: '🎨' },
            { title: 'نشر المشروع', desc: 'نشر تطبيق على Netlify', icon: '🚀' },
          ].map((item) => (
            <button key={item.title} onClick={() => onSuggestionClick?.(item.desc)}
              className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-right shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 group">
              <span className="text-xl mt-0.5">{item.icon}</span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl space-y-1 py-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isGenerating && <TypingIndicator />}
        <div ref={bottomRef} className="h-4" />
      </div>
    </ScrollArea>
  );
}
