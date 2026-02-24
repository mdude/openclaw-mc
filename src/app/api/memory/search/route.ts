import { NextResponse } from 'next/server';
import { searchMemory } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q) return NextResponse.json([]);
  return NextResponse.json(searchMemory(q));
}
