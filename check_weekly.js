import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const res = await supabase.from('allocations_weekly').select('*');
    console.log("Response status:", res.status);
    console.log("Response error:", res.error);
    console.log("Response data (length):", res.data ? res.data.length : null);
    if (res.data && res.data.length > 0) {
      console.log("Sample rows:", res.data.slice(0, 5));
    }
  } catch (err) {
    console.error("Exception:", err.message);
  }
}

run();
