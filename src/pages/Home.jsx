import React from 'react';

console.log('🚀 HOME PAGE LOADED - React is working!');
console.log('📅 Current time:', new Date().toISOString());
console.log('🌐 Window location:', window.location.href);

export default function Home() {
  console.log('✅ Home component rendering...');
  
  React.useEffect(() => {
    console.log('✅ Home component mounted!');
    console.log('📊 Environment check:');
    console.log('- React version:', React.version);
    console.log('- Document ready:', document.readyState);
    
    return () => {
      console.log('🔴 Home component unmounted');
    };
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '40px', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: 'bold', 
          marginBottom: '20px',
          textAlign: 'center',
          color: '#333'
        }}>
          🔍 מערכת דיבאג
        </h1>
        
        <div style={{
          background: '#f0f9ff',
          border: '2px solid #0ea5e9',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#0369a1' }}>
            ✅ האתר עובד!
          </h2>
          <p style={{ margin: '5px 0', color: '#0c4a6e' }}>React טען בהצלחה</p>
          <p style={{ margin: '5px 0', color: '#0c4a6e' }}>הדף מוצג כראוי</p>
          <p style={{ margin: '5px 0', color: '#0c4a6e' }}>זמן: {new Date().toLocaleTimeString('he-IL')}</p>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#92400e' }}>
            📋 הוראות
          </h3>
          <ol style={{ margin: '0', paddingRight: '20px', color: '#78350f', lineHeight: '1.8' }}>
            <li>פתח את קונסולת המפתחים (לחץ F12)</li>
            <li>בדוק את הלוגים בקונסול</li>
            <li>חפש הודעות שגיאה באדום</li>
            <li>העתק את השגיאות ושלח לי</li>
          </ol>
        </div>

        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '15px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <p style={{ margin: '5px 0' }}>🌐 כתובת: {window.location.href}</p>
          <p style={{ margin: '5px 0' }}>🕐 זמן טעינה: {new Date().toLocaleString('he-IL')}</p>
        </div>

        <button 
          onClick={() => {
            console.log('🔄 Reload button clicked');
            window.location.reload();
          }}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '15px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = '#5568d3'}
          onMouseOut={(e) => e.target.style.background = '#667eea'}
        >
          🔄 טען מחדש
        </button>
      </div>
    </div>
  );
}