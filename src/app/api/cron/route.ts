import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const cronFile = path.join(process.cwd(), 'data', 'cron-jobs-full.json');
  if (!fs.existsSync(cronFile)) {
    return NextResponse.json([]);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(cronFile, 'utf-8'));
    const jobs = data.jobs || data;
    return NextResponse.json(Array.isArray(jobs) ? jobs : []);
  } catch {
    return NextResponse.json([]);
  }
}
