import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const SECRET_KEY = "durtup-api-gateway-salt-secure-key-2026";

function encryptCredentials(data) {
  if (data === null || data === undefined) return "";
  const plainText = typeof data === "string" ? data : JSON.stringify(data);
  let cipherText = "";
  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i);
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    const encrypted = charCode ^ keyChar;
    cipherText += String.fromCharCode(encrypted);
  }
  return btoa(unescape(encodeURIComponent(cipherText)));
}

async function run() {
  const email = "mohasagor.admin." + Math.floor(Math.random() * 100000) + "@gmail.com";
  const password = "AdminPassword123!";

  console.log("Signing up user:", email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpError) {
    console.error("Sign up failed:", signUpError);
    return;
  }

  const userId = signUpData.user.id;
  console.log("User signed up. ID:", userId);

  // By default, Supabase might create the profile automatically via a trigger, or we might need to insert it.
  // Let's try updating it first.
  console.log("Attempting to update profile to admin...");
  const { data: updateData, error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("user_id", userId)
    .select();

  if (updateError || !updateData || updateData.length === 0) {
    console.log("Update failed or profile doesn't exist yet. Inserting profile...");
    const { data: insertData, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        email: email,
        full_name: "Mohasagor Admin",
        role: "admin"
      })
      .select();

    if (insertError) {
      console.error("Insert profile failed:", insertError);
      return;
    }
    console.log("Profile inserted:", insertData);
  } else {
    console.log("Profile updated:", updateData);
  }

  // Now perform the supplier integrations write!
  const creds = {
    api_key: "A8niclztH9JtzS4t",
    secret_key: "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
  };
  const encryptedCreds = encryptCredentials(creds);

  const payload = {
    name: "Mohasagor",
    company_name: "mohasagor.com.bd",
    api_base_url: "https://mohasagor.com.bd",
    api_version: "v1",
    auth_type: "apikey",
    credentials_encrypted: encryptedCreds,
    endpoints_config: {
      product_list: "/api/reseller/product",
      category_list_path: "/api/reseller/category",
      response_root_path: "",
      sku_path: "id",
      name_path: "name",
      price_path: "price",
      stock_path: "stock_quantity",
      image_path: "thumbnail_image",
      category_id_path: "category_id",
      category_name_path: "category",
      description_path: "description"
    },
    pricing_rules: {
      markup_type: "percentage",
      markup_value: 15,
      commission_margin: 5,
      min_profit: 50,
      max_profit: 999999,
      conversion_rate: 1,
      auto_round: false,
      round_to: 99
    },
    sync_interval: "1h",
    is_active: true
  };

  const { data: existingSuppliers } = await supabase
    .from("supplier_integrations")
    .select("id")
    .eq("name", "Mohasagor");

  if (existingSuppliers && existingSuppliers.length > 0) {
    const existingId = existingSuppliers[0].id;
    console.log("Updating supplier integration:", existingId);
    const { data: updateRes, error: updateResError } = await supabase
      .from("supplier_integrations")
      .update(payload)
      .eq("id", existingId)
      .select();
    console.log("Result:", updateRes || updateResError);
  } else {
    console.log("Inserting new supplier integration...");
    const { data: insertRes, error: insertResError } = await supabase
      .from("supplier_integrations")
      .insert(payload)
      .select();
    console.log("Result:", insertRes || insertResError);
  }
}

run().catch(console.error);
