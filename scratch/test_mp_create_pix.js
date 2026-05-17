import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load environment variables from .env
const envContent = fs.readFileSync(".env", "utf8");
const getEnvVal = (key) => {
  const match = envContent.match(new RegExp(`${key}="?([^"\\n]+)"?`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvVal("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnvVal("VITE_SUPABASE_PUBLISHABLE_KEY");

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Anon Key:", supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `test_pix_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = "TestPassword123!";

  console.log("\n1. Signing up test user:", email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error("Sign up failed:", signUpError);
    return;
  }

  const session = signUpData.session;
  if (!session) {
    console.log("User signed up but requires email confirmation, signing in...");
  }

  // Retrieve session token
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("Sign in failed:", signInError);
    return;
  }

  const jwt = signInData.session.access_token;
  console.log("2. Signed in successfully! JWT length:", jwt.length);

  // Invoke mp-create-pix Edge Function
  console.log("3. Invoking mp-create-pix Edge Function...");
  
  // Use a package ID that exists in the database
  const packageId = "ba299f4d-e62d-4fdf-9860-9a1b7c7a4a04"; // Aula Avulsa em Grupo
  
  const { data, error } = await supabase.functions.invoke("mp-create-pix", {
    body: { package_id: packageId },
  });

  console.log("\n4. Result:");
  if (error) {
    console.error("Function Invocation Error:", error);
  } else {
    console.log("Function Response Data:", JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
