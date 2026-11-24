import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { redeemCheckoutLink } from "@/lib/checkoutHandoff";

export default function CheckoutAccess() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (window.ReactNativeWebView || window.__IS_MANDALARIO_APP__ || /MandalarioApp|ReactNativeWebView/i.test(navigator.userAgent)) {
      setError("Abra este link no Safari. Se necessário, volte ao aplicativo e copie um novo link de compra.");
      return;
    }
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get("ticket");
    // Remove the credential before any network request or navigation.
    window.history.replaceState({}, "", "/auth/checkout");
    if (!ticket) {
      setError("Link de acesso ausente. Gere outro link no aplicativo.");
      return;
    }
    redeemCheckoutLink(ticket)
      .then(() => navigate("/packages?checkout=1", { replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Não foi possível acessar sua conta."));
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-4">
        {error ? <>
          <h1 className="text-xl font-bold">Acesso à compra</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link className="inline-block text-primary underline" to="/auth?next=%2Fpackages%3Fcheckout%3D1">Entrar com meu login</Link>
        </> : <>
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p>Acessando sua conta para finalizar a compra...</p>
        </>}
      </div>
    </main>
  );
}
