import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/** Recarrega uma vez se o CSS do build falhar (index.html em cache após deploy). */
function recoverFromStaleStylesheet() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="/assets/"]');
  if (!link) return;

  const reloadOnce = () => {
    const key = "mandalario-css-reload";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    window.location.reload();
  };

  link.addEventListener("error", reloadOnce);
}

recoverFromStaleStylesheet();

createRoot(document.getElementById("root")!).render(<App />);
