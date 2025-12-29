import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
  '#d946ef', '#ec4899', '#f43f5e'
];

export default function Collaborators({ spreadsheetId, currentUser, currentCell, onCollaboratorsChange }) {
  const [collaborators, setCollaborators] = useState([]);
  const [myColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)]);

  // Heartbeat and Fetch Loop
  useEffect(() => {
    if (!spreadsheetId || !currentUser) return;

    const updatePresence = async () => {
      try {
        // 1. Update my presence
        const now = new Date().toISOString();
        
        // Check if I already have a presence record to update, or create new
        // Optimization: In a real app, we'd store the ID. Here we query by email+sheet
        const myPresenceList = await base44.entities.SheetPresence.filter({
          spreadsheet_id: spreadsheetId,
          user_email: currentUser.email
        });

        if (myPresenceList.length > 0) {
          await base44.entities.SheetPresence.update(myPresenceList[0].id, {
            last_seen: now,
            focus_cell: currentCell || null,
            color: myColor,
            user_name: currentUser.full_name || currentUser.email.split('@')[0]
          });
        } else {
          await base44.entities.SheetPresence.create({
            spreadsheet_id: spreadsheetId,
            user_email: currentUser.email,
            user_name: currentUser.full_name || currentUser.email.split('@')[0],
            last_seen: now,
            focus_cell: currentCell || null,
            color: myColor
          });
        }

        // 2. Fetch all active collaborators (active in last 30 seconds)
        const allPresence = await base44.entities.SheetPresence.filter({
          spreadsheet_id: spreadsheetId
        });

        // Filter client-side for "recent" because standard filter might not support complex date math easily in list()
        const activeThreshold = new Date(Date.now() - 30 * 1000); // 30 seconds ago
        const activeCollaborators = allPresence.filter(p => new Date(p.last_seen) > activeThreshold);
        
        // Remove duplicates (if any) and exclude myself from the list passed to parent (optional, but UI usually shows others)
        // actually showing myself is fine in the top bar, but maybe distinct for cell highlighting
        
        setCollaborators(activeCollaborators);
        if (onCollaboratorsChange) {
          onCollaboratorsChange(activeCollaborators);
        }

      } catch (error) {
        console.error("Presence sync error:", error);
      }
    };

    // Initial call
    updatePresence();

    // Interval
    const interval = setInterval(updatePresence, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [spreadsheetId, currentUser, currentCell, myColor]);

  if (!collaborators.length) return null;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden px-2">
      <TooltipProvider>
        {collaborators.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div 
                className="relative inline-block border-2 border-white rounded-full transition-transform hover:scale-110 z-10"
                style={{ borderColor: user.user_email === currentUser?.email ? myColor : user.color }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback 
                    style={{ backgroundColor: user.color, color: 'white', fontSize: '10px' }}
                  >
                    {user.user_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.user_email === currentUser?.email && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.user_name} {user.user_email === currentUser?.email ? '(אני)' : ''}</p>
              {user.focus_cell && <p className="text-xs opacity-75">עורך כרגע</p>}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      {collaborators.length > 5 && (
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 border-2 border-white text-xs font-medium text-slate-600 z-0">
          +{collaborators.length - 5}
        </div>
      )}
    </div>
  );
}