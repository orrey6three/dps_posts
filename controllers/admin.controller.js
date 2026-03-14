import postService from '../services/post.service.js';
import voteService from '../services/vote.service.js';
import { supabaseAdmin } from '../services/db.service.js';

class AdminController {
  async verifySession(req, res) {
    res.json({ success: true, admin: true });
  }

  async getDashboardStats(req, res) {
    try {
      const [postsRes, usersRes, votesRes] = await Promise.all([
        supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('votes').select('id', { count: 'exact', head: true }),
      ]);
      res.json({
        total_posts: postsRes.count ?? 0,
        total_users: usersRes.count ?? 0,
        total_votes: votesRes.count ?? 0,
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Ошибка статистики' });
    }
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
      const { title, address, latitude, longitude, type, comment, tags } = req.body;
      
      if (!title || !latitude || !longitude || !type) {
        return res.status(400).json({ error: 'Обязательные поля: title, latitude, longitude, type' });
      }

      let userId = req.user ? req.user.id : null;

      // Robust fix for old sessions where id might be 'admin' string
      if (userId === 'admin') {
        const { data: adminUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('username', 'admin')
          .single();
        if (adminUser) userId = adminUser.id;
      }

      const post = await postService.createPost(title, address, latitude, longitude, type, comment, tags, userId);
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

  async getUsers(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, username, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Attach post counts
      const usersWithCounts = await Promise.all(
        data.map(async (user) => {
          const { count } = await supabaseAdmin
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          return { ...user, post_count: count ?? 0 };
        })
      );
      res.json({ users: usersWithCounts });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Не удалось загрузить пользователей' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      // null-out posts first (FK is SET NULL), then delete user
      await supabaseAdmin.from('posts').update({ user_id: null }).eq('user_id', id);
      const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true, message: 'Пользователь удалён' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Не удалось удалить пользователя' });
    }
  }
}

export default new AdminController();

