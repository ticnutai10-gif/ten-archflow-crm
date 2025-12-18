/**
 * Client Sync Manager
 * מנהל סנכרון מרכזי לעדכוני לקוחות בין כל הקומפוננטות
 * 
 * שימוש:
 * - קומפוננטה ששומרת שינוי: ClientSyncManager.broadcast(updatedClient)
 * - קומפוננטה שרוצה להאזין: const client = useClientSync(clientId)
 */

import { useEffect, useState, useCallback } from 'react';

// אירוע מרכזי לסנכרון
const SYNC_EVENT = 'client:sync';

// Cache מרכזי לכל הלקוחות
let clientsCache = new Map();

/**
 * שידור עדכון לקוח לכל הקומפוננטות
 */
export function broadcastClientUpdate(client) {
  if (!client?.id) {
    console.warn('⚠️ [SYNC] Cannot broadcast - no client id');
    return;
  }

  console.log('📡 [SYNC] Broadcasting client update:', {
    id: client.id,
    name: client.name,
    stage: client.stage
  });

  // עדכון ה-cache המרכזי
  clientsCache.set(client.id, { ...clientsCache.get(client.id), ...client });

  // שליחת אירוע גלובלי
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, {
    detail: {
      type: 'update',
      client: client,
      timestamp: Date.now()
    }
  }));
}

/**
 * קבלת לקוח מה-cache
 */
export function getCachedClient(clientId) {
  return clientsCache.get(clientId);
}

/**
 * עדכון ה-cache עם רשימת לקוחות
 */
export function updateClientsCache(clients) {
  if (!Array.isArray(clients)) return;
  
  clients.forEach(client => {
    if (client?.id) {
      clientsCache.set(client.id, client);
    }
  });
}

/**
 * Hook להאזנה לעדכוני לקוח ספציפי
 */
export function useClientSync(clientId) {
  const [client, setClient] = useState(() => clientsCache.get(clientId));

  useEffect(() => {
    if (!clientId) return;

    const handleSync = (event) => {
      const { client: updatedClient } = event.detail;
      if (updatedClient?.id === clientId) {
        console.log('🔄 [SYNC HOOK] Received update for client:', clientId);
        setClient(prev => ({ ...prev, ...updatedClient }));
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, [clientId]);

  return client;
}

/**
 * Hook להאזנה לכל עדכוני הלקוחות
 */
export function useClientsSync(initialClients = []) {
  const [clients, setClients] = useState(initialClients);

  // עדכון ה-state כש-initialClients משתנה
  useEffect(() => {
    if (initialClients.length > 0) {
      setClients(initialClients);
      updateClientsCache(initialClients);
    }
  }, [initialClients]);

  useEffect(() => {
    const handleSync = (event) => {
      const { client: updatedClient } = event.detail;
      if (!updatedClient?.id) return;

      console.log('🔄 [SYNC HOOK] Updating clients list with:', {
        id: updatedClient.id,
        stage: updatedClient.stage
      });

      setClients(prev => prev.map(c => 
        c.id === updatedClient.id ? { ...c, ...updatedClient } : c
      ));
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, []);

  const updateClient = useCallback((clientId, updates) => {
    setClients(prev => prev.map(c => 
      c.id === clientId ? { ...c, ...updates } : c
    ));
    
    const client = clients.find(c => c.id === clientId);
    if (client) {
      broadcastClientUpdate({ ...client, ...updates });
    }
  }, [clients]);

  return { clients, setClients, updateClient };
}

/**
 * Hook פשוט להאזנה לאירועי סנכרון
 */
export function useOnClientUpdate(callback) {
  useEffect(() => {
    const handleSync = (event) => {
      const { client } = event.detail;
      if (client) {
        callback(client);
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    return () => window.removeEventListener(SYNC_EVENT, handleSync);
  }, [callback]);
}

export default {
  broadcast: broadcastClientUpdate,
  getCached: getCachedClient,
  updateCache: updateClientsCache
};