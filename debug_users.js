import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: posts, error: postErr } = await supabase
    .from('posts')
    .select('id, user_id, address, title, type')
    .order('created_at', { ascending: false })
    .limit(5);

  if (postErr) {
    console.error('Post Error:', postErr);
    return;
  }

  console.log('--- Last 5 posts ---');
  for (const p of posts) {
    const { data: user } = await supabase.from('users').select('username').eq('id', p.user_id).single();
    console.log(`Post ID: ${p.id}, Address: ${p.address}, UserID: ${p.user_id}, Username: ${user ? user.username : 'NULL'}`);
  }

  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('id, username')
    .ilike('username', '@%')
    .limit(5);

  if (userErr) {
    console.error('User Error:', userErr);
    return;
  }

  console.log('\n--- Proxy Users (@...) ---');
  console.log(users);
}
check();
