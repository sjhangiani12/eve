import { v4 as uuid } from 'uuid';
import { Repository, CreateRepositoryRequest } from '../types/index.js';
import { storage } from '../storage/index.js';
import { worktreeService } from './worktree.js';
import { workspaceService } from './workspace.js';

export class RepositoryService {
  /**
   * Register a new repository
   */
  async create(request: CreateRepositoryRequest): Promise<Repository> {
    // Validate the path is a git repo
    const isGitRepo = await worktreeService.isGitRepo(request.rootPath);
    if (!isGitRepo) {
      throw new Error(`${request.rootPath} is not a git repository`);
    }

    const now = Date.now();

    const repository: Repository = {
      id: uuid(),
      name: request.name,
      rootPath: request.rootPath,
      config: request.config || {},
      createdAt: now,
      updatedAt: now,
    };

    await storage.saveRepository(repository);
    return repository;
  }

  /**
   * Get a repository by ID
   */
  async get(id: string): Promise<Repository | null> {
    return storage.getRepository(id);
  }

  /**
   * List all repositories
   */
  async list(): Promise<Repository[]> {
    return storage.listRepositories();
  }

  /**
   * Update a repository
   */
  async update(id: string, updates: Partial<Pick<Repository, 'name' | 'config'>>): Promise<Repository> {
    const repository = await storage.getRepository(id);
    if (!repository) {
      throw new Error(`Repository ${id} not found`);
    }

    if (updates.name) repository.name = updates.name;
    if (updates.config) repository.config = { ...repository.config, ...updates.config };
    repository.updatedAt = Date.now();

    await storage.saveRepository(repository);
    return repository;
  }

  /**
   * Delete a repository and all its workspaces
   */
  async delete(id: string): Promise<void> {
    const repository = await storage.getRepository(id);
    if (!repository) return;

    // Delete all workspaces
    const workspaces = await workspaceService.list(id);
    for (const workspace of workspaces) {
      await workspaceService.delete(workspace.id);
    }

    // Delete the repository
    await storage.deleteRepository(id);
  }

  /**
   * Get repository with its workspaces
   */
  async getWithWorkspaces(id: string): Promise<{ repository: Repository; workspaces: import('../types/index.js').Workspace[] } | null> {
    const repository = await storage.getRepository(id);
    if (!repository) return null;

    const workspaces = await workspaceService.list(id);
    return { repository, workspaces };
  }
}

export const repositoryService = new RepositoryService();
