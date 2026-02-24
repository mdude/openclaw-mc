import { NextResponse } from 'next/server';
import { updateTask, deleteTask } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const task = updateTask(Number(id), body);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  deleteTask(Number(id));
  return NextResponse.json({ ok: true });
}
