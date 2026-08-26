import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('clients(name)')
      .limit(5);
    
    console.log("Error:", error);
    console.log("Returned Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Exception:", err.message);
  }
}

run();
