import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error('Missing Supabase credentials in .env');
}

/** Public client (RLS enabled) */
export const supabase = createClient(supabaseUrl, anonKey);

/** Admin client (RLS bypass) */
export const supabaseAdmin = createClient(supabaseUrl, serviceKey);
/**
 * Get all posts with vote statistics
 */
export async function getPostsWithStats() {
  const { data, error } = await supabase.rpc('get_post_stats');
  
  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
  
  return data;
}

/**
 * Check if device can vote on a post
 */
export async function canVote(postId, deviceId) {
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
export async function submitVote(postId, deviceId, voteType) {
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
 * Get all posts (admin)
 */
export async function getAllPosts() {
  const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .order('title');

  if (error) throw error;
  return data;
}

/**
 * Create a new post (admin)
 */
export async function createPost(title, address, latitude, longitude) {
  const { data, error } = await supabaseAdmin
      .from('posts')
      .insert([{ title, address, latitude, longitude }])
      .select()
      .single();

  if (error) throw error;
  return data;
}

/**
 * Update a post (admin)
 */
export async function updatePost(id, updates) {
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
export async function deletePost(id) {
  const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Get vote statistics for a post (admin)
 */
export async function getPostVoteStats(postId) {
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
