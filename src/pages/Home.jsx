import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function Home() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const addLog = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    addLog('🚀 Starting Home page initialization');
    
    const init = async () => {
      try {
        addLog('📡 Checking authentication...');
        const user = await base44.auth.me();
        addLog(`✅ User authenticated: ${user?.email || 'unknown'}`, 'success');
        
        addLog('📊 Loading entities...');
        const clients = await base44.entities.Client.list();
        addLog(`✅ Loaded ${clients?.length || 0} clients`, 'success');
        
        const projects = await base44.entities.Project.list();
        addLog(`✅ Loaded ${projects?.length || 0} projects`, 'success');
        
        addLog('🎉 All systems operational!', 'success');
        setLoading(false);
      } catch (err) {
        addLog(`❌ Error: ${err.message}`, 'error');
        setError(err.message);
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 shadow-lg">
          <h1 className="text-3xl font-bold mb-6 text-center">
            🔍 דיבאג ומעקב מערכת
          </h1>
          
          {loading && (
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>טוען מערכת...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-800">שגיאה קריטית</div>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="font-semibold text-lg mb-3">לוגים:</h2>
            {logs.map((log, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border ${
                  log.type === 'error' 
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : log.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  {log.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  {log.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <span className="text-xs text-slate-500">[{log.time}]</span>
                    <span className="mr-2">{log.message}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && !error && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">המערכת פועלת תקין!</span>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Button 
              onClick={() => {
                setLogs([]);
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
              variant="outline"
              className="w-full"
            >
              🔄 טען מחדש
            </Button>
          </div>
        </Card>

        <div className="mt-4 text-center text-sm text-slate-500">
          פתח את קונסולת המפתחים (F12) למידע נוסף
        </div>
      </div>
    </div>
  );
}