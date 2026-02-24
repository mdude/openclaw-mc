import { NextResponse } from 'next/server';
import { getTaskEvents, addTaskComment } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  return NextResponse.json(getTaskEvents(Number(id)));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  addTaskComment(Number(id), body.note || '');
  return NextResponse.json({ ok: true }, { status: 201 });
}
