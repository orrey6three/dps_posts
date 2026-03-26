import postService from '../services/post.service.js';

class PostController {
  async getPosts(req, res) {
    try {
      const posts = await postService.getPostsWithStats();
      res.json({ posts });
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Не удалось загрузить посты' });
    }
  }

  async createPostByUser(req, res) {
    try {
      const { title, address, latitude, longitude, type, comment, tags, street_geometry } = req.body;
      const user = req.user; // from optionalAuth or requireAuth

      if (!title || !latitude || !longitude || !type) {
        return res.status(400).json({ 
          error: 'Обязательные поля: title, latitude, longitude, type' 
        });
      }

      const validTypes = ['ДПС', 'Нужна помощь', 'Чисто', 'Вопрос', 'Патруль'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Неверный тип метки' });
      }

      const post = await postService.createPost(
        title, 
        address, 
        latitude, 
        longitude, 
        type, 
        comment,
        tags,
        user ? user.id : null,
        street_geometry
      );
      
      res.status(201).json({ success: true, post });
    } catch (error) {
      console.error('Error creating post by user:', error);
      res.status(500).json({ error: 'Не удалось создать метку' });
    }
  }

  async deleteOwnPost(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      // Fetch post to verify ownership
      const { supabaseAdmin } = await import('../services/db.service.js');
      const { data: post, error: fetchError } = await supabaseAdmin
        .from('posts')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError || !post) {
        console.error('Delete check failed: Post not found', { id, fetchError });
        return res.status(404).json({ 
          error: 'Метка не найдена', 
          details: fetchError ? fetchError.message : 'Post not in database',
          requested_id: id 
        });
      }

      // Only allow owner or admin
      if (post.user_id !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Нет прав для удаления этой метки' });
      }

      await postService.deletePost(id);
      res.json({ success: true, message: 'Метка удалена' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Не удалось удалить метку' });
    }
  }

  /**
   * Bot/Webhook endpoint to create short-lived patrol route without auth
   * Expects:
   *  - street: string (улица)
   *  - city: optional, defaults to Шумиха
   *  - comment: optional text
   *  - coords: optional [lat, lon] to bias the search
   *  - street_geometry: optional [[lat, lon] ...] if the bot already resolved the street line
   * Requires header `x-bot-token` or body `token` to match BOT_TOKEN in env.
   */
  async createPatrolFromBot(req, res) {
    try {
      const botToken = process.env.BOT_TOKEN;
      if (!botToken) {
        return res.status(500).json({ error: 'BOT_TOKEN не настроен на сервере' });
      }

      const incomingToken = req.headers['x-bot-token'] || req.body.token || req.query.token;
      if (incomingToken !== botToken) {
        return res.status(403).json({ error: 'Недействительный бот-токен' });
      }

      const { street, city = 'Шумиха', comment = '', coords, street_geometry } = req.body;
      if (!street || typeof street !== 'string') {
        return res.status(400).json({ error: 'Поле street обязательно' });
      }

      const CITY_COORDS = {
        shchuchye: [55.2133, 62.7634],
        shumikha: [55.2255, 63.2982],
        mishkino: [55.3385, 63.9168]
      };

      const anchor = Array.isArray(coords) && coords.length === 2
        ? coords.map(Number)
        : CITY_COORDS[city] || CITY_COORDS.shumikha;

      let geometry = Array.isArray(street_geometry) ? street_geometry : null;
      let address = `${street}, ${city}`;

      // Try to resolve street geometry if bot did not provide one
      if (!geometry || geometry.length === 0) {
        try {
          geometry = await this.fetchStreetGeometry(street, anchor);
        } catch (e) {
          console.warn('Street geometry resolution failed, will fallback:', e.message);
        }
      }

      // If still nothing, draw short 200m line around anchor
      if (!geometry || geometry.length === 0) {
        geometry = this.buildFallbackLine(anchor);
      }

      // Choose a representative point for the placemark
      const [latitude, longitude] = this.pickCenterPoint(geometry);

      const post = await postService.createPost(
        `Патруль: ${street}`,
        address,
        latitude,
        longitude,
        'Патруль',
        comment,
        [],
        null,
        geometry
      );
      
      res.status(201).json({ success: true, post });
    } catch (error) {
      console.error('Error creating patrol from bot:', error);
      res.status(500).json({ error: 'Не удалось создать патруль', details: error.message });
    }
  }

  async fetchStreetGeometry(street, anchorCoords) {
    const [lat, lon] = anchorCoords || [];
    const escapedStreet = street.replace(/"/g, '\\"');
    const searchRadius = 5000; // meters

    const query = `[out:json][timeout:12];\n(
  way["name"~"${escapedStreet}",i](around:${searchRadius},${lat},${lon});
  relation["name"~"${escapedStreet}",i](around:${searchRadius},${lat},${lon});
);\nout geom 1;`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    const way = data?.elements?.find(el => (el.type === 'way' || el.type === 'relation') && Array.isArray(el.geometry) && el.geometry.length > 1);

    if (!way) return null;

    return way.geometry.map(pt => [pt.lat, pt.lon]);
  }

  pickCenterPoint(geometry) {
    if (!Array.isArray(geometry) || geometry.length === 0) return [55.2255, 63.2982];
    const mid = Math.floor(geometry.length / 2);
    const coord = geometry[mid] || geometry[0];
    return [Number(coord[0]), Number(coord[1])];
  }

  buildFallbackLine(anchor) {
    const [lat = 55.2255, lon = 63.2982] = anchor || [];
    const deltaLat = 0.002; // ~220 м
    return [
      [lat - deltaLat, lon],
      [lat + deltaLat, lon]
    ];
  }
}

export default new PostController();
