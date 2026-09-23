import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        // Check if user is authenticated
        await base44.auth.me();
        
        const formData = await req.formData();
        const file = formData.get('file');
        
        if (!file) {
            return new Response(JSON.stringify({ error: 'No file provided' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Use base44's upload integration
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        
        return new Response(JSON.stringify({ 
            success: true,
            file_url: uploadResult.file_url,
            filename: file.name,
            size: file.size,
            type: file.type
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});