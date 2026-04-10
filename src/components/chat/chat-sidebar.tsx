'use client';

import { useChatStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, MessageSquare, Trash2, PanelLeftClose, Code2 } from 'lucide-react';

export function ChatSidebar() {
  const { conversations, activeConversationId, createConversation, deleteConversation, setActiveConversation } = useChatStore();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Code2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-sm font-bold text-foreground">المحادثات</h2>
        </div>
        <Button onClick={createConversation} className="w-full justify-start gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-11">
          <Plus className="h-4 w-4" /> محادثة جديدة
        </Button>
      </div>
      <Separator className="opacity-60" />
      <ScrollArea className="flex-1 py-2">
        <div className="space-y-0.5 px-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground/60">لا توجد محادثات بعد</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} className="group">
                <button
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-right transition-all duration-200 ${conv.id === activeConversationId ? 'bg-primary/10 text-primary shadow-sm' : 'text-foreground/80 hover:bg-accent hover:text-foreground'}`}
                >
                  <MessageSquare className={`h-4 w-4 shrink-0 ${conv.id === activeConversationId ? 'text-primary' : 'text-muted-foreground/50'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-72 flex-col border-l bg-sidebar/50 backdrop-blur-sm">{sidebarContent}</aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-3 right-3 z-40 rounded-xl bg-card border shadow-sm h-10 w-10">
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="sr-only"><SheetTitle>المحادثات</SheetTitle></SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
