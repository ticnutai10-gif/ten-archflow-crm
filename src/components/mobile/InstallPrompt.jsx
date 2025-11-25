import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user previously dismissed
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedDate = dismissed ? new Date(dismissed) : null;
      const daysSinceDismissed = dismissedDate 
        ? (new Date() - dismissedDate) / (1000 * 60 * 60 * 24)
        : 999;

      // Show if not dismissed or dismissed more than 7 days ago
      if (!dismissed || daysSinceDismissed > 7) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
  };

  return (
    <>
      {showPrompt && (
        <div
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
          style={{ touchAction: 'manipulation' }}
        >
          <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl border-0">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">התקן את האפליקציה</h3>
                    <p className="text-sm text-white/90">גישה מהירה מהמסך הראשי</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleInstall}
                  className="flex-1 bg-white text-blue-600 hover:bg-white/90 gap-2"
                >
                  <Download className="w-4 h-4" />
                  התקן עכשיו
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  אולי מאוחר יותר
                </Button>
              </div>

              <div className="mt-3 text-xs text-white/80 text-center">
                ✓ פתיחה מהירה  •  ✓ עבודה אופליין  •  ✓ התראות
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}