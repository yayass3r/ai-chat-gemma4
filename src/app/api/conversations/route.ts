import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Conversations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description } = body;

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({
        user_id: DEFAULT_USER_ID,
        name: title || 'محادثة جديدة',
        description: description || '',
        status: 'active',
        template: 'chat',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Conversations POST error:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await supabaseAdmin.from('ai_chat_messages').delete().eq('project_id', id);
    await supabaseAdmin.from('projects').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conversations DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
