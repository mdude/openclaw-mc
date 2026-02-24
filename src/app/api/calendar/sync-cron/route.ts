import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const jobs = body.jobs || [];
  
  const cronFile = path.join(process.cwd(), 'data', 'cron-jobs.json');
  fs.mkdirSync(path.dirname(cronFile), { recursive: true });
  fs.writeFileSync(cronFile, JSON.stringify(jobs, null, 2));
  
  return NextResponse.json({ ok: true, synced: jobs.length });
}
