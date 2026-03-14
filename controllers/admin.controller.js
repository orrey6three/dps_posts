import postService from '../services/post.service.js';
import voteService from '../services/vote.service.js';

class AdminController {
  async verifySession(req, res) {
    res.json({ success: true, admin: true });
  }

  async getPosts(req, res) {
    try {
      const posts = await postService.getAllPosts();
      
      const postsWithStats = await Promise.all(
        posts.map(async (post) => {
          const stats = await voteService.getPostVoteStats(post.id);
          return { ...post, stats };
        })
      );
      
      res.json({ posts: postsWithStats });
    } catch (error) {
      console.error('Error fetching admin posts:', error);
      res.status(500).json({ error: 'Не удалось загрузить посты' });
    }
  }

  async createPost(req, res) {
    try {
      const { title, address, latitude, longitude, type, comment } = req.body;
      
      if (!title || !latitude || !longitude || !type) {
        return res.status(400).json({ 
          error: 'Обязательные поля: title, latitude, longitude, type' 
        });
      }
      
      const post = await postService.createPost(title, address, latitude, longitude, type, comment, req.user ? req.user.id : null);
      
      res.json({ success: true, post });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Не удалось создать пост' });
    }
  }

  async updatePost(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const post = await postService.updatePost(id, updates);
      
      res.json({ success: true, post });
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Не удалось обновить пост' });
    }
  }

  async deletePost(req, res) {
    try {
      const { id } = req.params;
      
      await postService.deletePost(id);
      
      res.json({ success: true, message: 'Пост удалён' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Не удалось удалить пост' });
    }
  }

  async getPostStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await voteService.getPostVoteStats(id);
      
      res.json({ stats });
    } catch (error) {
      console.error('Error fetching post stats:', error);
      res.status(500).json({ error: 'Не удалось загрузить статистику' });
    }
  }
}

export default new AdminController();
