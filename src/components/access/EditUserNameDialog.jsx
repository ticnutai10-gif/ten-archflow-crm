import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Pencil, Loader2, User, CheckCircle2, AlertCircle } from "lucide-react";
import { User as UserEntity } from "@/entities/User";

export default function EditUserNameDialog({ open, onClose, userEmail, currentFullName, onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    if (open) {
      console.log('🔧 [EDIT USER NAME] Dialog opened with:', { userEmail, currentFullName });
      setFullName(currentFullName || "");
      setDebugInfo("");
    }
  }, [open, currentFullName, userEmail]);

  const verifyUpdate = async (email, expectedName, maxAttempts = 5) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 [VERIFY] Attempt ${attempt}/${maxAttempts} - Checking if name updated...`);
      setDebugInfo(`בודק אם השם השתנה (ניסיון ${attempt}/${maxAttempts})...`);
      
      try {
        const freshUsers = await UserEntity.list().catch(() => base44.asServiceRole.entities.User.list());
        const updatedUser = freshUsers.find(u => u.email?.toLowerCase().trim() === email.toLowerCase().trim());
        
        console.log(`🔍 [VERIFY] Attempt ${attempt} result:`, {
          expectedName,
          actualName: updatedUser?.full_name,
          match: updatedUser?.full_name === expectedName
        });
        
        if (updatedUser?.full_name === expectedName) {
          console.log(`✅ [VERIFY] SUCCESS on attempt ${attempt}!`);
          setDebugInfo(`✅ העדכון אומת בהצלחה!`);
          return true;
        }
      } catch (e) {
        console.warn(`⚠️ [VERIFY] Error on attempt ${attempt}:`, e);
      }
      
      if (attempt < maxAttempts) {
        const waitTime = attempt * 500; // Progressive backoff: 500ms, 1000ms, 1500ms, etc.
        console.log(`⏳ [VERIFY] Waiting ${waitTime}ms before next attempt...`);
        setDebugInfo(`ממתין ${waitTime}ms לפני ניסיון נוסף...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    console.warn(`⚠️ [VERIFY] Failed to verify after ${maxAttempts} attempts`);
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
    setDebugInfo("🚀 מתחיל שמירה...");
    
    try {
      const newName = fullName.trim();
      console.log('💾 [EDIT USER NAME] Starting save...', { 
        userEmail, 
        fullName: newName 
      });
      
      setDebugInfo("🔍 בודק משתמש נוכחי...");
      
      // Get current user to check if we're editing ourselves
      const currentUser = await base44.auth.me().catch(() => null);
      console.log('👤 [EDIT USER NAME] Current user:', currentUser?.email);
      
      // Step 1: Find target user
      setDebugInfo("📋 טוען רשימת משתמשים...");
      let allUsers;
      try {
        allUsers = await UserEntity.list();
        console.log('📋 [EDIT USER NAME] Loaded users via UserEntity:', allUsers.length);
      } catch (e) {
        console.warn('⚠️ [EDIT USER NAME] UserEntity.list failed, trying asServiceRole:', e);
        allUsers = await base44.asServiceRole.entities.User.list();
        console.log('📋 [EDIT USER NAME] Loaded users via asServiceRole:', allUsers.length);
      }
      
      const targetUser = allUsers.find(u => 
        u.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()
      );
      
      if (!targetUser) {
        console.error('❌ [EDIT USER NAME] Target user not found:', userEmail);
        setDebugInfo(`❌ משתמש לא נמצא: ${userEmail}`);
        toast.error('משתמש לא נמצא במערכת');
        setSaving(false);
        return;
      }

      console.log('✅ [EDIT USER NAME] Target user found:', { 
        id: targetUser.id, 
        email: targetUser.email,
        currentName: targetUser.full_name,
        newName
      });
      
      // Step 2: Perform the update
      const isSelf = currentUser && currentUser.email?.toLowerCase() === userEmail.toLowerCase();
      
      if (isSelf) {
        console.log('✏️ [EDIT USER NAME] Updating SELF via updateMe');
        setDebugInfo("💾 מעדכן את המשתמש הנוכחי...");
        
        await base44.auth.updateMe({ full_name: newName });
        console.log('✅ [EDIT USER NAME] Self update complete');
        
      } else {
        console.log('✏️ [EDIT USER NAME] Updating OTHER USER');
        setDebugInfo(`💾 מעדכן משתמש: ${targetUser.email}...`);
        
        // Try all methods until one succeeds
        let updateSuccess = false;
        const methods = [
          { name: 'UserEntity.update', fn: () => UserEntity.update(targetUser.id, { full_name: newName }) },
          { name: 'asServiceRole', fn: () => base44.asServiceRole.entities.User.update(targetUser.id, { full_name: newName }) },
          { name: 'base44.entities.User', fn: () => base44.entities.User.update(targetUser.id, { full_name: newName }) }
        ];
        
        for (const method of methods) {
          try {
            console.log(`💾 [EDIT USER NAME] Trying: ${method.name}`);
            await method.fn();
            updateSuccess = true;
            console.log(`✅ [EDIT USER NAME] ${method.name} SUCCESS`);
            break;
          } catch (e) {
            console.warn(`⚠️ [EDIT USER NAME] ${method.name} failed:`, e);
          }
        }
        
        if (!updateSuccess) {
          throw new Error('כל שיטות העדכון נכשלו');
        }
      }
      
      // Step 3: Verify the update with retry logic
      console.log('🔍 [EDIT USER NAME] Starting verification process...');
      const verified = await verifyUpdate(userEmail, newName);
      
      if (verified) {
        toast.success(`✅ השם עודכן ואומת בהצלחה!`);
      } else {
        toast.warning('⚠️ השם עודכן אך לא אומת במלואו. אנא רענן את הדף.');
      }
      
      // Step 4: Refresh data
      setDebugInfo("🔄 מרענן נתונים...");
      if (onSuccess) {
        console.log('🔄 [EDIT USER NAME] Calling onSuccess to refresh data');
        await onSuccess();
      }
      
      // Step 5: Wait before closing
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Close dialog
      console.log('🚪 [EDIT USER NAME] Closing dialog');
      onClose();
      
    } catch (error) {
      console.error('❌ [EDIT USER NAME] Error updating user:', {
        error,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
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

          {debugInfo && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 text-right space-y-1">
              <div className="flex items-center gap-2">
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                )}
                <span className="font-mono">{debugInfo}</span>
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