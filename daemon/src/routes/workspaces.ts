import { Router, Request, Response } from 'express';
import { workspaceService } from '../services/workspace.js';

const router = Router();

// List all workspaces (across all repositories)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const workspaces = await workspaceService.list();
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get a workspace by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const workspace = await workspaceService.get(req.params.id);
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Send input to a workspace
router.post('/:id/input', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (typeof input !== 'string') {
      res.status(400).json({ error: 'Input must be a string' });
      return;
    }
    await workspaceService.sendInput(req.params.id, input);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Resume a workspace
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    await workspaceService.resume(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Archive a workspace
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    await workspaceService.archive(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Delete a workspace permanently
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await workspaceService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
