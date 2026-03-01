import express from 'express';
import { getPostsWithStats, canVote, submitVote } from '../lib/supabase.js';

const router = express.Router();

/**
 * GET /api/posts
 * Get all posts with statistics
 */
router.get('/posts', async (req, res) => {
  try {
    const posts = await getPostsWithStats();
    res.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Не удалось загрузить посты' });
  }
});

/**
 * POST /api/vote
 * Submit a vote
 */
router.post('/vote', async (req, res) => {
  try {
    const { post_id, device_id, vote_type } = req.body;
    
    // Validation
    if (!post_id || !device_id || !vote_type) {
      return res.status(400).json({ 
        error: 'Отсутствуют обязательные поля: post_id, device_id, vote_type' 
      });
    }
    
    if (!['relevant', 'irrelevant'].includes(vote_type)) {
      return res.status(400).json({ 
        error: 'vote_type должен быть "relevant" или "irrelevant"' 
      });
    }
    
    // Check if device can vote
    const canUserVote = await canVote(post_id, device_id);
    
    if (!canUserVote) {
      return res.status(429).json({ 
        error: 'Вы уже голосовали за этот пост. Попробуйте через 10 минут.',
        retry_after: 600 // seconds
      });
    }
    
    // Submit vote
    const vote = await submitVote(post_id, device_id, vote_type);
    
    res.json({ 
      success: true,
      vote,
      message: 'Голос принят'
    });
    
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: 'Не удалось отправить голос' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DPS45'
  });
});

export default router;
