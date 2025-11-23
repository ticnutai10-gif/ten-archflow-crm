import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const debugLog = [];
  const log = (message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    debugLog.push(logEntry);
    console.log(`[${timestamp}] ${message}`, data || '');
  };

  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    log('🔐 Checking authentication...');
    const currentUser = await base44.auth.me();
    
    if (!currentUser) {
      log('❌ No authenticated user', null);
      return Response.json({ 
        error: 'Unauthorized',
        debugLog 
      }, { status: 401 });
    }
    
    log('✅ Authenticated user', { email: currentUser.email, role: currentUser.role });

    // Check if user is admin or super admin
    const SUPER_ADMINS = ['jj1212t@gmail.com', 'mali.f.arch2@gmail.com'];
    const isSuperAdmin = SUPER_ADMINS.includes(currentUser.email?.toLowerCase());
    const isAdmin = currentUser.role === 'admin' || isSuperAdmin;
    
    log('🔍 Checking permissions', { isSuperAdmin, isAdmin });
    
    if (!isAdmin) {
      log('❌ User is not admin', { email: currentUser.email, role: currentUser.role });
      return Response.json({ 
        error: 'Only admins can update user names',
        debugLog 
      }, { status: 403 });
    }
    
    log('✅ User has admin permissions');

    // Parse request body
    const { userEmail, fullName } = await req.json();
    
    log('📥 Request data received', { userEmail, fullName });
    
    if (!userEmail || !fullName) {
      log('❌ Missing required fields', { userEmail, fullName });
      return Response.json({ 
        error: 'Missing userEmail or fullName',
        debugLog 
      }, { status: 400 });
    }

    // Find the user
    log('🔍 Loading all users...');
    const allUsers = await base44.asServiceRole.entities.User.list();
    log('✅ Loaded users', { count: allUsers.length });
    
    const targetUser = allUsers.find(u => 
      u.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()
    );
    
    if (!targetUser) {
      log('❌ Target user not found', { 
        searchedEmail: userEmail,
        availableEmails: allUsers.map(u => u.email) 
      });
      return Response.json({ 
        error: 'User not found',
        debugLog 
      }, { status: 404 });
    }
    
    log('✅ Target user found', { 
      id: targetUser.id, 
      email: targetUser.email, 
      currentName: targetUser.full_name 
    });

    // Perform the update using service role
    log('💾 Attempting to update user name...');
    
    // Try multiple methods to update the user
    const updateMethods = [
      {
        name: 'Supabase Direct Update',
        fn: async () => {
          log('🔧 Method 1: Trying Supabase direct update...');
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase credentials not found');
          }
          
          const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${targetUser.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ display_name: fullName.trim() })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase update failed: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          log('✅ Supabase direct update succeeded', { result });
          return result;
        }
      },
      {
        name: 'SDK Service Role Update',
        fn: async () => {
          log('🔧 Method 2: Trying SDK service role update...');
          const updateResult = await base44.asServiceRole.entities.User.update(
            targetUser.id, 
            { display_name: fullName.trim() }
          );
          log('✅ SDK update completed', { 
            result: updateResult,
            hasFullName: updateResult?.full_name !== undefined,
            newFullName: updateResult?.full_name
          });
          return updateResult;
        }
      }
    ];
    
    let updateSuccess = false;
    let lastError = null;
    
    for (const method of updateMethods) {
      try {
        log(`🚀 Trying: ${method.name}...`);
        const result = await method.fn();
        updateSuccess = true;
        log(`✅ ${method.name} succeeded!`, { result });
        break;
      } catch (error) {
        lastError = error;
        log(`❌ ${method.name} failed`, { 
          error: error.message,
          details: error.response?.data || error.stack
        });
      }
    }
    
    if (!updateSuccess) {
      log('❌ All update methods failed!', { lastError: lastError?.message });
      throw new Error(`All update methods failed. Last error: ${lastError?.message}`);
    }

    // Verify the update
    log('🔍 Verifying update...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const verifyUsers = await base44.asServiceRole.entities.User.list();
    const verifiedUser = verifyUsers.find(u => 
      u.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()
    );
    
    if (!verifiedUser) {
      log('❌ User not found during verification', null);
      return Response.json({ 
        error: 'Verification failed - user not found',
        debugLog 
      }, { status: 500 });
    }
    
    log('✅ Verification complete', { 
      expectedName: fullName.trim(),
      actualName: verifiedUser.display_name,
      match: verifiedUser.display_name === fullName.trim()
    });

    const success = verifiedUser.display_name === fullName.trim();

    return Response.json({
      success,
      verified: success,
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        display_name: verifiedUser.display_name
      },
      debugLog,
      message: success ? 
        `השם עודכן בהצלחה ל-"${verifiedUser.display_name}"` : 
        `העדכון בוצע אך השם לא השתנה. שם נוכחי: "${verifiedUser.display_name}"`
    });

  } catch (error) {
    log('❌ CRITICAL ERROR', { 
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    return Response.json({ 
      error: error.message || 'Unknown error',
      debugLog,
      success: false
    }, { status: 500 });
  }
});