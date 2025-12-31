import React, { useState, useRef, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Play, Pause, Trash2, Volume2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/functions/uploadFile";

export default function RingtoneManager() {
  const [user, setUser] = useState(null);
  const [customRingtones, setCustomRingtones] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setCustomRingtones(currentUser.custom_ringtones || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('יש להעלות קובץ אודיו בלבד');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('קובץ גדול מדי. מקסימום 5MB');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const { data } = await uploadFile(formData);
      
      const newRingtone = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: data.file_url,
        uploaded_at: new Date().toISOString()
      };

      const updatedRingtones = [...customRingtones, newRingtone];
      
      await base44.auth.updateMe({
        custom_ringtones: updatedRingtones
      });
      
      setCustomRingtones(updatedRingtones);
      toast.success(`רינגטון "${newRingtone.name}" הועלה בהצלחה`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const playRingtone = (ringtone) => {
    if (playingId === ringtone.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    audioRef.current = new Audio(ringtone.url);
    audioRef.current.volume = 0.7;
    
    audioRef.current.onended = () => {
      setPlayingId(null);
    };
    
    audioRef.current.onerror = () => {
      toast.error('שגיאה בנגינת הרינגטון');
      setPlayingId(null);
    };
    
    audioRef.current.play().then(() => {
      setPlayingId(ringtone.id);
    }).catch(() => {
      toast.error('לא ניתן לנגן את הרינגטון');
    });
  };

  const deleteRingtone = async (ringtoneId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הרינגטון?')) {
      return;
    }

    try {
      const updatedRingtones = customRingtones.filter(r => r.id !== ringtoneId);
      
      await base44.auth.updateMe({
        custom_ringtones: updatedRingtones
      });
      
      setCustomRingtones(updatedRingtones);
      
      if (playingId === ringtoneId) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setPlayingId(null);
      }
      
      toast.success('רינגטון נמחק בהצלחה');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('שגיאה במחיקת הרינגטון');
    }
  };

  return (
    <Card className="mt-6" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-right">
          <Volume2 className="w-5 h-5" />
          ניהול רינגטונים מותאמים אישית
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-right">
        <p className="text-sm text-slate-600">
          העלה קבצי אודיו משלך לשימוש כרינגטונים בתזכורות. תמיכה בפורמטים: MP3, WAV, OGG
        </p>
        
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 ml-2" />
                העלה רינגטון
              </>
            )}
          </Button>
          <span className="text-xs text-slate-500">מקסימום 5MB</span>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-slate-700">הרינגטונים שלי ({customRingtones.length})</h4>
          
          {customRingtones.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Volume2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>עדיין לא העלית רינגטונים מותאמים אישית</p>
              <p className="text-sm mt-1">לחץ על "העלה רינגטון" כדי להתחיל</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customRingtones.map((ringtone) => (
                <div key={ringtone.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div className="flex-1 text-right">
                    <h5 className="font-medium text-slate-900">{ringtone.name}</h5>
                    <p className="text-xs text-slate-500">
                      הועלה: {new Date(ringtone.uploaded_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playRingtone(ringtone)}
                    >
                      {playingId === ringtone.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRingtone(ringtone.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 bg-blue-50 rounded-lg text-right">
          <h5 className="font-medium text-blue-800 mb-2">איך להשתמש?</h5>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• בעת יצירת או עריכת משימה, תוכל לבחור מהרינגטונים המותאמים אישית</li>
            <li>• הרינגטונים יישמרו רק עבור המשתמש שלך</li>
            <li>• מומלץ לבחור קבצים קצרים (עד 10 שניות) לתזכורות יעילות</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}