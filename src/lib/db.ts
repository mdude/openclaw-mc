import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.MC_DB_PATH || path.join(process.cwd(), 'data', 'db.json');

interface DbSchema {
  tasks: any[];
  task_events: any[];
  events: any[];
  memory_entries: any[];
  _nextId: { tasks: number; task_events: number; events: number; memory_entries: number };
}

function loadDb(): DbSchema {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
  const empty: DbSchema = {
    tasks: [],
    task_events: [],
    events: [],
    memory_entries: [],
    _nextId: { tasks: 1, task_events: 1, events: 1, memory_entries: 1 },
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
  return empty;
}

function saveDb(db: DbSchema) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function now() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
}

// Tasks
export function getTasks(filters?: { status?: string; project?: string; assignee?: string }) {
  const db = loadDb();
  let tasks = db.tasks;
  if (filters?.status) tasks = tasks.filter(t => t.status === filters.status);
  if (filters?.project) tasks = tasks.filter(t => t.project === filters.project);
  if (filters?.assignee) tasks = tasks.filter(t => t.assignee === filters.assignee);
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  tasks.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
  return tasks;
}

export function createTask(data: any) {
  const db = loadDb();
  const task = {
    id: db._nextId.tasks++,
    title: data.title,
    description: data.description || null,
    instruction: data.instruction || null,
    status: data.status || 'active',
    priority: data.priority || 'medium',
    assignee: data.assignee || 'm8ke',
    project: data.project || null,
    tags: data.tags || null,
    due_date: data.due_date || null,
    created_at: now(),
    updated_at: now(),
  };
  db.tasks.push(task);
  db.task_events.push({
    id: db._nextId.task_events++,
    task_id: task.id,
    event_type: 'created',
    old_value: null,
    new_value: task.title,
    note: null,
    created_at: now(),
  });
  saveDb(db);
  return task;
}

export function updateTask(id: number, data: any) {
  const db = loadDb();
  const task = db.tasks.find((t: any) => t.id === id);
  if (!task) return null;
  const fields = ['title', 'description', 'instruction', 'status', 'priority', 'assignee', 'project', 'tags', 'due_date'];
  for (const f of fields) {
    if (data[f] !== undefined) {
      if (f === 'status' && data[f] !== task.status) {
        db.task_events.push({
          id: db._nextId.task_events++,
          task_id: id,
          event_type: 'status_change',
          old_value: task.status,
          new_value: data[f],
          note: null,
          created_at: now(),
        });
      }
      task[f] = data[f];
    }
  }
  task.updated_at = now();
  saveDb(db);
  return task;
}

export function deleteTask(id: number) {
  const db = loadDb();
  db.tasks = db.tasks.filter((t: any) => t.id !== id);
  db.task_events = db.task_events.filter((e: any) => e.task_id !== id);
  saveDb(db);
}

export function getTaskEvents(taskId: number) {
  const db = loadDb();
  return db.task_events.filter((e: any) => e.task_id === taskId).reverse();
}

export function addTaskComment(taskId: number, note: string) {
  const db = loadDb();
  db.task_events.push({
    id: db._nextId.task_events++,
    task_id: taskId,
    event_type: 'comment',
    old_value: null,
    new_value: null,
    note,
    created_at: now(),
  });
  saveDb(db);
}

// Events
export function getEvents(start?: string, end?: string) {
  const db = loadDb();
  let events = db.events;
  if (start) events = events.filter((e: any) => e.start_time >= start);
  if (end) events = events.filter((e: any) => e.start_time <= end);
  events.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
  return events;
}

export function createEvent(data: any) {
  const db = loadDb();
  const event = {
    id: db._nextId.events++,
    title: data.title,
    description: data.description || null,
    source: data.source || 'manual',
    source_id: data.source_id || null,
    start_time: data.start_time,
    end_time: data.end_time || null,
    recurrence: data.recurrence || null,
    color: data.color || null,
    created_at: now(),
  };
  db.events.push(event);
  saveDb(db);
  return event;
}

// Memory
export function searchMemory(query: string) {
  const db = loadDb();
  const q = query.toLowerCase();
  return db.memory_entries
    .filter((e: any) => e.content.toLowerCase().includes(q) || (e.section && e.section.toLowerCase().includes(q)))
    .slice(0, 20)
    .map((e: any) => ({ ...e, snippet: e.content.substring(0, 200) }));
}

export function reindexMemory(workspace: string) {
  const db = loadDb();
  db.memory_entries = [];
  db._nextId.memory_entries = 1;

  const files: string[] = [];
  const memoryFile = path.join(workspace, 'MEMORY.md');
  if (fs.existsSync(memoryFile)) files.push('MEMORY.md');
  const memoryDir = path.join(workspace, 'memory');
  if (fs.existsSync(memoryDir)) {
    for (const f of fs.readdirSync(memoryDir)) {
      if (f.endsWith('.md')) files.push(`memory/${f}`);
    }
  }

  let count = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(workspace, file), 'utf-8');
    const sections = content.split(/^## /m);
    for (const section of sections) {
      if (!section.trim()) continue;
      const lines = section.split('\n');
      const heading = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      if (!body) continue;
      db.memory_entries.push({
        id: db._nextId.memory_entries++,
        file_path: file,
        section: heading,
        content: body,
        indexed_at: now(),
      });
      count++;
    }
  }
  saveDb(db);
  return { indexed: count, files: files.length };
}

export function getMemoryFiles(workspace: string) {
  const files: string[] = [];
  const memoryFile = path.join(workspace, 'MEMORY.md');
  if (fs.existsSync(memoryFile)) files.push('MEMORY.md');
  const memoryDir = path.join(workspace, 'memory');
  if (fs.existsSync(memoryDir)) {
    for (const f of fs.readdirSync(memoryDir).sort().reverse()) {
      if (f.endsWith('.md')) files.push(`memory/${f}`);
    }
  }
  return files;
}
