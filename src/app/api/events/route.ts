import { NextResponse } from 'next/server';
import { getEvents, createEvent } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  return NextResponse.json(getEvents(url.searchParams.get('start') || undefined, url.searchParams.get('end') || undefined));
}

export async function POST(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.title || !body.start_time) return NextResponse.json({ error: 'title and start_time required' }, { status: 400 });
  return NextResponse.json(createEvent(body), { status: 201 });
}
