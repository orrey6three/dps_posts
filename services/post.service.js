import { supabase, supabaseAdmin } from './db.service.js';

class PostService {
  /**
   * Get all posts with vote statistics
   */
  async getPostsWithStats() {
    // Auto-delete posts older than 1 hour before fetching
    await this.cleanupOldPosts();

    const { data, error } = await supabase.rpc('get_post_stats');
    
    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Delete posts older than 1 hour
   */
  async cleanupOldPosts() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { error } = await supabaseAdmin
        .from('posts')
        .delete()
        .lt('created_at', oneHourAgo);

    if (error) {
      console.error('Error cleaning up old posts:', error);
      // We don't throw here to avoid breaking the main fetch if cleanup fails
    }
  }

  /**
   * Get all posts (admin)
   */
  async getAllPosts() {
    const { data, error } = await supabaseAdmin
        .from('posts')
        .select('*')
        .order('title');

    if (error) throw error;
    return data;
  }

  /**
   * Create a new post
   */
  async createPost(title, address, latitude, longitude, type, comment, tags, userId) {
    const payload = { title, address, latitude, longitude, type };
    if (comment) payload.comment = comment;
    if (tags && Array.isArray(tags)) payload.tags = tags;
    if (userId) payload.user_id = userId;

    const { data, error } = await supabaseAdmin
        .from('posts')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a post (admin)
   */
  async updatePost(id, updates) {
    const { data, error } = await supabaseAdmin
        .from('posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a post (admin)
   */
  async deletePost(id) {
    const { error } = await supabaseAdmin
        .from('posts')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
  }
}

export default new PostService();
