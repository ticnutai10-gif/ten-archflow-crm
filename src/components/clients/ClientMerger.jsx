import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Users, ArrowRight, Check, X, CheckSquare } from "lucide-react";
import { Client } from "@/entities/Client";

export default function ClientMerger({ clients, onMerged, onCancel }) {
  const [selectedMaster, setSelectedMaster] = useState({});
  const [merging, setMerging] = useState(false);

  // זיהוי לקוחות כפולים לפי שם
  const findDuplicates = () => {
    const groups = {};
    clients.forEach(client => {
      const name = client.name?.trim().toLowerCase();
      if (name && name !== 'לקוח ללא שם') {
        if (!groups[name]) groups[name] = [];
        groups[name].push(client);
      }
    });
    
    // החזרת רק קבוצות עם יותר מלקוח אחד
    return Object.entries(groups).filter(([_, group]) => group.length > 1);
  };

  const duplicateGroups = findDuplicates();

  // NEW: בחירת הכל - בוחר את הלקוח הראשון בכל קבוצה
  const selectAllMasters = () => {
    const newSelected = {};
    duplicateGroups.forEach(([groupName, duplicates]) => {
      // בוחר את הלקוח הראשון (או יכול להיות לפי קריטריון אחר)
      const firstClient = duplicates.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
      newSelected[groupName] = firstClient.id;
    });
    setSelectedMaster(newSelected);
  };

  // NEW: בטל בחירת הכל
  const clearAllSelections = () => {
    setSelectedMaster({});
  };

  // NEW: מיזוג כל הקבוצות שנבחרו
  const mergeAll = async () => {
    if (Object.keys(selectedMaster).length === 0) return;
    
    const confirmed = confirm(`האם למזג ${Object.keys(selectedMaster).length} קבוצות של לקוחות כפולים?`);
    if (!confirmed) return;

    setMerging(true);
    
    try {
      for (const [groupName, duplicates] of duplicateGroups) {
        const masterId = selectedMaster[groupName];
        if (!masterId) continue; // דלג על קבוצות שלא נבחרו

        const master = duplicates.find(c => c.id === masterId);
        const toDelete = duplicates.filter(c => c.id !== masterId);
        
        // מיזוג נתונים - לוקח נתונים חסרים מהכפולים
        const mergedData = { ...master };
        
        toDelete.forEach(duplicate => {
          // מיזוג שדות ריקים
          Object.keys(duplicate).forEach(key => {
            if (key !== 'id' && key !== 'created_date' && key !== 'updated_date' && key !== 'created_by') {
              if (!mergedData[key] && duplicate[key]) {
                mergedData[key] = duplicate[key];
              }
            }
          });
          
          // מיזוג custom_data
          if (duplicate.custom_data) {
            mergedData.custom_data = {
              ...mergedData.custom_data,
              ...duplicate.custom_data
            };
          }
        });
        
        // עדכון הלקוח הראשי
        await Client.update(masterId, mergedData);
        
        // מחיקת הכפולים
        for (const duplicate of toDelete) {
          await Client.delete(duplicate.id);
        }
      }
      
      onMerged?.();
      
    } catch (error) {
      console.error('שגיאה במיזוג לקוחות:', error);
      alert('שגיאה במיזוג הלקוחות');
    } finally {
      setMerging(false);
    }
  };

  const handleMergeGroup = async (groupName, duplicates) => {
    const masterId = selectedMaster[groupName];
    if (!masterId) return;

    setMerging(true);
    
    try {
      const master = duplicates.find(c => c.id === masterId);
      const toDelete = duplicates.filter(c => c.id !== masterId);
      
      // מיזוג נתונים - לוקח נתונים חסרים מהכפולים
      const mergedData = { ...master };
      
      toDelete.forEach(duplicate => {
        // מיזוג שדות ריקים
        Object.keys(duplicate).forEach(key => {
          if (key !== 'id' && key !== 'created_date' && key !== 'updated_date' && key !== 'created_by') {
            if (!mergedData[key] && duplicate[key]) {
              mergedData[key] = duplicate[key];
            }
          }
        });
        
        // מיזוג custom_data
        if (duplicate.custom_data) {
          mergedData.custom_data = {
            ...mergedData.custom_data,
            ...duplicate.custom_data
          };
        }
      });
      
      // עדכון הלקוח הראשי
      await Client.update(masterId, mergedData);
      
      // מחיקת הכפולים
      for (const duplicate of toDelete) {
        await Client.delete(duplicate.id);
      }
      
      // עדכון ה-selectedMaster
      const newSelected = { ...selectedMaster };
      delete newSelected[groupName];
      setSelectedMaster(newSelected);
      
      onMerged?.();
      
    } catch (error) {
      console.error('שגיאה במיזוג לקוחות:', error);
      alert('שגיאה במיזוג הלקוחות');
    } finally {
      setMerging(false);
    }
  };

  if (duplicateGroups.length === 0) {
    return (
      <div className="text-center py-8">
        <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-600 mb-2">אין לקוחות כפולים</h3>
        <p className="text-slate-500">לא נמצאו לקוחות עם שמות זהים</p>
        <Button onClick={onCancel} className="mt-4">סגור</Button>
      </div>
    );
  }

  const selectedCount = Object.keys(selectedMaster).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">מיזוג לקוחות כפולים</h2>
        <p className="text-slate-600">נמצאו {duplicateGroups.length} קבוצות של לקוחות עם שמות זהים</p>
      </div>

      {/* NEW: כפתורי בקרה כלליים */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                נבחרו {selectedCount} מתוך {duplicateGroups.length} קבוצות למיזוג
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllMasters}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <CheckSquare className="w-4 h-4 ml-2" />
                בחר הכל (הראשון בכל קבוצה)
              </Button>
              
              <Button
                variant="outline" 
                size="sm"
                onClick={clearAllSelections}
                disabled={selectedCount === 0}
                className="border-slate-300"
              >
                <X className="w-4 h-4 ml-2" />
                בטל בחירת הכל
              </Button>
              
              <Button
                onClick={mergeAll}
                disabled={selectedCount === 0 || merging}
                className="bg-green-600 hover:bg-green-700"
              >
                {merging ? 'ממזג...' : `מזג ${selectedCount} קבוצות`}
              </Button>
              
              <Button variant="outline" onClick={onCancel}>
                ביטול
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {duplicateGroups.map(([groupName, duplicates]) => (
        <Card key={groupName} className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              שם: "{duplicates[0].name}" ({duplicates.length} לקוחות)
              {selectedMaster[groupName] && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  נבחר למיזוג
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <p className="text-sm text-slate-600 mb-4">
                בחר איזה לקוח ישמור את הרשומה הראשית. שאר הלקוחות יימחקו, אבל הנתונים שלהם יתמזגו אל הרשומה הראשית.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {duplicates.map((client, index) => (
                  <div
                    key={client.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedMaster[groupName] === client.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedMaster(prev => ({
                      ...prev,
                      [groupName]: client.id
                    }))}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedMaster[groupName] === client.id
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-slate-300'
                      }`}>
                        {selectedMaster[groupName] === client.id && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{client.name}</div>
                        <div className="text-xs text-slate-500">
                          נוצר ב-{new Date(client.created_date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {client.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="font-medium">טלפון:</span> {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="font-medium">אימייל:</span> {client.email}
                        </div>
                      )}
                      {client.company && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="font-medium">חברה:</span> {client.company}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {client.status}
                        </Badge>
                        {client.source && (
                          <Badge variant="outline" className="text-xs">
                            {client.source}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  onClick={() => handleMergeGroup(groupName, duplicates)}
                  disabled={!selectedMaster[groupName] || merging}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {merging ? 'ממזג...' : 'מזג קבוצה זו'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}