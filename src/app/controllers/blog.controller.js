import { getPublicPageLimit } from '../../lib/site-pagination.js';
import {
  blogIndexContent,
  blogIndexMeta,
} from '../templates/pages/blog/index.js';
import {
  blogPostContent,
  blogPostMeta,
  blogPostNotFoundContent,
  blogPostNotFoundMeta,
} from '../templates/pages/blog/post.js';
import { renderAppPage } from '../render.js';

class BlogController {
  async index(request, reply) {
    const page = request.query.page;
    const siteMap = request.siteSettingsMap ?? {};
    const limit = getPublicPageLimit(siteMap, request.query.limit);

    const apiResponse = await request.server.inject({
      method: 'GET',
      url: `/api/v1/posts?page=${page || 1}&limit=${limit}`,
    });

    if (apiResponse.statusCode !== 200) {
      request.log.error({ statusCode: apiResponse.statusCode }, 'Failed to load blog posts from API');
      return renderAppPage(
        request,
        reply,
        blogIndexMeta({ page, totalPages: 1 }),
        blogIndexContent({ posts: [], page, totalPages: 1 }),
      );
    }

    const payload = apiResponse.json();
    const posts = payload?.data || [];
    const currentPage = payload?.meta?.current_page || page;
    const totalPages = payload?.meta?.last_page || 1;

    return renderAppPage(
      request,
      reply,
      blogIndexMeta({ page: currentPage, totalPages }),
      blogIndexContent({ posts, page: currentPage, totalPages }),
    );
  }

  async show(request, reply) {
    const { slug } = request.params;

    const postResponse = await request.server.inject({
      method: 'GET',
      url: `/api/v1/posts/${encodeURIComponent(slug)}`,
    });

    if (postResponse.statusCode !== 200) {
      reply.code(postResponse.statusCode === 404 ? 404 : 500);
      return renderAppPage(
        request,
        reply,
        blogPostNotFoundMeta(),
        blogPostNotFoundContent(),
      );
    }

    const siteMap = request.siteSettingsMap ?? {};
    const commentLimit = getPublicPageLimit(siteMap, 50);

    const commentsResponse = await request.server.inject({
      method: 'GET',
      url: `/api/v1/posts/${encodeURIComponent(slug)}/comments?limit=${commentLimit}`,
    });

    const post = postResponse.json();
    const commentsPayload = commentsResponse.statusCode === 200 ? commentsResponse.json() : { data: [] };

    return renderAppPage(
      request,
      reply,
      blogPostMeta({ post }),
      blogPostContent({ post, comments: commentsPayload?.data || [] }),
    );
  }
}

export const blogController = new BlogController();
