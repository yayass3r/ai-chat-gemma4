import { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص في تطوير تطبيقات الويب Full-Stack. أنت خبير في:
- Frontend: React, Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Next.js API Routes, Prisma ORM, REST APIs
- قواعد البيانات: PostgreSQL, SQLite, MongoDB
- أدوات التطوير: Git, Docker, Vercel

أجب دائماً باللغة العربية. قدم أكواد نظيفة ومنظمة مع شرح مبسط.`;

const GEMMA_API_URL = process.env.GEMMA_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

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

    // Call Gemma 4 server via OpenAI-compatible API
    const apiResponse = await fetch(`${GEMMA_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma-4-2b-it',
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Gemma API error:', apiResponse.status, errorText);
      return new Response(JSON.stringify({ error: `Gemma API error: ${apiResponse.status}` }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Forward the stream from Gemma server to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = apiResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Parse SSE from Gemma and forward to client
            const chunk = new TextDecoder().decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    // Forward in our format
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                    );
                  }
                } catch {
                  // Forward raw data
                  controller.enqueue(encoder.encode(`${line}\n`));
                }
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
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
