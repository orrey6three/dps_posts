import { supabase, supabaseAdmin } from './db.service.js';

class VoteService {
  /**
   * Check if device can vote on a post
   */
  async canVote(postId, deviceId) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('device_id', deviceId)
      .gte('created_at', tenMinutesAgo)
      .limit(1);
    
    if (error) {
      console.error('Error checking vote eligibility:', error);
      throw error;
    }
    
    return data.length === 0;
  }

  /**
   * Submit a vote
   */
  async submitVote(postId, deviceId, voteType) {
    const { data, error } = await supabase
      .from('votes')
      .insert([
        {
          post_id: postId,
          device_id: deviceId,
          vote_type: voteType
        }
      ])
      .select();
    
    if (error) {
      console.error('Error submitting vote:', error);
      throw error;
    }
    
    return data[0];
  }

  /**
   * Get vote statistics for a post (admin)
   */
  async getPostVoteStats(postId) {
    const { data, error } = await supabaseAdmin
        .from('votes')
        .select('vote_type, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      relevant: data.filter(v => v.vote_type === 'relevant').length,
      irrelevant: data.filter(v => v.vote_type === 'irrelevant').length,
      total: data.length,
      recentVotes: data.slice(0, 10)
    };
  }
}

export default new VoteService();
