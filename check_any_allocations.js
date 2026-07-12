import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zietxefeihshhevouudx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZXR4ZWZlaWhzaGhldm91dWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTcyMDUsImV4cCI6MjA5NDIzMzIwNX0.FwWfKK1BklcMZl-vcCK-xohLGtUfL9nOKnYuBcGyE0E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: users, error: uErr } = await supabase.from('users').select('id, name, email');
  if (uErr) {
    console.error("Users error:", uErr);
    return;
  }
  
  console.log("Checking allocations for", users.length, "users...");
  
  // Query allocations for all user IDs to see if any exist
  const userIds = users.map(u => u.id);
  
  const { data: weekly, error: wErr } = await supabase.from('allocations_weekly').select('*').in('user_id', userIds);
  console.log("Weekly allocations with user_ids filter:", weekly ? weekly.length : 0, wErr);
  
  const { data: monthly, error: mErr } = await supabase.from('allocations_monthly').select('*').in('user_id', userIds);
  console.log("Monthly allocations with user_ids filter:", monthly ? monthly.length : 0, mErr);
}
check();
