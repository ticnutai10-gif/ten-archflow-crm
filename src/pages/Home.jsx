export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px', 
      background: '#667eea',
      color: 'white',
      fontFamily: 'Arial',
      fontSize: '24px',
      textAlign: 'center',
      paddingTop: '100px'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>✅ האתר עובד!</h1>
      <p>אם אתה רואה את זה - React עובד תקין</p>
      <p style={{ marginTop: '20px', fontSize: '16px' }}>פתח F12 לקונסול</p>
    </div>
  );
}