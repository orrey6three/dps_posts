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
      const { title, address, latitude, longitude, type, comment, tags } = req.body;
      const user = req.user; // from optionalAuth or requireAuth

      if (!title || !latitude || !longitude || !type) {
        return res.status(400).json({ 
          error: 'Обязательные поля: title, latitude, longitude, type' 
        });
      }

      const validTypes = ['ДПС', 'Нужна помощь', 'Чисто', 'Вопрос'];
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
        user ? user.id : null
      );
      
      res.status(201).json({ success: true, post });
    } catch (error) {
      console.error('Error creating post by user:', error);
      res.status(500).json({ error: 'Не удалось создать метку' });
    }
  }
}

export default new PostController();
