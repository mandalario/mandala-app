import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.0";
import { createHandler } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, secret, options);

Deno.serve(createHandler({
  secret,
  getUser: async (jwt) => {
    const { data, error } = await admin.auth.getUser(jwt);
    return error ? null : data.user;
  },
  generateOtp: async (email) => {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !data.properties?.hashed_token || !data.user) throw new Error("OTP generation failed");
    return { userId: data.user.id, tokenHash: data.properties.hashed_token };
  },
  redeemOtp: async (tokenHash) => {
    // Separate client per request: sessions must never leak between users.
    const client = createClient(url, anon, options);
    const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    return error ? null : data.session;
  },
}));
