import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const DemoConfigContext = createContext(null);

// Default config used while loading from server
const defaultConfig = {
  company: {
    name: 'Company',
    fullName: 'Company Name',
    portalName: 'Finance Portal',
    portalDescription: 'Enterprise Transaction Management',
    logo: null,
    approvalThreshold: 50000,
    approvalRole: 'CFO'
  },
  entities: []
};

export function DemoConfigProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/config')
      .then(res => {
        setConfig(res.data);
        // Update the page title dynamically
        document.title = res.data.company.portalName;
      })
      .catch(err => {
        console.error('Failed to load demo config:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DemoConfigContext.Provider value={{ config, loading }}>
      {children}
    </DemoConfigContext.Provider>
  );
}

export function useDemoConfig() {
  const context = useContext(DemoConfigContext);
  if (!context) {
    throw new Error('useDemoConfig must be used within a DemoConfigProvider');
  }
  return context;
}

/**
 * Returns the icon/emoji for a given entity ID based on the demo config.
 * Falls back to the entity type icon if no match found.
 */
export function useEntityIcon() {
  const { config } = useDemoConfig();

  return (entityId) => {
    const entity = config.entities.find(e => e.id === entityId);
    return entity?.icon || '🏢';
  };
}

export default DemoConfigContext;
