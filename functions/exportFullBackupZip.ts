import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const zip = new JSZip();

    // ========== USERS ==========
    const users = await base44.asServiceRole.entities.User.list();
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list();
    const teamMemberMap = {};
    teamMembers.forEach(tm => { teamMemberMap[tm.email] = tm; });
    
    const usersHeaders = ['מזהה', 'שם מלא', 'אימייל', 'תפקיד', 'תאריך הצטרפות', 'שכר שעתי', 'אחוז מעמ', 'שעות שבועיות'];
    const usersRows = users.map(u => {
      const tm = teamMemberMap[u.email] || {};
      return [u.id, u.full_name || '', u.email || '', u.role || 'user', 
              u.created_date ? new Date(u.created_date).toLocaleDateString('he-IL') : '',
              tm.hourly_rate || 0, tm.vat_percentage || 17, tm.capacity_hours_per_week || 40
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    zip.file('users.csv', '\uFEFF' + [usersHeaders.join(','), ...usersRows].join('\n'));

    // ========== CLIENTS ==========
    const clients = await base44.entities.Client.list();
    const clientsHeaders = ['מזהה', 'שם', 'אימייל', 'טלפון', 'חברה', 'שלב', 'סטטוס', 'טווח תקציב', 'מקור', 'כתובת', 'תאריך יצירה', 'הערות'];
    const clientsRows = clients.map(c => [
      c.id, c.name || '', c.email || '', c.phone || '', c.company || '', c.stage || '', c.status || '',
      c.budget_range || '', c.source || '', c.address || '',
      c.created_date ? new Date(c.created_date).toLocaleDateString('he-IL') : '', (c.notes || '').replace(/\n/g, ' ')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    zip.file('clients.csv', '\uFEFF' + [clientsHeaders.join(','), ...clientsRows].join('\n'));

    // ========== TIME LOGS DETAILED ==========
    const timeLogs = await base44.asServiceRole.entities.TimeLog.list('-log_date', 10000);
    const userMap = {};
    users.forEach(u => { userMap[u.email] = u.full_name || u.email; });

    const clientTotals = {};
    timeLogs.forEach(log => {
      const clientKey = log.client_id || log.client_name;
      if (!clientTotals[clientKey]) clientTotals[clientKey] = { totalSeconds: 0, totalCost: 0 };
      const seconds = log.duration_seconds || 0;
      const hours = seconds / 3600;
      const rate = log.hourly_rate || teamMemberMap[log.user_email]?.hourly_rate || 0;
      clientTotals[clientKey].totalSeconds += seconds;
      clientTotals[clientKey].totalCost += hours * rate;
    });

    const formatDuration = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}:${String(m).padStart(2, '0')}`;
    };

    const logsHeaders = ['מזהה', 'תאריך', 'כותרת', 'הערות', 'משך (שעות:דקות)', 'משך (דקות)', 'משך (שעות עשרוני)',
      'אימייל עובד', 'שם עובד', 'שם לקוח', 'מזהה לקוח', 'שכר שעתי', 'עלות לוג',
      'סה"כ שעות על לקוח', 'סה"כ עלות על לקוח', 'פרויקט', 'משימה', 'לחיוב'];
    const logsRows = timeLogs.map(log => {
      const seconds = log.duration_seconds || 0;
      const hours = seconds / 3600;
      const userName = userMap[log.user_email] || log.user_name || log.user_email || '';
      const rate = log.hourly_rate || teamMemberMap[log.user_email]?.hourly_rate || 0;
      const clientKey = log.client_id || log.client_name;
      const ct = clientTotals[clientKey] || { totalSeconds: 0, totalCost: 0 };
      return [log.id, log.log_date || '', log.title || '', (log.notes || '').replace(/\n/g, ' '),
        formatDuration(seconds), Math.round(seconds / 60), hours.toFixed(2),
        log.user_email || log.created_by || '', userName, log.client_name || '', log.client_id || '',
        rate, (hours * rate).toFixed(2), formatDuration(ct.totalSeconds), ct.totalCost.toFixed(2),
        log.project_name || '', log.task_title || '', log.billable !== false ? 'כן' : 'לא'
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    zip.file('timelogs_detailed.csv', '\uFEFF' + [logsHeaders.join(','), ...logsRows].join('\n'));

    // ========== SPREADSHEETS ==========
    const spreadsheets = await base44.entities.CustomSpreadsheet.list();
    const spreadsheetsFolder = zip.folder('spreadsheets');

    // Spreadsheets metadata CSV
    const ssHeaders = ['מזהה', 'שם', 'תיאור', 'לקוח', 'מספר עמודות', 'מספר שורות', 'תאריך יצירה'];
    const ssRows = spreadsheets.map(ss => [
      ss.id, ss.name || '', ss.description || '', ss.client_name || '',
      (ss.columns || []).length, (ss.rows_data || []).length,
      ss.created_date ? new Date(ss.created_date).toLocaleDateString('he-IL') : ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    zip.file('spreadsheets_list.csv', '\uFEFF' + [ssHeaders.join(','), ...ssRows].join('\n'));

    // Export each spreadsheet data as CSV
    for (const ss of spreadsheets) {
      if (!ss.columns || !ss.rows_data) continue;
      const cols = ss.columns.filter(c => c.visible !== false);
      const headers = cols.map(c => c.title || c.key);
      const rows = ss.rows_data.map(row => 
        cols.map(c => `"${String(row[c.key] || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(',')
      );
      const safeName = (ss.name || 'spreadsheet').replace(/[^א-תa-zA-Z0-9_-]/g, '_');
      spreadsheetsFolder.file(`${safeName}_${ss.id}.csv`, '\uFEFF' + [headers.join(','), ...rows].join('\n'));
    }

    // ========== DOCUMENTATION ==========
    const docContent = generateDocumentation(users, clients, timeLogs, spreadsheets, teamMembers);
    zip.file('documentation.md', docContent);

    // Generate zip
    const zipContent = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=full_backup_${new Date().toISOString().split('T')[0]}.zip`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateDocumentation(users, clients, timeLogs, spreadsheets, teamMembers) {
  const now = new Date().toLocaleString('he-IL');
  
  // Calculate stats
  const totalLogSeconds = timeLogs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
  const totalLogHours = (totalLogSeconds / 3600).toFixed(1);
  
  const clientLogStats = {};
  const userLogStats = {};
  
  timeLogs.forEach(log => {
    const clientKey = log.client_name || log.client_id || 'לא ידוע';
    const userKey = log.user_email || log.created_by || 'לא ידוע';
    const seconds = log.duration_seconds || 0;
    
    if (!clientLogStats[clientKey]) clientLogStats[clientKey] = { seconds: 0, count: 0 };
    clientLogStats[clientKey].seconds += seconds;
    clientLogStats[clientKey].count++;
    
    if (!userLogStats[userKey]) userLogStats[userKey] = { seconds: 0, count: 0 };
    userLogStats[userKey].seconds += seconds;
    userLogStats[userKey].count++;
  });

  const teamMemberMap = {};
  teamMembers.forEach(tm => { teamMemberMap[tm.email] = tm; });

  let doc = `# תיעוד מערכת מלא - גיבוי נתונים
> נוצר בתאריך: ${now}

---

## סיכום כללי

| נתון | ערך |
|------|-----|
| סה"כ משתמשים | ${users.length} |
| סה"כ לקוחות | ${clients.length} |
| סה"כ רישומי זמן | ${timeLogs.length} |
| סה"כ שעות עבודה | ${totalLogHours} |
| סה"כ טבלאות | ${spreadsheets.length} |

---

## 1. משתמשים (Users)

### קובץ: users.csv

רשימת כל המשתמשים במערכת כולל פרטי שכר ושעות עבודה.

**עמודות:**
- **מזהה** - מזהה ייחודי של המשתמש
- **שם מלא** - שם התצוגה
- **אימייל** - כתובת דוא"ל
- **תפקיד** - admin או user
- **תאריך הצטרפות** - מתי הצטרף למערכת
- **שכר שעתי** - שכר לשעת עבודה (מ-TeamMember)
- **אחוז מע"מ** - אחוז המע"מ
- **שעות שבועיות** - קיבולת שעות שבועית

### סטטיסטיקות עבודה לפי משתמש:

| משתמש | שעות עבודה | מספר לוגים |
|-------|-----------|------------|
`;

  Object.entries(userLogStats)
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .forEach(([email, stats]) => {
      const hours = (stats.seconds / 3600).toFixed(1);
      const userName = users.find(u => u.email === email)?.full_name || email;
      doc += `| ${userName} | ${hours} | ${stats.count} |\n`;
    });

  doc += `

---

## 2. לקוחות (Clients)

### קובץ: clients.csv

רשימת כל הלקוחות במערכת.

**עמודות:**
- **מזהה** - מזהה ייחודי
- **שם** - שם הלקוח
- **אימייל** - כתובת דוא"ל
- **טלפון** - מספר טלפון
- **חברה** - שם החברה
- **שלב** - שלב הלקוח בתהליך
- **סטטוס** - פוטנציאלי/פעיל/לא פעיל
- **טווח תקציב** - טווח התקציב המשוער
- **מקור** - מקור ההגעה
- **כתובת** - כתובת מלאה
- **תאריך יצירה** - מתי נוצר הרשומה
- **הערות** - הערות חופשיות

### סטטיסטיקות עבודה לפי לקוח:

| לקוח | שעות עבודה | מספר לוגים | עלות משוערת |
|------|-----------|------------|-------------|
`;

  Object.entries(clientLogStats)
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .slice(0, 30)
    .forEach(([clientName, stats]) => {
      const hours = stats.seconds / 3600;
      // Estimate cost based on average rate
      const avgRate = teamMembers.length > 0 
        ? teamMembers.reduce((sum, tm) => sum + (tm.hourly_rate || 0), 0) / teamMembers.length 
        : 0;
      const cost = (hours * avgRate).toFixed(0);
      doc += `| ${clientName} | ${hours.toFixed(1)} | ${stats.count} | ₪${cost} |\n`;
    });

  doc += `

---

## 3. רישומי זמן (Time Logs)

### קובץ: timelogs_detailed.csv

רשימת כל רישומי הזמן עם חיבור מלא לעובדים וללקוחות.

**עמודות:**
- **מזהה** - מזהה ייחודי של הלוג
- **תאריך** - תאריך הרישום
- **כותרת** - תיאור קצר של העבודה
- **הערות** - הערות נוספות
- **משך (שעות:דקות)** - משך בפורמט שעות:דקות
- **משך (דקות)** - משך בדקות
- **משך (שעות עשרוני)** - משך בשעות עשרוניות (לחישוב)
- **אימייל עובד** - האימייל של מי שביצע
- **שם עובד** - השם המלא של העובד
- **שם לקוח** - שם הלקוח
- **מזהה לקוח** - מזהה הלקוח
- **שכר שעתי** - שכר שעתי של העובד
- **עלות לוג** - עלות הלוג הספציפי (שעות × שכר)
- **סה"כ שעות על לקוח** - סה"כ שעות עבודה על הלקוח הזה
- **סה"כ עלות על לקוח** - סה"כ עלות עבודה על הלקוח
- **פרויקט** - שם הפרויקט (אם קיים)
- **משימה** - שם המשימה (אם קיים)
- **לחיוב** - האם ניתן לחיוב

### לוגיקת החיבורים:
1. **חיבור לעובד**: הלוג מחובר לעובד לפי שדה \`user_email\` או \`created_by\`
2. **חיבור ללקוח**: הלוג מחובר ללקוח לפי \`client_id\` או \`client_name\`
3. **חישוב עלות**: עלות = שעות × שכר שעתי (מהעובד או מ-TeamMember)

---

## 4. טבלאות (Spreadsheets)

### קובץ: spreadsheets_list.csv
רשימת כל הטבלאות במערכת.

### תיקייה: spreadsheets/
כל טבלה מיוצאת כקובץ CSV נפרד עם הנתונים שלה.

**רשימת הטבלאות:**
`;

  spreadsheets.forEach(ss => {
    doc += `
#### ${ss.name || 'ללא שם'}
- **מזהה**: ${ss.id}
- **תיאור**: ${ss.description || 'אין'}
- **לקוח משויך**: ${ss.client_name || 'כללי'}
- **מספר עמודות**: ${(ss.columns || []).length}
- **מספר שורות**: ${(ss.rows_data || []).length}
- **קובץ**: spreadsheets/${(ss.name || 'spreadsheet').replace(/[^א-תa-zA-Z0-9_-]/g, '_')}_${ss.id}.csv
`;
  });

  doc += `

---

## 5. מבנה הקבצים

\`\`\`
full_backup_YYYY-MM-DD.zip
├── users.csv              # משתמשים
├── clients.csv            # לקוחות
├── timelogs_detailed.csv  # לוגי זמן מפורטים
├── spreadsheets_list.csv  # רשימת טבלאות
├── spreadsheets/          # תיקיית טבלאות
│   ├── table1_id.csv
│   ├── table2_id.csv
│   └── ...
└── documentation.md       # מסמך זה
\`\`\`

---

## 6. הוראות שחזור

### שחזור משתמשים:
1. פתח את קובץ users.csv
2. השתמש בייבוא נתונים במערכת או API

### שחזור לקוחות:
1. פתח את קובץ clients.csv
2. ייבא דרך ממשק הייבוא או API

### שחזור לוגי זמן:
1. קובץ timelogs_detailed.csv מכיל את כל הנתונים
2. שים לב - שדות החיבור (עובד, לקוח) צריכים להתאים לנתונים הקיימים

### שחזור טבלאות:
1. צור טבלה חדשה עם אותו מבנה עמודות
2. ייבא את הנתונים מקובץ ה-CSV המתאים

---

## 7. הערות חשובות

- כל הקבצים בקידוד UTF-8 עם BOM (לתמיכה בעברית באקסל)
- תאריכים בפורמט ישראלי (יום/חודש/שנה)
- סכומים כספיים בשקלים (₪)
- שעות בפורמט עשרוני (1.5 = שעה וחצי)

---

*מסמך זה נוצר אוטומטית על ידי מערכת הגיבוי*
`;

  return doc;
}