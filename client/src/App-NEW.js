import React from 'react';

function App() {
  console.log('App component is rendering - check browser console');
  
  return (
    <div style={{padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh'}}>
      <h1 style={{color: 'red', fontSize: '48px'}}>🔥 REACT IS WORKING! 🔥</h1>
      <p style={{fontSize: '24px'}}>If you see this, React is rendering correctly</p>
      <p>Check the browser console for the log message</p>
    </div>
  );
}

export default App;
