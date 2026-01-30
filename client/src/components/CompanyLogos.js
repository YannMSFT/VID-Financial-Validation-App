import React from 'react';

// Contoso logo - teal star icon with circles at corners
const ContosoLogo = () => (
  <svg viewBox="0 0 40 40" className="company-logo">
    <rect x="0" y="0" width="40" height="40" rx="6" fill="#1e3a5f"/>
    {/* Central 4-pointed star in teal */}
    <path 
      d="M20 8c.2-.3.2-.6-.1-.8-.2-.2-.5-.2-.8-.1-6.2 4.3-5.8 4.3-12 0-.2-.2-.6-.1-.8.1-.2.2-.2.5-.1.8 4.3 6.2 4.3 5.8 0 12-.2.2-.2.6.1.8.2.2.5.2.8.1 6.2-4.3 5.8-4.3 12 0 .2.2.6.2.8-.1.2-.2.2-.5.1-.8-4.3-6.2-4.3-5.8 0-12z" 
      fill="#25babe"
      transform="translate(8, 8) scale(1.2)"
    />
    {/* Corner circles */}
    <circle cx="10" cy="10" r="4" fill="white"/>
    <circle cx="30" cy="10" r="4" fill="white"/>
    <circle cx="10" cy="30" r="4" fill="white"/>
    <circle cx="30" cy="30" r="4" fill="white"/>
    {/* Inner circles */}
    <circle cx="10" cy="10" r="2" fill="#1e3a5f"/>
    <circle cx="30" cy="10" r="2" fill="#1e3a5f"/>
    <circle cx="10" cy="30" r="2" fill="#1e3a5f"/>
    <circle cx="30" cy="30" r="2" fill="#1e3a5f"/>
  </svg>
);

// Professional SVG corporate logos for each entity
const CompanyLogos = {
  // Contoso entities - use official logo
  'CONTOSO-HQ': ContosoLogo,
  'CONTOSO-SALES': ContosoLogo,
  'CONTOSO-ENG': ContosoLogo,
  'CONTOSO-MKT': ContosoLogo,
  'CONTOSO-FINANCE': ContosoLogo,
  'CONTOSO-IT': ContosoLogo,
  'CONTOSO-HR': ContosoLogo,

  // Fabrikam US - Official logo
  'FABRIKAM-US': () => (
    <img 
      src="https://images-us-prod.cms.commerce.dynamics.com/cms/api/rnjxgnxpgs/imageFileData/MAapw?ver=ad50&m=6&q=80" 
      alt="Fabrikam" 
      className="company-logo"
      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', background: 'white' }}
    />
  ),

  // Woodgrove Bank - Classic banking green/gold
  'WOODGROVE-BANK': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#14532d"/>
      <path d="M8 30h24M10 30V18M30 30V18M15 30V18M25 30V18M20 30V18" stroke="#fbbf24" strokeWidth="2"/>
      <path d="M6 18l14-10 14 10" stroke="#fbbf24" strokeWidth="2" fill="none"/>
      <rect x="8" y="30" width="24" height="3" fill="#fbbf24"/>
      <circle cx="20" cy="14" r="2" fill="#fbbf24"/>
    </svg>
  ),

  // Default fallback logo
  'DEFAULT': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#64748b"/>
      <circle cx="20" cy="16" r="6" fill="white"/>
      <path d="M10 32c0-6 4-10 10-10s10 4 10 10" fill="white"/>
    </svg>
  )
};

// Helper function to get logo component
export const getCompanyLogo = (entityId) => {
  const LogoComponent = CompanyLogos[entityId] || CompanyLogos['DEFAULT'];
  return <LogoComponent />;
};

export default CompanyLogos;
