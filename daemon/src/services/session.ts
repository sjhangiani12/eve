import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { Workspace, WorkspaceStatus, WsMessage } from '../types/index.js';
import { storage } from '../storage/index.js';

const execAsync = promisify(exec);

interface ManagedSession {
  workspace: Workspace;
  process: ChildProcess | null;
  emitter: EventEmitter;
}

export class SessionService {
  private sessions: Map<string, ManagedSession> = new Map();

  /**
   * Start a Claude Code session in a tmux session for a workspace
   */
  async startSession(workspace: Workspace): Promise<void> {
    const tmuxSession = workspace.tmuxSession;

    // Check if tmux session already exists
    const exists = await this.tmuxSessionExists(tmuxSession);
    if (exists) {
      // Attach to existing session
      await this.attachToSession(workspace);
      return;
    }

    // Create new tmux session with Claude Code
    // Using --output-format stream-json for structured output
    const claudeCmd = `claude --output-format stream-json`;

    await execAsync(
      `tmux new-session -d -s "${tmuxSession}" -c "${workspace.worktreePath}" "${claudeCmd}"`,
    );

    // Set up session tracking
    const emitter = new EventEmitter();
    this.sessions.set(workspace.id, {
      workspace,
      process: null,
      emitter,
    });

    // Start capturing output
    this.startOutputCapture(workspace.id, tmuxSession);

    // Update workspace status
    await this.updateWorkspaceStatus(workspace.id, 'idle');
  }

  /**
   * Attach to an existing tmux session
   */
  private async attachToSession(workspace: Workspace): Promise<void> {
    const emitter = new EventEmitter();
    this.sessions.set(workspace.id, {
      workspace,
      process: null,
      emitter,
    });

    // Start capturing output
    this.startOutputCapture(workspace.id, workspace.tmuxSession);
  }

  /**
   * Send input to a workspace's Claude Code session
   */
  async sendInput(workspaceId: string, input: string): Promise<void> {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      throw new Error(`No session found for workspace ${workspaceId}`);
    }

    const workspace = await storage.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Send input to tmux session
    // Escape special characters and send
    const escapedInput = input.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    await execAsync(
      `tmux send-keys -t "${workspace.tmuxSession}" "${escapedInput}" Enter`,
    );

    // Update status to active
    await this.updateWorkspaceStatus(workspaceId, 'active');
  }

  /**
   * Stop a workspace's session
   */
  async stopSession(workspaceId: string): Promise<void> {
    const session = this.sessions.get(workspaceId);
    if (!session) return;

    // Kill tmux session
    try {
      await execAsync(`tmux kill-session -t "${session.workspace.tmuxSession}"`);
    } catch {
      // Session might already be dead
    }

    // Clean up
    session.emitter.removeAllListeners();
    this.sessions.delete(workspaceId);
  }

  /**
   * Subscribe to output from a workspace
   */
  subscribe(workspaceId: string, callback: (message: WsMessage) => void): () => void {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      // Create a placeholder session for subscription
      const emitter = new EventEmitter();
      this.sessions.set(workspaceId, {
        workspace: null as unknown as Workspace,
        process: null,
        emitter,
      });
    }

    const emitter = this.sessions.get(workspaceId)!.emitter;
    emitter.on('message', callback);

    return () => {
      emitter.off('message', callback);
    };
  }

  /**
   * Get session status
   */
  getSession(workspaceId: string): ManagedSession | undefined {
    return this.sessions.get(workspaceId);
  }

  /**
   * Check if a tmux session exists
   */
  private async tmuxSessionExists(sessionName: string): Promise<boolean> {
    try {
      await execAsync(`tmux has-session -t "${sessionName}"`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start capturing output from a tmux session
   */
  private startOutputCapture(workspaceId: string, tmuxSession: string): void {
    const session = this.sessions.get(workspaceId);
    if (!session) return;

    // Use tmux pipe-pane to capture output
    // This creates a continuous stream of the pane content
    const captureProcess = spawn('bash', [
      '-c',
      `while true; do tmux capture-pane -t "${tmuxSession}" -p -S -100; sleep 0.5; done`,
    ]);

    let lastOutput = '';

    captureProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();

      // Only emit if output changed (avoid duplicates)
      if (output !== lastOutput) {
        const newContent = this.getNewContent(lastOutput, output);
        if (newContent) {
          const message: WsMessage = {
            type: 'output',
            data: newContent,
            timestamp: Date.now(),
          };
          session.emitter.emit('message', message);
        }
        lastOutput = output;
      }
    });

    captureProcess.on('error', (error) => {
      console.error(`Output capture error for ${workspaceId}:`, error);
    });

    session.process = captureProcess;
  }

  /**
   * Get only the new content from output
   */
  private getNewContent(oldOutput: string, newOutput: string): string {
    if (!oldOutput) return newOutput;

    // Simple diff - find where new content starts
    const oldLines = oldOutput.split('\n');
    const newLines = newOutput.split('\n');

    // Find the first line that differs
    let diffStart = 0;
    for (let i = 0; i < Math.min(oldLines.length, newLines.length); i++) {
      if (oldLines[i] !== newLines[i]) {
        diffStart = i;
        break;
      }
      diffStart = i + 1;
    }

    return newLines.slice(diffStart).join('\n');
  }

  /**
   * Update workspace status
   */
  private async updateWorkspaceStatus(workspaceId: string, status: WorkspaceStatus): Promise<void> {
    const workspace = await storage.getWorkspace(workspaceId);
    if (!workspace) return;

    workspace.status = status;
    workspace.updatedAt = Date.now();
    workspace.lastActivityAt = Date.now();
    await storage.saveWorkspace(workspace);

    // Emit status change
    const session = this.sessions.get(workspaceId);
    if (session) {
      const message: WsMessage = {
        type: 'status',
        status,
        timestamp: Date.now(),
      };
      session.emitter.emit('message', message);
    }
  }
}

export const sessionService = new SessionService();
