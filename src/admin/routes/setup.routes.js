// src/admin/routes/setup.routes.js
// Setup wizard routes

import { validateSetupToken } from '../../middleware/setup-guard.js';
import { showSetupForm, processSetup } from '../controllers/setup.controller.js';

export default async function setupRoutes(fastify, opts) {
  // GET /setup - Show setup form (requires valid token)
  fastify.get('/setup', {
    preHandler: validateSetupToken
  }, showSetupForm);

  // POST /setup - Process setup form (requires valid token)
  fastify.post('/setup', {
    preHandler: validateSetupToken
  }, processSetup);
}
