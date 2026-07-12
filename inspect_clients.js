import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zietxefeihshhevouudx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZXR4ZWZlaWhzaGhldm91dWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTcyMDUsImV4cCI6MjA5NDIzMzIwNX0.FwWfKK1BklcMZl-vcCK-xohLGtUfL9nOKnYuBcGyE0E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const { data: clients, error } = await supabase.from('clients').select('*');
  if (error) {
    console.error("Clients error:", error);
    return;
  }
  console.log("Total clients in DB:", clients.length);
  clients.forEach(c => {
    console.log(`- ID: ${c.id} | Name: ${c.name} | Active: ${c.is_active}`);
  });
}
inspect();
