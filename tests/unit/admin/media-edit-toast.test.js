import { describe, it, expect } from 'vitest';
import { imagesEditContent, imagesEditMeta } from '../../../src/admin/templates/pages/media/images/edit.js';
import { videosEditContent, videosEditMeta } from '../../../src/admin/templates/pages/media/videos/edit.js';

const image = {
  id: 'img-1',
  originalName: 'shot.jpg',
  title: 'Shot',
  altText: '',
  path: '/public/uploads/images/shot.jpg',
  albumId: null,
};

const video = {
  id: 'vid-1',
  originalName: 'clip.mp4',
  title: 'Clip',
  altText: '',
  path: '/public/uploads/videos/clip.mp4',
  albumId: null,
  durationFormatted: '0:12',
  width: 1280,
  height: 720,
  sizeFormatted: '1 MB',
  mimeType: 'video/mp4',
};

const user = { csrfToken: 'test-csrf' };

describe('media edit templates', () => {
  it('renders image edit meta/modals without throwing (toastScript scope)', () => {
    expect(() => imagesEditMeta({ user, image })).not.toThrow();
    const html = imagesEditContent({
      user,
      image,
      posts: [],
      albums: [],
      toast: 'uploaded',
    });
    expect(html).toContain('Edit Image');
    expect(html).toContain('/public/uploads/images/shot.jpg');
  });

  it('renders video edit meta/modals without throwing (toastScript scope)', () => {
    expect(() => videosEditMeta({ user, video })).not.toThrow();
    const html = videosEditContent({
      user,
      video,
      posts: [],
      albums: [],
      toast: 'uploaded',
    });
    expect(html).toContain('Edit Video');
  });
});
