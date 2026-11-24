import { supabase } from "@/integrations/supabase/client";

export const CHECKOUT_HANDOFF_URL = "https://www.mandalario.app/auth/checkout";

export async function createCheckoutLink(): Promise<{ url: string; expiresAt: number }> {
  const { data, error } = await supabase.functions.invoke("checkout-handoff", { body: { action: "create" } });
  if (error || typeof data?.ticket !== "string" || !Number.isFinite(data?.expiresAt)) {
    throw new Error("Não foi possível gerar seu link de acesso. Tente novamente.");
  }
  return { url: `${CHECKOUT_HANDOFF_URL}#ticket=${encodeURIComponent(data.ticket)}`, expiresAt: data.expiresAt };
}

export async function redeemCheckoutLink(ticket: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("checkout-handoff", { body: { action: "redeem", ticket } });
  if (error || !data?.session?.access_token || !data?.session?.refresh_token) {
    throw new Error("Este link expirou ou já foi utilizado. Gere outro link no aplicativo.");
  }
  // Always install the incoming account, even if Safari is logged into someone else.
  const { error: sessionError } = await supabase.auth.setSession(data.session);
  if (sessionError) throw new Error("Não foi possível entrar na sua conta. Gere outro link no aplicativo.");
}
