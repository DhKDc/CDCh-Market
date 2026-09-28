"use client";
import { useEffect, useState } from "react";
import { APP_NAME } from "../lib/config";

const DISMISS_KEY = "install-prompt-dismissed";

// Evento no estándar de Chrome/Android para instalar la PWA.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Registra el service worker (requisito para poder instalar en Android).
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

    // Android / Chrome: el navegador avisa cuando la app es instalable.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iPhone / iPad (Safari): no hay evento, se muestran instrucciones.
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
    <div className="fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto bg-white dark:bg-slate-800 border border-amber-500 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold">📲 Instala {APP_NAME}</p>
      {showIOS ? (
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Toca el botón <b>Compartir</b> (el cuadrado con la flecha) y luego{" "}
          <b>“Agregar a pantalla de inicio”</b> para tenerla como app.
        </p>
      ) : (
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          Ábrela directo desde tu pantalla de inicio, sin buscarla en el navegador.
        </p>
      )}
      <div className="flex gap-2 mt-2">
        {deferred && (
          <button
            onClick={install}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded py-1.5"
          >
            Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          className="flex-1 bg-slate-200 dark:bg-slate-700 rounded py-1.5"
        >
          {showIOS ? "Entendido" : "Ahora no"}
        </button>
      </div>
    </div>
  );
}
