import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // Fetch allocations with user details (name, email) and client details (name)
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('user_id, users(name, email), clients(name)');

    if (error) throw error;

    console.log(`Successfully fetched ${data.length} weekly allocation rows.`);

    // Group mappings by user email
    const mappings = {};
    data.forEach(row => {
      const email = row.users?.email?.toLowerCase();
      const userName = row.users?.name;
      const clientName = row.clients?.name;

      if (!email) return;

      if (!mappings[email]) {
        mappings[email] = {
          name: userName,
          clients: new Set()
        };
      }
      if (clientName) {
        mappings[email].clients.add(clientName);
      }
    });

    // Output grouped mapping information
    console.log("SUPABASE_MAPPINGS_START");
    Object.keys(mappings).sort().forEach(email => {
      const info = mappings[email];
      console.log(`User: ${email} (${info.name}) => clients: ${JSON.stringify(Array.from(info.clients).sort())}`);
    });
    console.log("SUPABASE_MAPPINGS_END");

  } catch (err) {
    console.error("Error querying allocations:", err.message);
  }
}

run();
