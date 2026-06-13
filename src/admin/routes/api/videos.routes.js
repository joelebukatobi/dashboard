// src/admin/routes/api/videos.routes.js
// Public API routes for videos

import { videosService } from '../../../services/videos.service.js';

export default async function videosApiRoutes(fastify, opts) {
  // GET /api/v1/videos - List all videos (public)
  fastify.get('/', async (request, reply) => {
    try {
      const page = parseInt(request.query?.page || '1', 10) || 1;
      const limit = parseInt(request.query?.limit || '20', 10) || 20;
      const year = request.query?.year || '';

      const result = await videosService.getAll({ page, limit });

      // Filter by year if provided
      let data = result.data;
      if (year) {
        data = data.filter(vid => {
          const vidYear = vid.createdAt ? new Date(vid.createdAt).getFullYear().toString() : '';
          return vidYear === year;
        });
      }

      return reply.send({
        data,
        meta: result.pagination,
      });
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return reply.send({ error: 'Failed to fetch videos' });
    }
  });
}
