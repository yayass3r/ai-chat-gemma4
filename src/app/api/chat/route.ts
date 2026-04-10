import { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص في تطوير تطبيقات الويب Full-Stack. أنت خبير في:
- Frontend: React, Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Next.js API Routes, Prisma ORM, REST APIs
- قواعد البيانات: PostgreSQL, SQLite, MongoDB
- أدوات التطوير: Git, Docker, Vercel

أجب دائماً باللغة العربية. قدم أكواد نظيفة ومنظمة مع شرح مبسط.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const allMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: allMessages,
      stream: false,
      thinking: { type: 'disabled' },
    });

    const assistantContent = completion.choices?.[0]?.message?.content;
    if (!assistantContent) {
      return new Response(JSON.stringify({ error: 'No response' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const words = assistantContent.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = i === 0 ? words[i] : ' ' + words[i];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          await new Promise((r) => setTimeout(r, 10));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
