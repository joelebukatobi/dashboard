// src/admin/routes/settings.routes.js
// Settings routes - admin only

import { settingsController } from '../controllers/settings.controller.js';
import { requireAuthRedirect } from '../../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { settingsUpdateSchema, siteIconSelectSchema, testEmailSchema } from '../schemas/settings.schema.js';

const auth = requireAuthRedirect('/admin/auth/login');

export default async function settingsRoutes(fastify, opts) {
  fastify.get('/', {
    preHandler: auth,
    handler: settingsController.showSettings.bind(settingsController),
  });

  const updateSettingsRoute = {
    preHandler: [auth, validateBody(settingsUpdateSchema)],
    handler: settingsController.updateSettings.bind(settingsController),
  };

  fastify.put('/', updateSettingsRoute);
  fastify.post('/', updateSettingsRoute);

  fastify.post('/icon', {
    preHandler: auth,
    handler: settingsController.uploadSiteIcon.bind(settingsController),
  });

  fastify.post('/icon/select', {
    preHandler: [auth, validateBody(siteIconSelectSchema)],
    handler: settingsController.selectSiteIcon.bind(settingsController),
  });

  fastify.delete('/icon', {
    preHandler: auth,
    handler: settingsController.removeSiteIcon.bind(settingsController),
  });

  fastify.get('/icon-picker', {
    preHandler: auth,
    handler: settingsController.showIconPicker.bind(settingsController),
  });

  fastify.post('/logo', {
    preHandler: auth,
    handler: settingsController.uploadLogo.bind(settingsController),
  });

  fastify.post('/email/test', {
    preHandler: [auth, validateBody(testEmailSchema)],
    handler: settingsController.sendTestEmail.bind(settingsController),
  });
}
