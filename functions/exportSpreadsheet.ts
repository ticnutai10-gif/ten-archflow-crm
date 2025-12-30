import { createClientFromRequest } from 'npm:@base44/sdk@0.8.3';
import ExcelJS from 'npm:exceljs@4.4.0';

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      format, // 'xlsx', 'json', 'csv'
      data,   // rows array
      columns, // columns definition
      options, // { includeStyles: boolean, sheetName: string }
      styles // cell styles map { rowId_colKey: styleObj }
    } = await req.json();

    if (!data || !format) {
      return Response.json({ error: 'Missing data or format' }, { status: 400 });
    }

    const headers = columns.filter(c => c.visible !== false).map(c => c.title);
    const keys = columns.filter(c => c.visible !== false).map(c => c.key);

    if (format === 'json') {
      const jsonData = data.map(row => {
        const newRow = {};
        keys.forEach((key, i) => {
          newRow[headers[i]] = row[key];
        });
        return newRow;
      });
      
      return new Response(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="export.json"`,
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(options?.sheetName || 'Sheet1', {
        views: [{ rightToLeft: true }]
      });

      // Add Headers
      const headerRow = sheet.addRow(headers);
      
      if (options?.includeStyles) {
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' } // slate-100
          };
          cell.font = { bold: true };
          cell.border = {
            bottom: { style: 'thin' }
          };
        });
      }

      // Add Data
      data.forEach(row => {
        const rowValues = keys.map(key => {
          const val = row[key];
          return val === undefined || val === null ? '' : String(val);
        });
        const excelRow = sheet.addRow(rowValues);

        // Apply Styles
        if (options?.includeStyles && styles) {
          keys.forEach((key, index) => {
            const cellKey = `${row.id}_${key}`;
            const cellStyle = styles[cellKey];
            if (cellStyle) {
              const cell = excelRow.getCell(index + 1);
              
              if (cellStyle.backgroundColor) {
                // Convert hex to argb (remove #)
                const argb = cellStyle.backgroundColor.replace('#', '').toUpperCase();
                // If 3 digits, convert to 6
                const fullArgb = argb.length === 3 ? argb.split('').map(c => c+c).join('') : argb;
                
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FF' + fullArgb } 
                };
              }
              
              if (cellStyle.color) {
                const argb = cellStyle.color.replace('#', '').toUpperCase();
                const fullArgb = argb.length === 3 ? argb.split('').map(c => c+c).join('') : argb;
                cell.font = {
                  color: { argb: 'FF' + fullArgb },
                  bold: cellStyle.fontWeight === 'bold'
                };
              } else if (cellStyle.fontWeight === 'bold') {
                cell.font = { bold: true };
              }
            }
          });
        }
      });

      // Auto Width (Rough approximation)
      sheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="export.xlsx"`,
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    return Response.json({ error: 'Unsupported format' }, { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});