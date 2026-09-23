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
    const quotes = await base44.entities.Quote.filter({});

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(51, 65, 85);
    doc.text('דוח הצעות מחיר', 20, 20);

    // Date
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`נוצר בתאריך ${new Date().toLocaleDateString('he-IL')}`, 20, 28);

    // Table headers
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont(undefined, 'bold');
    doc.text('מספר', 20, 40);
    doc.text('לקוח', 50, 40);
    doc.text('פרויקט', 100, 40);
    doc.text('סכום (₪)', 150, 40);
    doc.text('סטטוס', 180, 40);

    doc.setFont(undefined, 'normal');

    let y = 48;
    const lineHeight = 8;

    quotes.forEach((q) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      const amount = typeof q.amount === 'number' ? q.amount : 0;

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);

      doc.text(q.quote_number || '-', 20, y);
      doc.text(String(q.client_name || '-').slice(0, 22), 50, y);
      doc.text(String(q.project_name || '-').slice(0, 28), 100, y);

      // Amount with color
      doc.setTextColor(16, 185, 129);
      doc.text(new Intl.NumberFormat('he-IL').format(amount), 150, y);

      // Status
      doc.setTextColor(55, 65, 81);
      doc.text(String(q.status || '-'), 180, y);

      // Optional: valid until on next line faint
      if (q.valid_until) {
        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(`תקף עד: ${new Date(q.valid_until).toLocaleDateString('he-IL')}`, 50, y);
        doc.setFontSize(11);
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
        'Content-Disposition': 'attachment; filename=quotes.pdf',
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