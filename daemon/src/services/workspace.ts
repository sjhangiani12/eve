import { v4 as uuid } from 'uuid';
import { Repository, Workspace, CreateWorkspaceRequest } from '../types/index.js';
import { storage } from '../storage/index.js';
import { worktreeService } from './worktree.js';
import { sessionService } from './session.js';

export class WorkspaceService {
  /**
   * Create a new workspace with a git worktree and Claude Code session
   */
  async create(repository: Repository, request: CreateWorkspaceRequest): Promise<Workspace> {
    const workspaceId = uuid();
    const now = Date.now();

    // Create the git worktree
    const { worktreePath, branch } = await worktreeService.create(
      repository.rootPath,
      repository.id,
      workspaceId,
      request.name,
      request.baseBranch
    );

    // Calculate allocated port
    const existingWorkspaces = await storage.listWorkspaces(repository.id);
    const usedPorts = new Set(existingWorkspaces.map(w => w.allocatedPort).filter(Boolean));
    let allocatedPort = repository.config.portBase || 3000;
    const increment = repository.config.portIncrement || 10;

    while (usedPorts.has(allocatedPort)) {
      allocatedPort += increment;
    }

    // Create workspace record
    const workspace: Workspace = {
      id: workspaceId,
      repositoryId: repository.id,
      name: request.name,
      branchName: branch,
      worktreePath,
      tmuxSession: `eve-${workspaceId.slice(0, 8)}`,
      status: 'creating',
      allocatedPort,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    // Save workspace
    await storage.saveWorkspace(workspace);

    // Start Claude Code session
    try {
      await sessionService.startSession(workspace);
      workspace.status = 'idle';
      await storage.saveWorkspace(workspace);
    } catch (error) {
      workspace.status = 'error';
      workspace.metadata = { error: String(error) };
      await storage.saveWorkspace(workspace);
      throw error;
    }

    return workspace;
  }

  /**
   * Get a workspace by ID
   */
  async get(id: string): Promise<Workspace | null> {
    return storage.getWorkspace(id);
  }

  /**
   * List all workspaces, optionally filtered by repository
   */
  async list(repositoryId?: string): Promise<Workspace[]> {
    return storage.listWorkspaces(repositoryId);
  }

  /**
   * Archive a workspace (stop session, remove worktree)
   */
  async archive(id: string): Promise<void> {
    const workspace = await storage.getWorkspace(id);
    if (!workspace) {
      throw new Error(`Workspace ${id} not found`);
    }

    const repository = await storage.getRepository(workspace.repositoryId);
    if (!repository) {
      throw new Error(`Repository ${workspace.repositoryId} not found`);
    }

    // Stop the session
    await sessionService.stopSession(id);

    // Remove the worktree
    await worktreeService.remove(
      repository.rootPath,
      workspace.worktreePath,
      workspace.branchName
    );

    // Update workspace status
    workspace.status = 'archived';
    workspace.updatedAt = Date.now();
    await storage.saveWorkspace(workspace);
  }

  /**
   * Permanently delete a workspace
   */
  async delete(id: string): Promise<void> {
    const workspace = await storage.getWorkspace(id);
    if (!workspace) return;

    // Archive first if not already archived
    if (workspace.status !== 'archived') {
      await this.archive(id);
    }

    // Delete the workspace record
    await storage.deleteWorkspace(id);
  }

  /**
   * Send input to a workspace's Claude Code session
   */
  async sendInput(id: string, input: string): Promise<void> {
    const workspace = await storage.getWorkspace(id);
    if (!workspace) {
      throw new Error(`Workspace ${id} not found`);
    }

    if (workspace.status === 'archived') {
      throw new Error(`Workspace ${id} is archived`);
    }

    await sessionService.sendInput(id, input);

    // Update last activity
    workspace.lastActivityAt = Date.now();
    await storage.saveWorkspace(workspace);
  }

  /**
   * Resume a workspace (restart session if needed)
   */
  async resume(id: string): Promise<void> {
    const workspace = await storage.getWorkspace(id);
    if (!workspace) {
      throw new Error(`Workspace ${id} not found`);
    }

    if (workspace.status === 'archived') {
      throw new Error(`Cannot resume archived workspace`);
    }

    // Check if session is running, if not start it
    const session = sessionService.getSession(id);
    if (!session) {
      await sessionService.startSession(workspace);
    }

    workspace.lastActivityAt = Date.now();
    await storage.saveWorkspace(workspace);
  }
}

export const workspaceService = new WorkspaceService();
