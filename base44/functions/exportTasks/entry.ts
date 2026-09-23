import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  if (!(await base44.auth.isAuthenticated())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const tasks = await base44.entities.Task.filter({});

    const doc = new jsPDF('p', 'mm', 'a4');

    // Title
    doc.setFontSize(20);
    doc.setTextColor(51, 65, 85);
    doc.text('דוח משימות', 20, 20);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`נוצר בתאריך ${new Date().toLocaleDateString('he-IL')}`, 20, 28);

    // Headers
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont(undefined, 'bold');
    doc.text('כותרת', 20, 40);
    doc.text('סטטוס', 90, 40);
    doc.text('עדיפות', 120, 40);
    doc.text('לקוח', 150, 40);
    doc.text('יעד', 180, 40);

    doc.setFont(undefined, 'normal');

    let y = 48;
    const lineHeight = 8;

    tasks.forEach((t) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      const title = String(t.title || '-').slice(0, 36);
      const status = String(t.status || '-');
      const priority = String(t.priority || '-');
      const client = String(t.client_name || '-').slice(0, 22);
      const due = t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : '-';

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);

      doc.text(title, 20, y);
      doc.text(status, 90, y);
      doc.text(priority, 120, y);
      doc.text(client, 150, y);
      doc.text(due, 180, y);

      // Second row: project name and small description
      if (t.project_name || t.description) {
        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        if (t.project_name) {
          doc.text(`פרויקט: ${String(t.project_name).slice(0, 40)}`, 20, y);
        }
        if (t.description) {
          y += 4;
          doc.text(`${String(t.description).slice(0, 80)}`, 20, y);
        }
        y += 3;
      } else {
        y += lineHeight;
      }
    });

    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=tasks.pdf',
        'Content-Length': pdfBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});