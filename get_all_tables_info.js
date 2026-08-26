import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // Try to get all tables in public schema
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (error) {
      // If direct pg_tables is restricted, try standard query to inform
      console.log("pg_tables query error:", error.message);
    } else {
      console.log("All tables in public schema:", data.map(t => t.tablename));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
