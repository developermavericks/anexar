import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znbleezybmgyvmqtnijb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYmxlZXp5Ym1neXZtcXRuaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjAwMzAsImV4cCI6MjEwMjE5NjAzMH0.vBd2j-r1PH8JBv6Bjv4a4877rV-J6uVvCmvRanQl9Xg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, email, name');
    
    if (userErr) throw userErr;

    console.log(`Fetched ${users.length} users from Supabase.`);

    for (const u of users) {
      const [weeklyRes, monthlyRes] = await Promise.all([
        supabase
          .from('allocations_weekly')
          .select('clients(name)')
          .eq('user_id', u.id),
        supabase
          .from('allocations_monthly')
          .select('clients(name)')
          .eq('user_id', u.id)
      ]);

      const clientNames = new Set();
      weeklyRes.data?.forEach(item => {
        if (item.clients?.name) clientNames.add(item.clients.name);
      });
      monthlyRes.data?.forEach(item => {
        if (item.clients?.name) clientNames.add(item.clients.name);
      });

      if (clientNames.size > 0) {
        console.log(`User: ${u.email} (${u.name}) =>`, Array.from(clientNames));
      }
    }
  } catch (err) {
    console.error("Error querying Supabase:", err.message);
  }
}

run();
