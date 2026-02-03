import { z } from 'zod';

// Repository - represents a git repo that can have multiple workspaces
export const RepositorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  rootPath: z.string(), // Absolute path to the git repo
  config: z.object({
    setupScript: z.string().optional(),
    archiveScript: z.string().optional(),
    portBase: z.number().default(3000),
    portIncrement: z.number().default(10),
    env: z.record(z.string()).optional(),
  }).default({}),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Repository = z.infer<typeof RepositorySchema>;

// Workspace status
export const WorkspaceStatus = z.enum([
  'creating',    // Worktree being created, Claude Code launching
  'active',      // Claude is processing/responding
  'waiting',     // Claude is waiting for user input
  'idle',        // Claude finished, waiting for next prompt
  'error',       // Something went wrong
  'archived',    // Workspace has been archived
]);

export type WorkspaceStatus = z.infer<typeof WorkspaceStatus>;

// Workspace - an isolated git worktree with a Claude Code instance
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  name: z.string(),
  branchName: z.string(), // e.g., "eve/feature-auth"
  worktreePath: z.string(), // Absolute path to the worktree
  tmuxSession: z.string(), // tmux session name
  status: WorkspaceStatus,
  allocatedPort: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastActivityAt: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

// API request/response types
export const CreateRepositoryRequest = z.object({
  name: z.string(),
  rootPath: z.string(),
  config: RepositorySchema.shape.config.optional(),
});

export type CreateRepositoryRequest = z.infer<typeof CreateRepositoryRequest>;

export const CreateWorkspaceRequest = z.object({
  name: z.string(),
  baseBranch: z.string().optional(), // Branch to create worktree from, defaults to current HEAD
});

export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequest>;

// WebSocket message types
export const WsMessageType = z.enum([
  'output',      // Claude Code output (stdout)
  'status',      // Status change
  'error',       // Error message
  'connected',   // Initial connection acknowledgment
]);

export type WsMessageType = z.infer<typeof WsMessageType>;

export const WsMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('output'),
    data: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('status'),
    status: WorkspaceStatus,
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('error'),
    error: z.string(),
    timestamp: z.number(),
  }),
  z.object({
    type: z.literal('connected'),
    workspaceId: z.string(),
    timestamp: z.number(),
  }),
]);

export type WsMessage = z.infer<typeof WsMessage>;
