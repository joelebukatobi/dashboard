// Public API controller for site settings

class SettingsAPIController {
  /**
   * GET /api/v1/settings
   */
  async getPublicSettings(request, reply) {
    try {
      const data = await request.server.siteSettings.getPublic();
      return reply.send(data);
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to fetch settings',
      });
    }
  }
}

export const settingsAPIController = new SettingsAPIController();
