import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zietxefeihshhevouudx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZXR4ZWZlaWhzaGhldm91dWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTcyMDUsImV4cCI6MjA5NDIzMzIwNX0.FwWfKK1BklcMZl-vcCK-xohLGtUfL9nOKnYuBcGyE0E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: users, error } = await supabase.from('users').select('*');
  console.log("Users error:", error);
  console.log("Users list:", users);
}
check();
