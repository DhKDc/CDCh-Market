"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { APP_NAME } from "../lib/config";

const DISMISS_KEY = "install-prompt-dismissed";

// Evento no estándar de Chrome/Android para instalar la PWA.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (dismissed || standalone) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIOS && isSafari) {
      setShowIOS(true);
      setVisible(true);
    }

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-28 left-3 right-3 z-50 max-w-md mx-auto card p-4 shadow-lg shadow-black/40">
      <p className="font-bold flex items-center gap-2">
        <Download size={18} className="text-brand-text" /> Instala {APP_NAME}
      </p>
      {showIOS ? (
        <p className="text-sm text-muted mt-1">
          Toca el botón <b className="text-fg">Compartir</b> (el cuadrado con la flecha) y luego{" "}
          <b className="text-fg">“Agregar a pantalla de inicio”</b> para tenerla como app.
        </p>
      ) : (
        <p className="text-sm text-muted mt-1">
          Ábrela directo desde tu pantalla de inicio, sin buscarla en el navegador.
        </p>
      )}
      <div className="flex gap-2 mt-3">
        {deferred && (
          <button onClick={install} className="btn btn-primary flex-1">
            Instalar
          </button>
        )}
        <button onClick={dismiss} className="btn flex-1">
          {showIOS ? "Entendido" : "Ahora no"}
        </button>
      </div>
    </div>
  );
}
