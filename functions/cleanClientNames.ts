import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all clients
    const clients = await base44.asServiceRole.entities.Client.list();
    
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const client of clients) {
      try {
        // Clean the name - remove non-printable characters and extra spaces
        const originalName = client.name || '';
        const cleanedName = originalName
          .replace(/[^\p{L}\p{N}\s\-.']/gu, '') // Remove special/non-printable chars
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();

        // Only update if name changed
        if (cleanedName && cleanedName !== originalName) {
          await base44.asServiceRole.entities.Client.update(client.id, {
            name_clean: cleanedName, // Add to new column
            name: cleanedName // Also update the original
          });
          updatedCount++;
        } else if (cleanedName) {
          // If name is clean, just copy to name_clean
          await base44.asServiceRole.entities.Client.update(client.id, {
            name_clean: cleanedName
          });
        }

      } catch (error) {
        console.error(`Error updating client ${client.id}:`, error);
        errorCount++;
        errors.push({ id: client.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      message: `עובד! ${updatedCount} לקוחות עודכנו, ${errorCount} שגיאות`,
      updatedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Clean names error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});