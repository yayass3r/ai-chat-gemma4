import { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص في تطوير تطبيقات الويب Full-Stack. أنت خبير في:
- Frontend: React, Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Next.js API Routes, Prisma ORM, REST APIs
- قواعد البيانات: PostgreSQL, SQLite, MongoDB
- أدوات التطوير: Git, Docker, Vercel

أجب دائماً باللغة العربية. قدم أكواد نظيفة ومنظمة مع شرح مبسط.`;

const GEMMA_API_URL = process.env.GEMMA_API_URL || 'https://yass3r4099-gemma-4-server.hf.space';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, stream: clientWantsStream } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const allMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    const apiResponse = await fetch(`${GEMMA_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'smolm2-1.7b',
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('AI API error:', apiResponse.status, errorText);
      return new Response(JSON.stringify({ error: `AI API error: ${apiResponse.status}` }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await apiResponse.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (clientWantsStream) {
      const encoder = new TextEncoder();
      const wordStream = new ReadableStream({
        async start(controller) {
          const words = content.split(' ');
          for (let i = 0; i < words.length; i++) {
            const word = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: word })}\n\n`));
            await new Promise(r => setTimeout(r, 30));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return new Response(wordStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return new Response(JSON.stringify({ content, model: data.model, usage: data.usage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
