import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from './storage/index.js';
import { sessionService } from './services/session.js';
import { workspaceService } from './services/workspace.js';
import repositoriesRouter from './routes/repositories.js';
import workspacesRouter from './routes/workspaces.js';
import { WsMessage } from './types/index.js';

const PORT = process.env.EVE_PORT || 4778;

async function main() {
  // Initialize storage
  await storage.initialize();
  console.log('Storage initialized at ~/.eve');

  // Create Express app
  const app = express();
  app.use(express.json());

  // CORS for local development
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });

  // API routes
  app.use('/repositories', repositoriesRouter);
  app.use('/workspaces', workspacesRouter);

  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: WebSocket, req) => {
    // Parse workspace ID from URL: /ws?workspaceId=xxx
    const url = new URL(req.url || '', `http://localhost:${PORT}`);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      ws.close(4000, 'Missing workspaceId parameter');
      return;
    }

    // Verify workspace exists
    const workspace = await workspaceService.get(workspaceId);
    if (!workspace) {
      ws.close(4004, 'Workspace not found');
      return;
    }

    console.log(`WebSocket connected for workspace ${workspaceId}`);

    // Send connected message
    const connectedMsg: WsMessage = {
      type: 'connected',
      workspaceId,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(connectedMsg));

    // Resume workspace session if needed
    try {
      await workspaceService.resume(workspaceId);
    } catch (error) {
      console.error(`Failed to resume workspace ${workspaceId}:`, error);
    }

    // Subscribe to session output
    const unsubscribe = sessionService.subscribe(workspaceId, (message: WsMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });

    // Handle incoming messages (input to Claude)
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'input' && typeof message.input === 'string') {
          await workspaceService.sendInput(workspaceId, message.input);
        }
      } catch (error) {
        console.error('Failed to process WebSocket message:', error);
      }
    });

    // Cleanup on disconnect
    ws.on('close', () => {
      console.log(`WebSocket disconnected for workspace ${workspaceId}`);
      unsubscribe();
    });
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`Eve daemon running on port ${PORT}`);
    console.log(`REST API: http://localhost:${PORT}`);
    console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  });
}

main().catch((error) => {
  console.error('Failed to start Eve daemon:', error);
  process.exit(1);
});
