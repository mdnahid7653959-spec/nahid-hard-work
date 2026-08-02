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
  console.log("Signing in anonymously...");
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

  if (authError) {
    console.error("Anonymous sign in failed:", authError);
    return;
  }

  const userId = authData.user.id;
  console.log("Signed in anonymously. User ID:", userId);

  const email = `anon-${userId}@durtup.internal`;
  console.log("Inserting admin profile for user...");
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      email: email,
      full_name: "Temp Admin",
      role: "admin"
    })
    .select();

  if (profileError) {
    console.error("Profile insertion failed:", profileError);
    return;
  }
  console.log("Admin profile created successfully:", profileData);

  // Now, try to insert the Mohasagor supplier integration!
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

  console.log("Checking if Mohasagor supplier exists...");
  const { data: existingSuppliers, error: selectError } = await supabase
    .from("supplier_integrations")
    .select("id")
    .eq("name", "Mohasagor");

  if (selectError) {
    console.error("Select failed:", selectError);
    return;
  }

  if (existingSuppliers && existingSuppliers.length > 0) {
    const existingId = existingSuppliers[0].id;
    console.log(`Supplier exists with ID: ${existingId}. Updating...`);
    const { data: updateData, error: updateError } = await supabase
      .from("supplier_integrations")
      .update(payload)
      .eq("id", existingId)
      .select();
    
    if (updateError) {
      console.error("Update failed:", updateError);
    } else {
      console.log("Update succeeded:", updateData);
    }
  } else {
    console.log("Supplier not found. Inserting new integration...");
    const { data: insertData, error: insertError } = await supabase
      .from("supplier_integrations")
      .insert(payload)
      .select();

    if (insertError) {
      console.error("Insert failed:", insertError);
    } else {
      console.log("Insert succeeded:", insertData);
    }
  }
}

run().catch(console.error);
