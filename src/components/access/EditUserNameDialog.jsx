import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Pencil, Loader2, User, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { User as UserEntity } from "@/entities/User";
import { updateUserName } from "@/functions/updateUserName";

export default function EditUserNameDialog({ open, onClose, userEmail, currentFullName, onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const [debugSteps, setDebugSteps] = useState([]);

  useEffect(() => {
    if (open) {
      console.log('🔧 [EDIT USER NAME] Dialog opened with:', { userEmail, currentFullName });
      setFullName(currentFullName || "");
      setDebugInfo("");
      setDebugSteps([]);
    }
  }, [open, currentFullName, userEmail]);

  const addDebugStep = (step, status = 'info') => {
    const timestamp = new Date().toLocaleTimeString('he-IL');
    setDebugSteps(prev => [...prev, { step, status, timestamp }]);
    console.log(`[${timestamp}] [${status.toUpperCase()}] ${step}`);
  };

  const verifyUpdate = async (email, expectedName, maxAttempts = 5) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      addDebugStep(`אימות ניסיון ${attempt}/${maxAttempts}...`, 'info');
      
      try {
        let freshUsers;
        try {
          freshUsers = await UserEntity.list();
          addDebugStep(`נטענו ${freshUsers.length} משתמשים לאימות (UserEntity)`, 'info');
        } catch (e) {
          freshUsers = await base44.asServiceRole.entities.User.list();
          addDebugStep(`נטענו ${freshUsers.length} משתמשים לאימות (asServiceRole)`, 'info');
        }
        
        const updatedUser = freshUsers.find(u => u.email?.toLowerCase().trim() === email.toLowerCase().trim());
        
        if (!updatedUser) {
          addDebugStep(`⚠️ משתמש לא נמצא באימות!`, 'warning');
          continue;
        }
        
        addDebugStep(`בדיקה: "${updatedUser.full_name}" vs "${expectedName}"`, 'info');
        
        if (updatedUser.full_name === expectedName) {
          addDebugStep(`✅ אימות הצליח! השם תואם בדיוק`, 'success');
          return true;
        } else {
          addDebugStep(`⚠️ השם עדיין לא השתנה: "${updatedUser.full_name}"`, 'warning');
        }
      } catch (e) {
        addDebugStep(`❌ שגיאה באימות: ${e.message}`, 'error');
      }
      
      if (attempt < maxAttempts) {
        const waitTime = attempt * 500;
        addDebugStep(`⏳ ממתין ${waitTime}ms לפני ניסיון נוסף...`, 'info');
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    addDebugStep(`⚠️ האימות נכשל אחרי ${maxAttempts} ניסיונות`, 'warning');
    return false;
  };

  const handleSave = async () => {
    if (!userEmail) {
      toast.error('לא נמצא מייל משתמש');
      return;
    }

    if (!fullName.trim()) {
      toast.error('נא להזין שם');
      return;
    }

    setSaving(true);
    setDebugSteps([]);
    setDebugInfo("🚀 מתחיל שמירה...");
    addDebugStep('התחלת תהליך שמירה', 'info');
    
    try {
      const newName = fullName.trim();
      addDebugStep(`שם חדש: "${newName}" | אימייל: ${userEmail}`, 'info');
      
      // Step 1: Get current user
      addDebugStep('שלב 1: בודק משתמש מחובר...', 'info');
      const currentUser = await base44.auth.me().catch(() => null);
      addDebugStep(`משתמש מחובר: ${currentUser?.email || 'לא נמצא'}`, currentUser ? 'success' : 'warning');
      
      // Step 2: Load all users
      addDebugStep('שלב 2: טוען רשימת כל המשתמשים...', 'info');
      let allUsers;
      let loadMethod = '';
      
      try {
        allUsers = await UserEntity.list();
        loadMethod = 'UserEntity.list()';
        addDebugStep(`✅ נטענו ${allUsers.length} משתמשים דרך UserEntity`, 'success');
      } catch (e) {
        addDebugStep(`⚠️ UserEntity.list() נכשל: ${e.message}`, 'warning');
        try {
          allUsers = await base44.asServiceRole.entities.User.list();
          loadMethod = 'asServiceRole';
          addDebugStep(`✅ נטענו ${allUsers.length} משתמשים דרך asServiceRole`, 'success');
        } catch (e2) {
          addDebugStep(`❌ גם asServiceRole נכשל: ${e2.message}`, 'error');
          throw new Error('לא ניתן לטעון משתמשים: ' + e2.message);
        }
      }
      
      // Step 3: Find target user
      addDebugStep(`שלב 3: מחפש משתמש עם אימייל ${userEmail}...`, 'info');
      const targetUser = allUsers.find(u => 
        u.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()
      );
      
      if (!targetUser) {
        addDebugStep(`❌ משתמש לא נמצא! חיפשנו: "${userEmail}"`, 'error');
        addDebugStep(`משתמשים זמינים: ${allUsers.map(u => u.email).join(', ')}`, 'info');
        throw new Error('משתמש לא נמצא במערכת');
      }

      addDebugStep(`✅ משתמש נמצא! ID: ${targetUser.id}, שם נוכחי: "${targetUser.full_name || 'ריק'}"`, 'success');
      
      // Step 4: Perform the update using backend function
      const isSelf = currentUser && currentUser.email?.toLowerCase() === userEmail.toLowerCase();
      addDebugStep(`שלב 4: מבצע עדכון... (עורך את ${isSelf ? 'עצמי' : 'משתמש אחר'})`, 'info');
      
      if (isSelf) {
        addDebugStep('משתמש מעדכן את עצמו - משתמש ב-updateMe()', 'info');
        
        try {
          await base44.auth.updateMe({ full_name: newName });
          addDebugStep(`✅ base44.auth.updateMe() הצליח!`, 'success');
        } catch (e) {
          addDebugStep(`❌ base44.auth.updateMe() נכשל: ${e.message}`, 'error');
          throw e;
        }
        
      } else {
        addDebugStep('מעדכן משתמש אחר - קורא ל-backend function...', 'info');
        
        try {
          const response = await updateUserName({
            userEmail: userEmail,
            fullName: newName
          });
          
          addDebugStep('📥 תגובה מהשרת התקבלה', 'info');
          
          if (response.data.debugLog) {
            response.data.debugLog.forEach(log => {
              addDebugStep(`[SERVER] ${log.message}`, log.data ? 'info' : 'info');
            });
          }
          
          if (!response.data.success) {
            addDebugStep(`❌ השרת דיווח על כשלון: ${response.data.error || response.data.message}`, 'error');
            throw new Error(response.data.error || response.data.message || 'העדכון נכשל');
          }
          
          addDebugStep(`✅ Backend function הצליח! אימות: ${response.data.verified}`, 'success');
          addDebugStep(`שם חדש במערכת: "${response.data.user?.full_name}"`, 'success');
          
          // Skip frontend verification if backend already verified
          if (response.data.verified) {
            addDebugStep('✅ השרת אימת את השינוי - דילוג על אימות frontend', 'success');
            toast.success(`✅ השם עודכן בהצלחה ל-"${response.data.user.full_name}"!`);
            
            // Refresh and close
            addDebugStep('שלב 6: מרענן נתונים בעמוד...', 'info');
            if (onSuccess) {
              await onSuccess();
              addDebugStep('✅ נתוני הדף רוענן בהצלחה', 'success');
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            addDebugStep('✅ תהליך הושלם בהצלחה! סוגר חלון...', 'success');
            onClose();
            setSaving(false);
            return; // Exit early since we're done
          }
          
        } catch (e) {
          addDebugStep(`❌ Backend function נכשל: ${e.message}`, 'error');
          addDebugStep(`פרטי שגיאה: ${JSON.stringify(e.response?.data || e)}`, 'error');
          throw e;
        }
      }
      
      // Step 5: Verify the update
      addDebugStep('שלב 5: מאמת שהשינוי נשמר...', 'info');
      const verified = await verifyUpdate(userEmail, newName);
      
      if (verified) {
        addDebugStep(`✅ האימות הצליח! השם "${newName}" נשמר במערכת`, 'success');
        toast.success(`✅ השם עודכן ואומת בהצלחה ל-"${newName}"!`);
      } else {
        addDebugStep(`⚠️ לא הצלחנו לאמת את השינוי אחרי 5 ניסיונות`, 'warning');
        toast.warning('⚠️ השם עודכן אך לא אומת במלואו. אנא רענן את הדף.');
      }
      
      // Step 6: Refresh data
      addDebugStep('שלב 6: מרענן נתונים בעמוד...', 'info');
      if (onSuccess) {
        await onSuccess();
        addDebugStep('✅ נתוני הדף רוענן בהצלחה', 'success');
      }
      
      // Step 7: Wait before closing
      addDebugStep('שלב 7: ממתין לפני סגירה...', 'info');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close dialog
      addDebugStep('✅ תהליך הושלם בהצלחה! סוגר חלון...', 'success');
      onClose();
      
    } catch (error) {
      console.error('❌ [EDIT USER NAME] CRITICAL ERROR:', {
        error,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      addDebugStep(`❌ שגיאה קריטית: ${error.message}`, 'error');
      setDebugInfo(`❌ שגיאה: ${error.message}`);
      toast.error(`שגיאה בעדכון השם: ${error.message || 'שגיאה לא ידועה'}`);
      
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && !saving) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Pencil className="w-5 h-5 text-blue-600" />
            עריכת שם משתמש
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <User className="w-4 h-4" />
              <div className="text-right">
                <span className="font-semibold">מייל:</span> {userEmail}
              </div>
            </div>
            {currentFullName && (
              <div className="text-xs text-blue-600 mt-1 text-right">
                שם נוכחי: {currentFullName}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-right block font-semibold">
              שם מלא *
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="לדוגמה: יוסי כהן"
              className="text-right"
              dir="rtl"
              disabled={saving}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fullName.trim() && !saving) {
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-slate-500 text-right">
              💡 השם המלא יוצג במערכת במקום כתובת המייל
            </p>
          </div>

          {/* Debug Info Panel - Enhanced */}
          {(debugInfo || debugSteps.length > 0) && (
            <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-800 px-3 py-2 font-bold text-sm text-green-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Debug Log (Real-time)
              </div>
              <div className="p-3 text-xs font-mono max-h-96 overflow-y-auto space-y-1">
                {debugSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2 py-1 hover:bg-slate-800/50 px-1 rounded">
                    <span className="text-slate-500 flex-shrink-0 text-[10px]">{step.timestamp}</span>
                    <span className={`flex-1 ${
                      step.status === 'success' ? 'text-green-400' :
                      step.status === 'error' ? 'text-red-400' :
                      step.status === 'warning' ? 'text-yellow-400' :
                      'text-slate-300'
                    }`}>
                      {step.step}
                    </span>
                  </div>
                ))}
                {debugInfo && (
                  <div className="mt-2 pt-2 border-t border-slate-700 text-blue-400 px-1">
                    <div className="flex items-center gap-2">
                      {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>{debugInfo}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-slate-800 px-3 py-2 text-[10px] text-slate-400 border-t border-slate-700">
                💡 הלוג מציג את כל השלבים בזמן אמת
              </div>
            </div>
          )}
        </div>

        <DialogFooter dir="rtl">
          <div className="flex gap-2 justify-start w-full">
            <Button 
              onClick={handleSave} 
              disabled={saving || !fullName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  שומר ומאמת...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  שמור שינויים
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              ביטול
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}