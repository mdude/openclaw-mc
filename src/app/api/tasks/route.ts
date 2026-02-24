import { NextResponse } from 'next/server';
import { getTasks, createTask } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const tasks = getTasks({
    status: url.searchParams.get('status') || undefined,
    project: url.searchParams.get('project') || undefined,
    assignee: url.searchParams.get('assignee') || undefined,
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const task = createTask(body);
  return NextResponse.json(task, { status: 201 });
}
