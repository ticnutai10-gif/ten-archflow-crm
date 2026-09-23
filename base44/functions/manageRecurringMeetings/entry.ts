import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Scheduled task: Run daily (e.g., at 01:00)
// This function checks for recurring meetings and creates the next instance if needed.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me(); // Usually service role when scheduled, but good to check context

    // 1. Fetch recurring meetings that are active (not cancelled)
    const recurringMeetings = await base44.asServiceRole.entities.Meeting.filter({
      'recurrence.enabled': true,
      status: { $ne: 'בוטלה' }
    });

    const createdInstances = [];
    const now = new Date();
    const lookaheadDate = new Date();
    lookaheadDate.setDate(lookaheadDate.getDate() + 30); // Ensure meetings for next 30 days exist

    for (const meeting of recurringMeetings) {
      if (!meeting.recurrence || !meeting.meeting_date) continue;

      const lastDate = new Date(meeting.meeting_date);
      const { frequency, interval = 1, end_date } = meeting.recurrence;

      // Determine next date
      let nextDate = new Date(lastDate);
      
      // Calculate next occurrence based on frequency
      // Note: This logic assumes we are looking at the PARENT meeting or the LATEST instance.
      // Ideally, we should find the latest instance in the series.
      // But for simplicity, we check if *this* meeting needs a successor.
      // A robust system tracks the 'series' or 'next_due_date'.
      // Here we will search if a meeting with 'parent_meeting_id' == meeting.id exists with a later date.
      
      // Better strategy: "Generate next if not exists"
      // 1. Find all instances for this series (parent + children)
      // 2. Sort by date desc
      // 3. Take latest date.
      // 4. If latest date < lookaheadDate, generate next.
      
      const parentId = meeting.parent_meeting_id || meeting.id;
      
      // Find all related meetings (parent or children of same parent)
      // We can't do complex OR queries easily sometimes, so we fetch children of this ID (if it's parent)
      // or siblings (if it's child).
      // Let's assume 'meeting' is the definition. We query for all meetings where parent_meeting_id = parentId OR id = parentId
      // Optimization: Just query where parent_meeting_id = parentId
      const children = await base44.asServiceRole.entities.Meeting.filter({
        parent_meeting_id: parentId
      });
      
      // Include the parent itself in the list to find max date
      let allInstances = [...children];
      if (meeting.id === parentId) {
        allInstances.push(meeting);
      } else {
        // If we are processing a child, we might not have the parent in 'recurringMeetings' list if we filtered by something else
        // But since we iterate all recurring meetings, we might process the same series multiple times.
        // Optimization: Only process if meeting.id === parentId (The "Master" record)
        // If the user turned on recurrence on a child, it effectively becomes a new series or modifies the existing one.
        // Let's stick to: Only process if meeting.id == parentId (Original recurring meeting)
        // If 'parent_meeting_id' is NOT set, then THIS is the parent.
      }

      if (meeting.parent_meeting_id) {
        continue; // Skip children, only process parent to avoid duplicates
      }

      // Sort by date
      allInstances.sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date));
      const latestInstance = allInstances[0];
      const latestDate = new Date(latestInstance.meeting_date);

      // Calculate next date from LATEST instance
      let targetDate = new Date(latestDate);
      switch (frequency) {
        case 'daily':
          targetDate.setDate(targetDate.getDate() + interval);
          break;
        case 'weekly':
          targetDate.setDate(targetDate.getDate() + (interval * 7));
          break;
        case 'monthly':
          targetDate.setMonth(targetDate.getMonth() + interval);
          break;
        case 'yearly':
          targetDate.setFullYear(targetDate.getFullYear() + interval);
          break;
      }

      // Check constraints
      if (end_date && targetDate > new Date(end_date)) {
        continue; // Series ended
      }

      if (targetDate <= lookaheadDate) {
        // Create next instance
        const newMeeting = {
          ...meeting,
          id: undefined, // Create new
          created_date: undefined,
          updated_date: undefined,
          meeting_date: targetDate.toISOString(),
          status: 'מתוכננת', // Reset status
          parent_meeting_id: parentId, // Link to parent
          google_calendar_event_id: null, // Don't copy external ID, let sync handle it
          recurrence: { ...meeting.recurrence, enabled: false } // Child doesn't spawn more, parent does
          // Note: Keeping recurrence info on child might be useful for UI "This is recurring", but 'enabled: false' prevents infinite loops if we change logic
        };

        // Remove system fields
        delete newMeeting.id;
        delete newMeeting.created_date;
        delete newMeeting.updated_date;
        delete newMeeting.created_by;

        const created = await base44.asServiceRole.entities.Meeting.create(newMeeting);
        createdInstances.push(created.id);
        console.log(`Created recurring meeting instance: ${created.title} on ${targetDate.toISOString()}`);
      }
    }

    return Response.json({ 
      success: true, 
      created_count: createdInstances.length, 
      created_ids: createdInstances 
    });

  } catch (error) {
    console.error('Recurring Meetings Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});