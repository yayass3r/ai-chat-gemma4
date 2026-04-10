import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS } from '@/lib/constants';
import { rateLimit } from '@/lib/rate-limit';

const AI_API_URL = process.env.GEMMA_API_URL || '';

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!rateLimit(ip, 20, 60000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { messages, stream: clientWantsStream } = body;

    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }
    if (messages.length > 50) {
      return NextResponse.json({ error: 'Too many messages (max 50)' }, { status: 400 });
    }
    for (const m of messages) {
      if (typeof m.content !== 'string' || m.content.length > 10000) {
        return NextResponse.json({ error: 'Invalid message content' }, { status: 400 });
      }
    }

    if (!AI_API_URL) {
      return NextResponse.json({ error: 'AI API not configured' }, { status: 503 });
    }

    const allMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content.slice(0, 10000),
      })),
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2min timeout

    try {
      const apiResponse = await fetch(`${AI_API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: allMessages,
          temperature: AI_TEMPERATURE,
          max_tokens: AI_MAX_TOKENS,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('AI API error:', apiResponse.status, errorText);
        return NextResponse.json({ error: `AI API error: ${apiResponse.status}` }, { status: 502 });
      }

      const data = await apiResponse.json();
      const content = data.choices?.[0]?.message?.content || '';

      return NextResponse.json({ content, model: data.model, usage: data.usage });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'AI request timed out' }, { status: 504 });
    }
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
