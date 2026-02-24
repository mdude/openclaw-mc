# Mission Control — Product Spec

## Overview

Mission Control is a self-hosted web dashboard for Moxie to manage M8ke (AI agent). It provides visibility into tasks, scheduled jobs, and agent memory — all in one mobile-friendly interface.

**Users:** Moxie (primary), M8ke (programmatic access)
**URL:** `http://m8ke.com/missioncontrol`

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Framework | Next.js 14 (App Router) |
| Database | JSON file store (`data/db.json`) |
| Auth | Username/password (bcrypt), JWT session cookie + API key |
| Styling | Tailwind CSS 3 (mobile-first) |
| Reverse Proxy | nginx on port 80 |
| App Port | 3001 (systemd managed) |
| Design | Mobile-first responsive |

---

## Auth

### Login Flow
- Single user account (Moxie)
- Username stored in env var (`MC_USER`)
- Bcrypt-hashed password stored in `.passhash` file (avoids systemd `$` escaping issues)
- JWT session cookie (`mc_session`), HTTP-only, 24h expiry
- Middleware redirects unauthenticated requests to `/missioncontrol/login`

### API Auth
- API key via `Authorization: Bearer <key>` header for M8ke's programmatic access
- Key stored in env var (`MC_API_KEY`)
- Default key: `mc-api-key-m8ke-2024`

---

## Module 1: Tasks Board

### Task Lifecycle

```
Backlog → Active → In Progress → Done
  (drafts)  (ready)  (M8ke working)  (complete)
                                        ↓
                                   Reopen → Active (with comment)
```

- **Backlog** — Moxie's drafts, not ready for M8ke
- **Active** — Ready for M8ke to pick up (dispatched via heartbeat)
- **In Progress** — M8ke is working on it
- **Done** — Complete. Moxie can reopen with feedback comment → back to Active

### Data Model (JSON)

```json
{
  "id": 1,
  "title": "Task title",
  "description": "Optional description",
  "instruction": "Detailed instruction for M8ke (textarea)",
  "status": "backlog|active|in_progress|done",
  "priority": "low|medium|high|urgent",
  "assignee": "m8ke",
  "project": "project-name",
  "tags": null,
  "due_date": null,
  "created_at": "2026-02-24 12:00:00",
  "updated_at": "2026-02-24 12:00:00"
}
```

New tasks default to `active` status (Moxie's editing space → move to Active when ready).

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filter: `?status=`, `?project=`, `?assignee=`) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task fields |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/:id/events` | Task activity log |
| POST | `/api/tasks/:id/events` | Add comment (`{"note": "..."}`) |

### UI

**Mobile:**
- Vertical list grouped by status or project (toggle)
- Tap task → expand to show instruction + action buttons
- Bottom tab bar: Tasks | Calendar | Memory

**Desktop:**
- 4-column kanban: Backlog | Active | In Progress | Done
- Group toggle: By Status / By Project
- Click task → expand inline

**Edit Modal:**
- Full-screen overlay with title, project dropdown, priority, instruction textarea
- Projects auto-populated from `~/.openclaw/workspace/projects/`

**Done → Reopen:**
- Reopen button with comment textarea
- Comment logged to task events, task moves back to Active

### Task Dispatch (Heartbeat)

The main session heartbeat checks for Active and stuck In Progress tasks:

1. `GET /api/tasks?status=active` and `GET /api/tasks?status=in_progress`
2. For each task, match `task.project` → project's `discord_channel_id` (from README.md)
3. Send clean task message to matched Discord channel via `message` tool
4. Update status to `in_progress`
5. Channel session works the task, then updates status to `done` via API

### Project → Channel Mapping

Stored in each project's `README.md`:
```
**Discord:** #channel-name (channel-id)
```

Discovered at runtime via `GET /api/projects` which parses all project READMEs.

---

## Module 2: Calendar

### Data Model (JSON)

```json
{
  "id": 1,
  "title": "Event title",
  "description": null,
  "source": "manual|cron|task",
  "source_id": null,
  "start_time": "2026-02-24T10:00:00Z",
  "end_time": null,
  "recurrence": null,
  "color": null,
  "created_at": "2026-02-24 12:00:00"
}
```

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List events (`?start=`, `?end=`) |
| POST | `/api/events` | Create event |

### UI
- Month grid view with event dots
- Navigation arrows for month switching
- Today highlighted with blue ring
- Upcoming events list below calendar

---

## Module 3: Memory Browser

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory/search?q=` | LIKE search across indexed memory entries |
| GET | `/api/memory/files` | List all memory files |
| GET | `/api/memory/files/:path` | Get file content |
| PUT | `/api/memory/files/:path` | Update file content |
| POST | `/api/memory/reindex` | Re-index all memory files from disk |

### Indexing
- Scans `MEMORY.md` + `memory/*.md` from workspace
- Splits by `##` headings into entries
- Stored in JSON db for search
- Re-indexes on first load and after edits

### UI

**Mobile:** Search bar + file list, tap to view/edit

**Desktop:** Two-panel — file tree on left, content viewer/editor on right

---

## Additional APIs

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects with status, description, Discord mapping |

Auto-discovers from `~/.openclaw/workspace/projects/*/README.md`.

---

## Navigation

### Mobile
- Bottom tab bar: **Tasks** | **Calendar** | **Memory**

### Desktop
- Left sidebar with nav links
- Active tab highlighted

---

## Deployment

### Architecture

```
Internet → nginx (port 80) → reverse proxy by path
  /missioncontrol/  →  localhost:3001 (Mission Control)
  /                  →  302 redirect to /missioncontrol
```

**Domain:** `m8ke.com`

### Key Files

| File | Purpose |
|------|---------|
| `next.config.js` | `basePath: '/missioncontrol'` |
| `.passhash` | Bcrypt hash of login password |
| `.env.systemd` | Non-sensitive env vars for systemd |
| `data/db.json` | All application data |
| `/etc/systemd/system/mission-control.service` | systemd service |
| `/etc/nginx/sites-available/m8ke.com` | nginx reverse proxy |

### systemd Service

```ini
[Unit]
Description=Mission Control Dashboard
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/projects/mission-control
ExecStart=/home/ubuntu/projects/mission-control/node_modules/.bin/next start -p 3001
EnvironmentFile=/home/ubuntu/projects/mission-control/.env.systemd
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Convention for Future Apps

| App | Path | Internal Port |
|-----|------|---------------|
| Mission Control | `/missioncontrol` | 3001 |
| (reserved) | `/<app-name>` | 3002+ |

### Custom Commands

- **`/projects`** — List all projects with status
- **`/project <name>`** — Create new project with Discord channel mapping

---

## Phase 2 Modules (Future)

### Team (after multi-agent)
- Visual org chart of sub-agents
- Per-agent status, model, last activity

### Content Pipeline
- Kanban: Idea → Draft → Review → Published

---

## Open Questions

- [ ] HTTPS / SSL via Let's Encrypt?
- [ ] Real-time updates (WebSocket) or polling?
- [ ] Notifications when task completes?
- [ ] Google Calendar integration?
