import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(ip, 60, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_chat_messages')
      .select('*')
      .eq('project_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(ip, 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { conversation_id, role, content, user_id } = body;

    // Validation
    if (!conversation_id || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields: conversation_id, role, content' }, { status: 400 });
    }
    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (typeof content !== 'string' || content.length === 0 || content.length > 10000) {
      return NextResponse.json({ error: 'Invalid content (1-10000 chars)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_chat_messages')
      .insert({
        project_id: conversation_id,
        user_id: user_id || '00000000-0000-0000-0000-000000000000',
        role,
        content: content.slice(0, 10000),
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabaseAdmin
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
