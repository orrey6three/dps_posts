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
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();

    // 1) Patrol routes live only 5 minutes
    const { error: patrolError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('type', 'Патруль')
      .eq('is_static', false)
      .lt('created_at', fiveMinutesAgo);

    if (patrolError) {
      console.error('Error cleaning up patrol posts:', patrolError);
    }

    // 2) All other dynamic posts live 1 hour
    const { error: regularError } = await supabaseAdmin
      .from('posts')
      .delete()
      .neq('type', 'Патруль')
      .eq('is_static', false)
      .lt('created_at', oneHourAgo);

    if (regularError) {
      console.error('Error cleaning up old posts:', regularError);
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
  async createPost(title, address, latitude, longitude, type, comment, tags, userId, streetGeometry = null) {
    const payload = { title, address, latitude, longitude, type };
    if (comment) payload.comment = comment;
    if (tags && Array.isArray(tags)) payload.tags = tags;
    if (userId) payload.user_id = userId;
    if (streetGeometry) payload.street_geometry = streetGeometry;

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
