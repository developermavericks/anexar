import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zietxefeihshhevouudx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZXR4ZWZlaWhzaGhldm91dWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTcyMDUsImV4cCI6MjA5NDIzMzIwNX0.FwWfKK1BklcMZl-vcCK-xohLGtUfL9nOKnYuBcGyE0E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: weekly, error: wErr } = await supabase.from('allocations_weekly').select('*');
  console.log("Weekly error:", wErr);
  console.log("Weekly allocations count:", weekly ? weekly.length : 0);
  console.log("Weekly allocations:", weekly);

  const { data: monthly, error: mErr } = await supabase.from('allocations_monthly').select('*');
  console.log("Monthly error:", mErr);
  console.log("Monthly allocations count:", monthly ? monthly.length : 0);
  console.log("Monthly allocations:", monthly);
}
check();
