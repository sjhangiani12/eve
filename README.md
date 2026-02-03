# Eve

Mobile-first workspace orchestration for Claude Code. Run isolated Claude Code instances per git worktree on your Mac, control them from your iPhone.

## Architecture

```
┌─────────────────┐         Tailscale          ┌─────────────────────────────┐
│   iOS App       │◄──────────────────────────►│   Mac (daemon)              │
│   (SwiftUI)     │        WebSocket +         │                             │
│                 │        REST API            │   ┌─────────────────────┐   │
│  • Dashboard    │                            │   │  eve-daemon         │   │
│  • Chat View    │                            │   │  (Node.js)          │   │
│  • Terminal     │                            │   └──────────┬──────────┘   │
└─────────────────┘                            │              │              │
                                               │   ┌──────────▼──────────┐   │
                                               │   │  tmux sessions      │   │
                                               │   │  └── claude code    │   │
                                               │   │      (per worktree) │   │
                                               │   └─────────────────────┘   │
                                               └─────────────────────────────┘
```

## Concepts

- **Repository**: A git repo registered with Eve (e.g., your monorepo)
- **Workspace**: An isolated git worktree with its own Claude Code instance

## Getting Started

### 1. Start the daemon on your Mac

```bash
cd daemon
pnpm install
pnpm dev
```

The daemon runs on port 4778 by default.

### 2. Register a repository

```bash
curl -X POST http://localhost:4778/repositories \
  -H "Content-Type: application/json" \
  -d '{"name": "my-project", "rootPath": "/path/to/your/repo"}'
```

### 3. Create a workspace

```bash
curl -X POST http://localhost:4778/repositories/{repoId}/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name": "feature-auth"}'
```

This creates a git worktree at `~/.eve/worktrees/{repoId}/{workspaceId}` with branch `eve/feature-auth`, and starts a Claude Code session in tmux.

### 4. Connect from iOS

Build and run the iOS app, enter your Mac's Tailscale IP, and start working.

## API

### Repositories

- `GET /repositories` - List all repositories
- `POST /repositories` - Register a repository
- `GET /repositories/:id` - Get repository with workspaces
- `DELETE /repositories/:id` - Remove repository and all workspaces

### Workspaces

- `GET /workspaces` - List all workspaces
- `GET /workspaces/:id` - Get workspace details
- `POST /repositories/:repoId/workspaces` - Create workspace
- `POST /workspaces/:id/input` - Send input to Claude
- `POST /workspaces/:id/resume` - Resume workspace session
- `POST /workspaces/:id/archive` - Archive workspace
- `DELETE /workspaces/:id` - Delete workspace permanently

### WebSocket

Connect to `ws://host:4778/ws?workspaceId={id}` for real-time Claude Code output.

## Data Storage

All Eve data is stored in `~/.eve/`:

```
~/.eve/
├── repositories/     # Repository metadata
├── workspaces/       # Workspace metadata
└── worktrees/        # Actual git worktrees
    └── {repoId}/
        └── {workspaceId}/
```

## License

MIT
