import React from "react";
import DocumentUploader from "./DocumentUploader";
import DocumentList from "./DocumentList";

export default function ClientDocuments({ client }) {
  if (!client) return null;
  const preset = { client_id: client.id, client_name: client.name };
  return (
    <div className="space-y-4">
      <DocumentUploader preset={preset} />
      <DocumentList initialFilter={{ client_id: client.id }} />
    </div>
  );
}