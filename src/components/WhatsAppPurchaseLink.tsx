import { requestExternalUrl } from "@/lib/platform";

const WHATSAPP_URL = "https://wa.me/5521975736382";

export function WhatsAppPurchaseLink() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        if (requestExternalUrl(WHATSAPP_URL)) event.preventDefault();
      }}
      className="block text-center text-sm text-primary underline underline-offset-4 hover:text-primary/80 py-2"
    >
      Se preferir, compre pelo WhatsApp.
    </a>
  );
}
