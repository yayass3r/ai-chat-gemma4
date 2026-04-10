'use client';

import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MarkdownRenderer } from './markdown-renderer';
import { Bot, User } from 'lucide-react';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 px-4 py-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground text-xs' : 'bg-primary/10 text-primary text-xs'}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[80%] sm:max-w-[70%] md:max-w-[65%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${isUser ? 'rounded-tl-sm bg-primary text-primary-foreground' : 'rounded-tr-sm bg-card border text-card-foreground'}`}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm"><MarkdownRenderer content={message.content} /></div>
          )}
        </div>
      </div>
    </div>
  );
}
