import express from 'express';
import { 
  getAllPosts, 
  createPost, 
  updatePost, 
  deletePost,
  getPostVoteStats 
} from '../lib/supabase.js';
import { 
  verifyAdminPassword, 
  generateToken, 
  requireAuth 
} from '../lib/auth.js';

const router = express.Router();

/**
 * POST /admin/login
 * Admin login
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Пароль не указан' });
    }
    
    const isValid = await verifyAdminPassword(password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }
    
    const token = generateToken();
    
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({ success: true, message: 'Вход выполнен' });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

/**
 * POST /admin/logout
 * Admin logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Выход выполнен' });
});

/**
 * GET /admin/verify
 * Verify admin session
 */
router.get('/verify', requireAuth, (req, res) => {
  res.json({ success: true, admin: true });
});

/**
 * GET /admin/posts
 * Get all posts with detailed stats
 */
router.get('/posts', requireAuth, async (req, res) => {
  try {
    const posts = await getAllPosts();
    
    // Get stats for each post
    const postsWithStats = await Promise.all(
      posts.map(async (post) => {
        const stats = await getPostVoteStats(post.id);
        return { ...post, stats };
      })
    );
    
    res.json({ posts: postsWithStats });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).json({ error: 'Не удалось загрузить посты' });
  }
});

/**
 * POST /admin/posts
 * Create a new post
 */
router.post('/posts', requireAuth, async (req, res) => {
  try {
    const { title, address, latitude, longitude } = req.body;
    
    if (!title || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Обязательные поля: title, latitude, longitude' 
      });
    }
    
    const post = await createPost(title, address, latitude, longitude);
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Не удалось создать пост' });
  }
});

/**
 * PUT /admin/posts/:id
 * Update a post
 */
router.put('/posts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const post = await updatePost(id, updates);
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Не удалось обновить пост' });
  }
});

/**
 * DELETE /admin/posts/:id
 * Delete a post
 */
router.delete('/posts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    await deletePost(id);
    
    res.json({ success: true, message: 'Пост удалён' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Не удалось удалить пост' });
  }
});

/**
 * GET /admin/posts/:id/stats
 * Get detailed stats for a post
 */
router.get('/posts/:id/stats', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await getPostVoteStats(id);
    
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching post stats:', error);
    res.status(500).json({ error: 'Не удалось загрузить статистику' });
  }
});

export default router;
