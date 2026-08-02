import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const payload = {
    name: "Test Supplier " + Date.now(),
    company_name: "test.com",
    api_base_url: "https://test.com",
    api_version: "v1",
    auth_type: "apikey",
    credentials_encrypted: "test",
    endpoints_config: {},
    pricing_rules: {},
    sync_interval: "1h",
    is_active: true,
  };

  const { data, error } = await supabase
    .from("supplier_integrations")
    .insert(payload)
    .select();

  if (error) {
    console.error("Test insert failed:", error);
  } else {
    console.log("Test insert succeeded:", data);
  }
}

run().catch(console.error);
