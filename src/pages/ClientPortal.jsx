
import React, { useEffect, useState } from "react";
import { User } from "@/entities/User";
import ClientChat from "@/components/portal/ClientChat";
import ClientTimeline from "@/components/portal/ClientTimeline";
import DocumentList from "@/components/documents/DocumentList";

export default function ClientPortalPage() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);
    })();
  }, []);

  const clientId = me?.client_id || "";
  const clientName = me?.client_name || "";

  return (
    <div className="p-6 lg:p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen pl-24 lg:pl-12" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header - This section was implicitly removed by the outline's full replacement strategy.
            If a header similar to the old one is desired, it would need to be added here explicitly.
            For now, following the outline, we go straight to the grid.
        */}
        <div className="grid gap-6">
          <ClientTimeline clientId={clientId} clientName={clientName} />
          <ClientChat clientId={clientId} clientName={clientName} />
          <DocumentList initialFilter={{ client_id: clientId }} />
        </div>
      </div>
    </div>
  );
}
