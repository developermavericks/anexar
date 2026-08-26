import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const [weekly, monthly, clients, users] = await Promise.all([
      supabase.from('allocations_weekly').select('count', { count: 'exact', head: true }),
      supabase.from('allocations_monthly').select('count', { count: 'exact', head: true }),
      supabase.from('clients').select('count', { count: 'exact', head: true }),
      supabase.from('users').select('count', { count: 'exact', head: true })
    ]);

    console.log("allocations_weekly count:", weekly.count);
    console.log("allocations_monthly count:", monthly.count);
    console.log("clients count:", clients.count);
    console.log("users count:", users.count);
  } catch (err) {
    console.error("Error querying table counts:", err.message);
  }
}

run();
