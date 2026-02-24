# Mission Control

A lightweight dashboard for managing AI agent tasks, calendar events, and memory — built for [OpenClaw](https://github.com/openclaw/openclaw) workflows.

## Features

- **Task Management** — Create, assign, prioritize, and track tasks with status workflows and event history
- **Calendar** — View and create events with timeline display
- **Memory Browser** — Search and browse agent memory files (MEMORY.md + daily notes)
- **API-first** — Full REST API with Bearer token auth for agent integration
- **Login** — Password-protected dashboard with JWT sessions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | bcryptjs + JSON Web Tokens |
| Database | JSON file (zero-dependency, `data/db.json`) |
| Runtime | Node.js 22+ |

## Prerequisites

- Node.js 22+ (LTS recommended)
- npm

## Installation

```bash
git clone https://github.com/mdude/openclaw-mc.git
cd openclaw-mc
npm install
```

## Configuration

Copy the example env and edit it:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `MC_USER` | Login username | `moxie` |
| `MC_PASS_HASH` | bcrypt hash of login password | _(generate with `npx bcryptjs-cli hash <password>`)_ |
| `MC_JWT_SECRET` | Secret for signing JWT tokens | _(any random string)_ |
| `MC_API_KEY` | Bearer token for API access | `mc-api-key-change-me` |
| `MC_WORKSPACE` | Path to OpenClaw workspace | `/home/ubuntu/.openclaw/workspace` |

### Generating a password hash

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('your-password', 10))"
```

Put the output in `MC_PASS_HASH` (in `.env`) or `.passhash`.

## Development

```bash
npm run dev
```

Opens at `http://localhost:3001/missioncontrol`

## Production Build & Deploy

```bash
npm run build
npm run start
```

### Systemd Service (Linux)

Create `/etc/systemd/system/mission-control.service`:

```ini
[Unit]
Description=Mission Control Dashboard
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/openclaw-mc
ExecStart=/path/to/openclaw-mc/node_modules/.bin/next start -p 3001
EnvironmentFile=/path/to/openclaw-mc/.env
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mission-control
```

### Nginx Reverse Proxy (Optional)

To serve behind nginx at `/missioncontrol`:

```nginx
location /missioncontrol {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> The app is configured with `basePath: '/missioncontrol'` in `next.config.js`.

## API

All API endpoints require either a valid JWT cookie (web login) or `Authorization: Bearer <MC_API_KEY>` header.

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/missioncontrol/api/tasks` | List tasks (query: `status`, `project`, `assignee`) |
| `POST` | `/missioncontrol/api/tasks` | Create task (`title` required) |
| `PATCH` | `/missioncontrol/api/tasks/:id` | Update task fields |
| `DELETE` | `/missioncontrol/api/tasks/:id` | Delete task |
| `GET` | `/missioncontrol/api/tasks/:id/events` | Task event history |
| `POST` | `/missioncontrol/api/tasks/:id/events` | Add comment to task |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/missioncontrol/api/projects` | List projects (reads from workspace) |

### Events (Calendar)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/missioncontrol/api/events` | List events (query: `start`, `end`) |
| `POST` | `/missioncontrol/api/events` | Create event |

### Memory

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/missioncontrol/api/memory/files` | List memory files |
| `GET` | `/missioncontrol/api/memory/files/:path` | Read memory file content |
| `GET` | `/missioncontrol/api/memory/search?q=...` | Search memory entries |
| `POST` | `/missioncontrol/api/memory/reindex` | Re-index memory files |

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Main pages (tasks, calendar, memory)
│   │   ├── api/               # REST API routes
│   │   └── login/             # Login page
│   ├── components/            # Shared UI components
│   ├── lib/                   # Database, auth, API helpers
│   └── middleware.ts          # Auth middleware
├── data/                      # Runtime data (db.json, gitignored)
├── next.config.js             # Base path + standalone output
├── tailwind.config.ts
└── tsconfig.json
```

## License

MIT
