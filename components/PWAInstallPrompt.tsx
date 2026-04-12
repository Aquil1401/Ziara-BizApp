"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return; // Don't show again within 7 days of dismissal
    }

    // iOS detection
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    if (ios) {
      const standalone = (window.navigator as any).standalone;
      if (!standalone) {
        setIsIOS(true);
        setShowBanner(true);
      }
      return;
    }

    // Android / Desktop — capture the beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-indigo-100 rounded-2xl shadow-2xl shadow-indigo-500/15 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden">
              <img src="/icons/icon-192x192.png" alt="BizApp" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">Install BizApp</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {isIOS
                      ? "Tap Share → Add to Home Screen"
                      : "Install for offline access & faster loading"}
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {isIOS ? (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium">
                  <Smartphone size={14} className="text-indigo-500 shrink-0" />
                  <span>Tap the <strong>Share</strong> button then <strong>"Add to Home Screen"</strong></span>
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Download size={14} />
                  Install App
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
