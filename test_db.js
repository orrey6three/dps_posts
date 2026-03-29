import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: posts, error } = await supabase.rpc('get_post_stats');
  if (error) {
    console.error('RPC Error:', error);
    return;
  }
  
  const v = posts.find(p => p.address === 'Виадук');
  if (v) {
    console.log('Виадук:', {
      type: v.type,
      is_static: v.is_static,
      last_relevant: v.last_relevant,
      last_irrelevant: v.last_irrelevant,
      last_activity: v.last_activity,
      relevant_count: v.relevant_count,
      irrelevant_count: v.irrelevant_count
    });
  } else {
    console.log('Виадук not found');
  }
}
check();
