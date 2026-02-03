import { Router, Request, Response } from 'express';
import { repositoryService } from '../services/repository.js';
import { workspaceService } from '../services/workspace.js';
import { CreateRepositoryRequest, CreateWorkspaceRequest } from '../types/index.js';

const router = Router();

// List all repositories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const repositories = await repositoryService.list();
    res.json(repositories);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create a new repository
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = CreateRepositoryRequest.parse(req.body);
    const repository = await repositoryService.create(body);
    res.status(201).json(repository);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Get a repository by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await repositoryService.getWithWorkspaces(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Delete a repository
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await repositoryService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// List workspaces for a repository
router.get('/:id/workspaces', async (req: Request, res: Response) => {
  try {
    const repository = await repositoryService.get(req.params.id);
    if (!repository) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    const workspaces = await workspaceService.list(req.params.id);
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create a new workspace
router.post('/:id/workspaces', async (req: Request, res: Response) => {
  try {
    const repository = await repositoryService.get(req.params.id);
    if (!repository) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }
    const body = CreateWorkspaceRequest.parse(req.body);
    const workspace = await workspaceService.create(repository, body);
    res.status(201).json(workspace);
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

export default router;
