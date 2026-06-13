import { homeContent, homeMeta } from '../templates/pages/home/home.js';
import { renderAppPage } from '../render.js';

class HomeController {
  async index(request, reply) {
    return renderAppPage(request, reply, homeMeta(), homeContent());
  }
}

export const homeController = new HomeController();
