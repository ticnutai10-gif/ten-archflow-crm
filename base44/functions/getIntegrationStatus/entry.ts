import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get environment variables (Secrets)
        const env = Deno.env.toObject();
        
        // Filter out system variables
        const systemVars = [
            'HOME', 'HOSTNAME', 'PATH', 'USER', 'DENO_DEPLOYMENT_ID', 'DENO_REGION',
            'BASE44_APP_ID', 'BASE44_ENV', 'LS_COLORS', 'SHLVL', '_', 'PWD'
        ];
        
        const secrets = Object.keys(env)
            .filter(key => !systemVars.includes(key) && !key.startsWith('DENO_'))
            .map(key => ({
                name: key,
                // We don't return the value for security, just existence
                isSet: !!env[key] && env[key].length > 0,
                // Simple heuristic for type
                type: key.toLowerCase().includes('key') ? 'API Key' : 
                      key.toLowerCase().includes('secret') ? 'Secret' : 
                      key.toLowerCase().includes('token') ? 'Token' : 'Config',
                preview: '••••••••' // Masked value
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return Response.json({ secrets });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});