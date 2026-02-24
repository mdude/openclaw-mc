import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const WORKSPACE = process.env.MC_WORKSPACE || '/home/ubuntu/.openclaw/workspace';
const PROJECTS_DIR = path.join(WORKSPACE, 'projects');

export async function GET(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects: { name: string; status: string; description: string; discord_channel?: string; discord_channel_id?: string }[] = [];

  if (fs.existsSync(PROJECTS_DIR)) {
    for (const dir of fs.readdirSync(PROJECTS_DIR).sort()) {
      const readmePath = path.join(PROJECTS_DIR, dir, 'README.md');
      let status = 'Unknown';
      let description = '';
      let discord_channel: string | undefined;
      let discord_channel_id: string | undefined;
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf-8');
        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
        if (statusMatch) status = statusMatch[1].trim();
        const discordMatch = content.match(/\*\*Discord:\*\*\s*#(\S+)\s*\((\d+)\)/);
        if (discordMatch) {
          discord_channel = discordMatch[1];
          discord_channel_id = discordMatch[2];
        }
        // First non-heading, non-metadata line as description
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('**Status') && !trimmed.startsWith('**Discord') && !trimmed.startsWith('---')) {
            description = trimmed;
            break;
          }
        }
      }
      projects.push({ name: dir, status, description, discord_channel, discord_channel_id });
    }
  }

  return NextResponse.json(projects);
}
