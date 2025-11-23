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
    log('💾 Updating user name via service role...');
    
    try {
      const updateResult = await base44.asServiceRole.entities.User.update(
        targetUser.id, 
        { full_name: fullName.trim() }
      );
      
      log('✅ Update API call completed', { 
        result: updateResult,
        resultType: typeof updateResult,
        hasFullName: updateResult?.full_name !== undefined,
        newFullName: updateResult?.full_name
      });
      
    } catch (updateError) {
      log('❌ Update failed', { 
        error: updateError.message,
        stack: updateError.stack,
        response: updateError.response?.data
      });
      throw updateError;
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
      actualName: verifiedUser.full_name,
      match: verifiedUser.full_name === fullName.trim()
    });

    const success = verifiedUser.full_name === fullName.trim();

    return Response.json({
      success,
      verified: success,
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        full_name: verifiedUser.full_name
      },
      debugLog,
      message: success ? 
        `השם עודכן בהצלחה ל-"${verifiedUser.full_name}"` : 
        `העדכון בוצע אך השם לא השתנה. שם נוכחי: "${verifiedUser.full_name}"`
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