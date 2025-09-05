import React from 'react';

function TestApp() {
  console.log('TestApp component is rendering - check browser console');
  
  return (
    <div style={{
      padding: '20px', 
      backgroundColor: '#f0f0f0', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{color: 'red', fontSize: '48px', margin: '0'}}>
        🔥 REACT IS WORKING! 🔥
      </h1>
      <p style={{fontSize: '24px', color: '#333'}}>
        If you see this, React is rendering correctly
      </p>
      <p style={{fontSize: '16px', color: '#666'}}>
        Check the browser console for the log message
      </p>
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: 'white',
        border: '2px solid green',
        borderRadius: '10px'
      }}>
        <h2>✅ Success!</h2>
        <p>Your React application is working properly.</p>
      </div>
    </div>
  );
}

export default TestApp;
