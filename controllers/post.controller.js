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
}

export default new PostController();
