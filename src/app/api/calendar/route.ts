import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.MC_DB_PATH || path.join(process.cwd(), 'data', 'db.json');

// Parse cron expression to get next occurrences in a date range
function expandCron(expr: string, tz: string | undefined, start: Date, end: Date): Date[] {
  // Simple cron parser for common patterns: "M H * * *" and "M H * * D"
  const parts = expr.split(/\s+/);
  if (parts.length < 5) return [];
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  while (current <= end && dates.length < 100) {
    const d = new Date(current);
    
    // Check month
    const monthMatch = month === '*' || parseInt(month) === d.getMonth() + 1;
    // Check day of month
    const domMatch = dayOfMonth === '*' || parseInt(dayOfMonth) === d.getDate();
    // Check day of week
    const dowMatch = dayOfWeek === '*' || parseInt(dayOfWeek) === d.getDay();
    
    if (monthMatch && domMatch && dowMatch) {
      const h = parseInt(hour) || 0;
      const m = parseInt(minute) || 0;
      const eventDate = new Date(d);
      eventDate.setHours(h, m, 0, 0);
      
      // Rough timezone offset (tz is like "Asia/Shanghai" = UTC+8)
      if (tz === 'Asia/Shanghai') {
        eventDate.setHours(eventDate.getHours() - 8);
      }
      
      if (eventDate >= start && eventDate <= end) {
        dates.push(eventDate);
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function GET(req: Request) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const url = new URL(req.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  
  const start = startParam ? new Date(startParam) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endParam ? new Date(endParam) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  
  const events: any[] = [];
  
  // 1. Cron jobs - read from a cached file that gets updated by the agent
  const cronFile = path.join(process.cwd(), 'data', 'cron-jobs.json');
  if (fs.existsSync(cronFile)) {
    try {
      const jobs = JSON.parse(fs.readFileSync(cronFile, 'utf-8'));
      for (const job of jobs) {
        if (!job.enabled) continue;
        if (job.schedule?.kind === 'cron' && job.schedule?.expr) {
          const occurrences = expandCron(job.schedule.expr, job.schedule.tz, start, end);
          for (const date of occurrences) {
            events.push({
              id: `cron-${job.jobId || job.id}-${date.toISOString()}`,
              title: `⏰ ${job.name || job.jobId || job.id}`,
              start_time: date.toISOString(),
              type: 'cron',
              color: job.state?.lastStatus === 'error' ? '#ef4444' : '#8b5cf6',
              meta: {
                schedule: job.schedule.expr,
                tz: job.schedule.tz,
                lastStatus: job.state?.lastStatus,
                lastError: job.state?.lastError,
              }
            });
          }
        }
      }
    } catch {}
  }
  
  // 2. Task timeline - read from db.json
  if (fs.existsSync(DB_PATH)) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      
      // Task creation events
      for (const task of (db.tasks || [])) {
        const created = new Date(task.created_at.replace(' ', 'T') + 'Z');
        if (created >= start && created <= end) {
          events.push({
            id: `task-created-${task.id}`,
            title: `📋 Created: ${task.title}`,
            start_time: created.toISOString(),
            type: 'task-created',
            color: '#3b82f6',
            meta: { taskId: task.id, project: task.project, status: task.status }
          });
        }
      }
      
      // Task status change events (from task_events)
      for (const evt of (db.task_events || [])) {
        if (evt.event_type !== 'status_change') continue;
        const evtDate = new Date(evt.created_at.replace(' ', 'T') + 'Z');
        if (evtDate >= start && evtDate <= end) {
          const task = (db.tasks || []).find((t: any) => t.id === evt.task_id);
          const taskTitle = task?.title || `Task #${evt.task_id}`;
          
          let icon = '🔄';
          let color = '#6b7280';
          if (evt.new_value === 'done') { icon = '✅'; color = '#22c55e'; }
          else if (evt.new_value === 'in_progress') { icon = '🚀'; color = '#f59e0b'; }
          else if (evt.new_value === 'active') { icon = '▶️'; color = '#3b82f6'; }
          
          events.push({
            id: `task-event-${evt.id}`,
            title: `${icon} ${taskTitle} → ${evt.new_value}`,
            start_time: evtDate.toISOString(),
            type: 'task-status',
            color,
            meta: { taskId: evt.task_id, from: evt.old_value, to: evt.new_value }
          });
        }
      }
    } catch {}
  }
  
  // Sort by time
  events.sort((a, b) => a.start_time.localeCompare(b.start_time));
  
  return NextResponse.json(events);
}
