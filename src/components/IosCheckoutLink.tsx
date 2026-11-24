import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createCheckoutLink } from "@/lib/checkoutHandoff";
import { openExternalUrl } from "@/lib/platform";

export function IosCheckoutLink() {
  const [preparing, setPreparing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const [manualCopy, setManualCopy] = useState(false);

  const prepare = async () => {
    if (preparing) return;
    setPreparing(true);
    setCopied(false);
    setManualCopy(false);
    try {
      setLink(await createCheckoutLink());
      toast.success("Acesso pronto. Abra o site ou copie o link para o Safari.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o link.");
    } finally {
      setPreparing(false);
    }
  };

  const copy = async () => {
    if (!link || link.expiresAt <= Date.now()) {
      setLink(null);
      toast.message("Gere um novo link de acesso.");
      return;
    }
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success("Link copiado. Cole na barra do Safari.");
    } catch {
      setManualCopy(true);
      toast.message("Selecione e copie o link abaixo para abrir no Safari.");
    }
  };

  useEffect(() => {
    if (!link) return;
    const timeout = setTimeout(() => {
      setLink(null);
      setCopied(false);
      setManualCopy(false);
    }, Math.max(0, link.expiresAt - Date.now()));
    return () => clearTimeout(timeout);
  }, [link]);

  if (!link) return (
    <Button onClick={prepare} disabled={preparing} className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-xs">
      {preparing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
      {preparing ? "Preparando seu acesso..." : "Gerar acesso ao site de compras"}
    </Button>
  );

  return <>
    <Button asChild className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => {
          event.preventDefault();
          openExternalUrl(link.url);
        }}
      >
        <ExternalLink className="w-4 h-4" />
        Acessar site da escola (Safari)
      </a>
    </Button>
    <p className="text-[10px] text-center text-muted-foreground/70">
      Se o Safari não abrir automaticamente, copie o link e acesse pelo navegador.
    </p>
    <button type="button" onClick={copy} className="w-full text-[11px] font-semibold text-primary/90 hover:text-primary flex items-center justify-center gap-1.5 py-1">
      <Copy className="w-3.5 h-3.5" />
      {copied ? "Link copiado" : "Copiar link de compra"}
    </button>
    <p className="text-[10px] text-center text-muted-foreground/70">
      Link pessoal válido por 5 minutos e para um único acesso. Não compartilhe.
    </p>
    {manualCopy && <input
      aria-label="Link pessoal de compra"
      readOnly
      value={link.url}
      onFocus={(event) => event.currentTarget.select()}
      className="w-full rounded-lg bg-input p-3 text-xs"
    />}
    <button type="button" onClick={prepare} disabled={preparing} className="w-full text-xs text-primary underline">
      {preparing ? "Gerando..." : "Gerar novo link"}
    </button>
  </>;
}
