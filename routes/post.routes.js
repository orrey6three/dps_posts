import express from 'express';
import postController from '../controllers/post.controller.js';
import voteController from '../controllers/vote.controller.js';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/posts', postController.getPosts);
router.post('/posts', requireAuth, postController.createPostByUser);
router.post('/vote', voteController.submitVote);

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DPS45'
  });
});

export default router;
