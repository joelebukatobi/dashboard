// Public settings API routes

import { settingsAPIController } from '../../controllers/api/settings.controller.js';

export default async function settingsAPIRoutes(fastify) {
  fastify.get('/settings', {
    handler: settingsAPIController.getPublicSettings.bind(settingsAPIController),
  });
}
