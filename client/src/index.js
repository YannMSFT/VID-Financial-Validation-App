import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppComplete';
import { DemoConfigProvider } from './DemoConfigContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DemoConfigProvider>
      <App />
    </DemoConfigProvider>
  </React.StrictMode>
);
