import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // Try querying a common system view or tables to find which ones are public
    const tables = [
      'users',
      'clients',
      'user_clients',
      'allocations',
      'user_allocations',
      'client_allocations',
      'allocations_weekly',
      'allocations_monthly',
      'documents',
      'client_documents',
      'briefings'
    ];

    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true });
      if (error) {
        // Table doesn't exist or permission denied
      } else {
        console.log(`Table '${t}' exists with count:`, data[0]?.count || 0);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
