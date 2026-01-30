import React from 'react';

// Professional SVG corporate logos for each entity
const CompanyLogos = {
  // Contoso HQ - Blue square with C monogram
  'CONTOSO-HQ': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#1e40af"/>
      <path d="M28 14c0-4.4-3.6-8-8-8-4.4 0-8 3.6-8 8v12c0 4.4 3.6 8 8 8 4.4 0 8-3.6 8-8v-2h-4v2c0 2.2-1.8 4-4 4s-4-1.8-4-4V14c0-2.2 1.8-4 4-4s4 1.8 4 4v2h4v-2z" fill="white"/>
    </svg>
  ),

  // Contoso Sales - Green circle with upward arrow
  'CONTOSO-SALES': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <circle cx="20" cy="20" r="18" fill="#059669"/>
      <path d="M20 10l8 10h-5v10h-6V20h-5l8-10z" fill="white"/>
    </svg>
  ),

  // Contoso Engineering - Orange hexagon with gear
  'CONTOSO-ENG': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#ea580c"/>
      <circle cx="20" cy="20" r="6" fill="none" stroke="white" strokeWidth="2"/>
      <circle cx="20" cy="20" r="3" fill="white"/>
      <g fill="white">
        <rect x="18" y="6" width="4" height="6" rx="1"/>
        <rect x="18" y="28" width="4" height="6" rx="1"/>
        <rect x="6" y="18" width="6" height="4" rx="1"/>
        <rect x="28" y="18" width="6" height="4" rx="1"/>
      </g>
    </svg>
  ),

  // Contoso Marketing - Purple rounded square with megaphone
  'CONTOSO-MKT': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#7c3aed"/>
      <path d="M12 16v8l16 6V10l-16 6zm18-2v12M14 18v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <circle cx="11" cy="20" r="3" fill="white"/>
    </svg>
  ),

  // Contoso EU - Blue gradient with EU stars pattern
  'CONTOSO-EU': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#1d4ed8"/>
      <g fill="#fbbf24">
        <polygon points="20,8 21,11 24,11 21.5,13 22.5,16 20,14 17.5,16 18.5,13 16,11 19,11" />
        <polygon points="12,12 13,14 15,14 13.5,15.5 14,17.5 12,16 10,17.5 10.5,15.5 9,14 11,14" />
        <polygon points="28,12 29,14 31,14 29.5,15.5 30,17.5 28,16 26,17.5 26.5,15.5 25,14 27,14" />
        <polygon points="10,20 11,22 13,22 11.5,23.5 12,25.5 10,24 8,25.5 8.5,23.5 7,22 9,22" />
        <polygon points="30,20 31,22 33,22 31.5,23.5 32,25.5 30,24 28,25.5 28.5,23.5 27,22 29,22" />
        <polygon points="12,28 13,30 15,30 13.5,31.5 14,33.5 12,32 10,33.5 10.5,31.5 9,30 11,30" />
        <polygon points="28,28 29,30 31,30 29.5,31.5 30,33.5 28,32 26,33.5 26.5,31.5 25,30 27,30" />
      </g>
    </svg>
  ),

  // Contoso Finance - Dark blue with dollar/building icon
  'CONTOSO-FINANCE': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#0f172a"/>
      <path d="M10 32h20M12 32V18l8-6 8 6v14" stroke="#22d3ee" strokeWidth="2" fill="none"/>
      <rect x="17" y="22" width="6" height="10" fill="#22d3ee"/>
      <circle cx="20" cy="16" r="2" fill="#22d3ee"/>
    </svg>
  ),

  // Contoso IT - Cyan/teal with circuit pattern
  'CONTOSO-IT': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#0891b2"/>
      <rect x="14" y="14" width="12" height="12" rx="2" fill="white"/>
      <g stroke="white" strokeWidth="2">
        <line x1="20" y1="8" x2="20" y2="14"/>
        <line x1="20" y1="26" x2="20" y2="32"/>
        <line x1="8" y1="20" x2="14" y2="20"/>
        <line x1="26" y1="20" x2="32" y2="20"/>
        <circle cx="20" cy="8" r="2" fill="white"/>
        <circle cx="20" cy="32" r="2" fill="white"/>
        <circle cx="8" cy="20" r="2" fill="white"/>
        <circle cx="32" cy="20" r="2" fill="white"/>
      </g>
      <rect x="17" y="17" width="6" height="6" fill="#0891b2"/>
    </svg>
  ),

  // Contoso HR - Warm coral with people icon
  'CONTOSO-HR': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#f43f5e"/>
      <circle cx="20" cy="14" r="5" fill="white"/>
      <path d="M10 32c0-6 4-10 10-10s10 4 10 10" fill="white"/>
      <circle cx="30" cy="16" r="3" fill="white" opacity="0.7"/>
      <circle cx="10" cy="16" r="3" fill="white" opacity="0.7"/>
    </svg>
  ),

  // Fabrikam US - Red/white American corporate style
  'FABRIKAM-US': () => (
    <svg viewBox="0 0 40 40" className="company-logo">
      <rect x="2" y="2" width="36" height="36" rx="4" fill="#dc2626"/>
      <text x="20" y="27" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial">F</text>
      <rect x="6" y="6" width="10" height="3" fill="white"/>
      <rect x="24" y="6" width="10" height="3" fill="white"/>
      <rect x="6" y="31" width="10" height="3" fill="white"/>
      <rect x="24" y="31" width="10" height="3" fill="white"/>
    </svg>
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
