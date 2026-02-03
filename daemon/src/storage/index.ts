import { mkdir, readFile, writeFile, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Repository, RepositorySchema, Workspace, WorkspaceSchema } from '../types/index.js';

const EVE_HOME = join(homedir(), '.eve');

export class Storage {
  private basePath: string;
  private repositoriesPath: string;
  private workspacesPath: string;
  private worktreesPath: string;

  constructor() {
    this.basePath = EVE_HOME;
    this.repositoriesPath = join(this.basePath, 'repositories');
    this.workspacesPath = join(this.basePath, 'workspaces');
    this.worktreesPath = join(this.basePath, 'worktrees');
  }

  async initialize(): Promise<void> {
    await mkdir(this.repositoriesPath, { recursive: true });
    await mkdir(this.workspacesPath, { recursive: true });
    await mkdir(this.worktreesPath, { recursive: true });
  }

  getWorktreesBasePath(): string {
    return this.worktreesPath;
  }

  // Repository operations
  async saveRepository(repo: Repository): Promise<void> {
    const filePath = join(this.repositoriesPath, `${repo.id}.json`);
    await writeFile(filePath, JSON.stringify(repo, null, 2));
  }

  async getRepository(id: string): Promise<Repository | null> {
    const filePath = join(this.repositoriesPath, `${id}.json`);
    if (!existsSync(filePath)) return null;

    const data = await readFile(filePath, 'utf-8');
    return RepositorySchema.parse(JSON.parse(data));
  }

  async listRepositories(): Promise<Repository[]> {
    if (!existsSync(this.repositoriesPath)) return [];

    const files = await readdir(this.repositoriesPath);
    const repos: Repository[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const data = await readFile(join(this.repositoriesPath, file), 'utf-8');
      repos.push(RepositorySchema.parse(JSON.parse(data)));
    }

    return repos.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteRepository(id: string): Promise<void> {
    const filePath = join(this.repositoriesPath, `${id}.json`);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  // Workspace operations
  async saveWorkspace(workspace: Workspace): Promise<void> {
    const filePath = join(this.workspacesPath, `${workspace.id}.json`);
    await writeFile(filePath, JSON.stringify(workspace, null, 2));
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const filePath = join(this.workspacesPath, `${id}.json`);
    if (!existsSync(filePath)) return null;

    const data = await readFile(filePath, 'utf-8');
    return WorkspaceSchema.parse(JSON.parse(data));
  }

  async listWorkspaces(repositoryId?: string): Promise<Workspace[]> {
    if (!existsSync(this.workspacesPath)) return [];

    const files = await readdir(this.workspacesPath);
    const workspaces: Workspace[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const data = await readFile(join(this.workspacesPath, file), 'utf-8');
      const workspace = WorkspaceSchema.parse(JSON.parse(data));

      if (!repositoryId || workspace.repositoryId === repositoryId) {
        workspaces.push(workspace);
      }
    }

    return workspaces.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  async deleteWorkspace(id: string): Promise<void> {
    const filePath = join(this.workspacesPath, `${id}.json`);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  // Get worktree path for a workspace
  getWorktreePath(repositoryId: string, workspaceId: string): string {
    return join(this.worktreesPath, repositoryId, workspaceId);
  }
}

export const storage = new Storage();
