import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversation_id, role, content, user_id } = body;

    if (!conversation_id || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_chat_messages')
      .insert({
        project_id: conversation_id,
        user_id: user_id || '00000000-0000-0000-0000-000000000000',
        role,
        content,
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
