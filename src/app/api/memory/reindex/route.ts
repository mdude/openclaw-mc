import { NextResponse } from 'next/server';
import { reindexMemory } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const WORKSPACE = process.env.MC_WORKSPACE || '/home/ubuntu/.openclaw/workspace';

export async function POST(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(reindexMemory(WORKSPACE));
}
