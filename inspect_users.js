import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zietxefeihshhevouudx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZXR4ZWZlaWhzaGhldm91dWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTcyMDUsImV4cCI6MjA5NDIzMzIwNX0.FwWfKK1BklcMZl-vcCK-xohLGtUfL9nOKnYuBcGyE0E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const { data: users, error } = await supabase.from('users').select('name, email, role, picture, title');
  if (error) {
    console.error("Error querying users:", error);
    return;
  }
  console.log("Total users found:", users.length);
  users.slice(0, 35).forEach((u, i) => {
    console.log(`${i+1}. Name: ${u.name} | Role: ${u.role} | Title: ${u.title} | Picture: ${u.picture}`);
  });
}
inspect();
