import voteService from '../services/vote.service.js';

class VoteController {
  async submitVote(req, res) {
    try {
      const { post_id, device_id, vote_type } = req.body;
      
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
      
      const canUserVote = await voteService.canVote(post_id, device_id);
      
      if (!canUserVote) {
        return res.status(429).json({ 
          error: 'Вы уже голосовали за этот пост. Попробуйте через 10 минут.',
          retry_after: 600
        });
      }
      
      const vote = await voteService.submitVote(post_id, device_id, vote_type);
      
      res.json({ 
        success: true,
        vote,
        message: 'Голос принят'
      });
      
    } catch (error) {
      console.error('Error submitting vote:', error);
      res.status(500).json({ error: 'Не удалось отправить голос' });
    }
  }
}

export default new VoteController();
