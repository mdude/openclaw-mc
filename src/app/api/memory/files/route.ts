import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getMemoryFiles } from '@/lib/db';

const WORKSPACE = process.env.MC_WORKSPACE || '/home/ubuntu/.openclaw/workspace';

export async function GET(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(getMemoryFiles(WORKSPACE));
}
