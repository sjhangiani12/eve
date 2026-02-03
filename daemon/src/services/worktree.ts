import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { storage } from '../storage/index.js';

const execAsync = promisify(exec);

export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
}

export class WorktreeService {
  /**
   * Create a new git worktree for a workspace
   */
  async create(
    repoPath: string,
    repositoryId: string,
    workspaceId: string,
    branchName: string,
    baseBranch?: string
  ): Promise<{ worktreePath: string; branch: string }> {
    const worktreePath = storage.getWorktreePath(repositoryId, workspaceId);

    // Ensure parent directory exists
    const parentDir = storage.getWorktreesBasePath();
    await mkdir(parentDir, { recursive: true });
    await mkdir(storage.getWorktreePath(repositoryId, ''), { recursive: true });

    // Get the base branch (default to current HEAD)
    const base = baseBranch || (await this.getCurrentBranch(repoPath));

    // Create the worktree with a new branch
    const fullBranchName = `eve/${branchName}`;

    try {
      await execAsync(
        `git worktree add -b "${fullBranchName}" "${worktreePath}" "${base}"`,
        { cwd: repoPath }
      );
    } catch (error: unknown) {
      // If branch already exists, try without -b flag
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        await execAsync(
          `git worktree add "${worktreePath}" "${fullBranchName}"`,
          { cwd: repoPath }
        );
      } else {
        throw error;
      }
    }

    return {
      worktreePath,
      branch: fullBranchName,
    };
  }

  /**
   * Remove a git worktree
   */
  async remove(repoPath: string, worktreePath: string, branchName: string): Promise<void> {
    try {
      // Try graceful removal first
      await execAsync(`git worktree remove "${worktreePath}" --force`, {
        cwd: repoPath,
      });
    } catch {
      // If git worktree remove fails, manually clean up
      if (existsSync(worktreePath)) {
        await rm(worktreePath, { recursive: true, force: true });
      }
      // Prune stale worktree references
      await execAsync('git worktree prune', { cwd: repoPath });
    }

    // Optionally delete the branch
    try {
      await execAsync(`git branch -D "${branchName}"`, { cwd: repoPath });
    } catch {
      // Branch might not exist or might be checked out elsewhere
    }
  }

  /**
   * List all worktrees for a repository
   */
  async list(repoPath: string): Promise<WorktreeInfo[]> {
    const { stdout } = await execAsync('git worktree list --porcelain', {
      cwd: repoPath,
    });

    const worktrees: WorktreeInfo[] = [];
    let current: Partial<WorktreeInfo> = {};

    for (const line of stdout.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) {
          worktrees.push(current as WorktreeInfo);
        }
        current = { path: line.slice(9) };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.slice(5);
      } else if (line.startsWith('branch ')) {
        current.branch = line.slice(7).replace('refs/heads/', '');
      }
    }

    if (current.path) {
      worktrees.push(current as WorktreeInfo);
    }

    return worktrees;
  }

  /**
   * Get the current branch of a repository
   */
  async getCurrentBranch(repoPath: string): Promise<string> {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
    });
    return stdout.trim();
  }

  /**
   * Get git status for a worktree
   */
  async getStatus(worktreePath: string): Promise<{ modified: number; untracked: number; staged: number }> {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: worktreePath,
    });

    let modified = 0;
    let untracked = 0;
    let staged = 0;

    for (const line of stdout.split('\n')) {
      if (!line) continue;
      const status = line.slice(0, 2);
      if (status.includes('?')) untracked++;
      else if (status[0] !== ' ') staged++;
      else if (status[1] !== ' ') modified++;
    }

    return { modified, untracked, staged };
  }

  /**
   * Get diff for a worktree
   */
  async getDiff(worktreePath: string): Promise<string> {
    const { stdout } = await execAsync('git diff', { cwd: worktreePath });
    return stdout;
  }

  /**
   * Check if a path is a git repository
   */
  async isGitRepo(path: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: path });
      return true;
    } catch {
      return false;
    }
  }
}

export const worktreeService = new WorktreeService();
