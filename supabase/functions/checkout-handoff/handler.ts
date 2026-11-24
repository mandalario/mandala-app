import { issueTicket, readTicket } from "./ticket.ts";

type User = { id: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean };
type Session = { access_token: string; refresh_token: string; user: { id: string } };
export type Dependencies = {
  secret: string;
  getUser: (jwt: string) => Promise<User | null>;
  generateOtp: (email: string) => Promise<{ userId: string; tokenHash: string }>;
  redeemOtp: (tokenHash: string) => Promise<Session | null>;
};

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

export function createHandler(deps: Dependencies) {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers });
    if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
    try {
      if (Number(req.headers.get("content-length")) > 4096) return json({ error: "Requisição inválida." }, 413);
      const body = await req.json();
      if (body.action === "create") {
        const jwt = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
        const user = jwt ? await deps.getUser(jwt) : null;
        if (!user) return json({ error: "Entre na sua conta novamente." }, 401);
        if (!user.email || !user.email_confirmed_at || user.is_anonymous) {
          return json({ error: "Confirme seu e-mail para continuar." }, 403);
        }
        // Never trust an email or user ID sent by the browser.
        const otp = await deps.generateOtp(user.email);
        if (otp.userId !== user.id) throw new Error("User mismatch");
        return json(await issueTicket(user.id, otp.tokenHash, deps.secret));
      }
      if (body.action === "redeem") {
        let ticket;
        try {
          ticket = await readTicket(body.ticket, deps.secret);
        } catch {
          return json({ error: "Link inválido ou expirado. Gere outro link no aplicativo." }, 400);
        }
        // Supabase consumes the OTP atomically: replay cannot create another session.
        const session = await deps.redeemOtp(ticket.tokenHash);
        if (!session || session.user.id !== ticket.userId) {
          return json({ error: "Este link expirou ou já foi utilizado. Gere outro no aplicativo." }, 400);
        }
        return json({ session: { access_token: session.access_token, refresh_token: session.refresh_token } });
      }
      return json({ error: "Requisição inválida." }, 400);
    } catch {
      // Do not log requests, OTPs or sessions.
      return json({ error: "Não foi possível preparar o acesso. Tente novamente." }, 500);
    }
  };
}
