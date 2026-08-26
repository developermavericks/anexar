import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // We can run a raw sql query using RPC if configured, but let's try querying standard tables to see if we get RLS errors
    const tables = [
      'allocations_weekly',
      'allocations_monthly',
      'clients',
      'users',
      'user_clients',
      'user_allocations',
      'organization_clients',
      'organization_users'
    ];

    for (const table of tables) {
      const { data, error, status } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}' query returned error:`, error.message, `(status: ${status})`);
      } else {
        console.log(`Table '${table}' query succeeded. Row returned:`, data);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
