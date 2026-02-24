import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const WORKSPACE = process.env.MC_WORKSPACE || '/home/ubuntu/.openclaw/workspace';

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { path: segments } = await params;
  const filePath = path.join(WORKSPACE, ...segments);

  // Security: ensure we stay within workspace
  if (!filePath.startsWith(WORKSPACE)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const content = fs.readFileSync(filePath, 'utf-8');
  return NextResponse.json({ path: segments.join('/'), content });
}

export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { path: segments } = await params;
  const filePath = path.join(WORKSPACE, ...segments);
  if (!filePath.startsWith(WORKSPACE)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  fs.writeFileSync(filePath, body.content, 'utf-8');
  return NextResponse.json({ ok: true });
}
