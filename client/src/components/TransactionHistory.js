import React from 'react';
import { CheckCircle, AlertCircle, Building, DollarSign } from 'lucide-react';
import './TransactionHistory.css';

const TransactionHistory = ({ transactions }) => {
  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  // Get emoji/logo for each entity
  const getEntityLogo = (entityId) => {
    const logos = {
      'CONTOSO-HQ': '🏢',      // Headquarters - Office building
      'CONTOSO-SALES': '💰',   // Sales - Money
      'CONTOSO-ENG': '⚙️',     // Engineering - Gear
      'CONTOSO-MKT': '📢',     // Marketing - Megaphone
      'CONTOSO-EU': '🇪🇺',     // European subsidiary - EU flag
      'CONTOSO-FINANCE': '🏦', // Finance - Bank
      'CONTOSO-IT': '💻',      // IT - Computer
      'CONTOSO-HR': '👥',      // HR - People
      'FABRIKAM-US': '🇺🇸',    // Fabrikam US - US flag
      'WOODGROVE-BANK': '🏛️'  // Woodgrove Bank - Bank building
    };
    return logos[entityId] || '🏢'; // Default to office building
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'operational':
        return '⚙️';
      case 'capital':
        return '🏗️';
      case 'transfer':
        return '🔄';
      case 'procurement':
        return '📦';
      case 'payroll':
        return '👥';
      case 'marketing':
        return '📢';
      case 'research':
        return '🔬';
      default:
        return '📄';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      operational: 'Operational',
      capital: 'Capital Investment',
      transfer: 'Inter-Entity Transfer',
      procurement: 'Procurement',
      payroll: 'Payroll & Benefits',
      marketing: 'Marketing',
      research: 'Research & Development',
      other: 'Other'
    };
    return labels[category] || category;
  };

  return (
    <div className="transaction-history">
      <h2>📊 Transaction History</h2>
      
      {transactions.length === 0 ? (
        <div className="empty-transactions">
          <p>No transactions recorded yet</p>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-header">
                <div className="transaction-info">
                  <div className="category-icon">
                    {getCategoryIcon(transaction.category)}
                  </div>
                  <div>
                    <strong className="transaction-amount">
                      {formatCurrency(transaction.amount)}
                    </strong>
                    <span className="category-label">
                      {getCategoryLabel(transaction.category)}
                    </span>
                  </div>
                </div>
                <div className="transaction-status">
                  {transaction.status === 'approved' ? (
                    <>
                      <CheckCircle size={16} className="status-icon success" />
                      <span className="status-text approved">CFO Approved</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="status-icon success" />
                      <span className="status-text completed">Completed</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="transaction-details">
                <div className="entities-flow">
                  <div className="entity-info">
                    <div className="entity-logo">{getEntityLogo(transaction.fromEntity.id)}</div>
                    <div className="entity-text">
                      <span className="entity-name" title={transaction.fromEntity.name}>
                        {transaction.fromEntity.name}
                      </span>
                      <span className="entity-id">({transaction.fromEntity.id})</span>
                    </div>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="entity-info">
                    <div className="entity-logo">{getEntityLogo(transaction.toEntity.id)}</div>
                    <div className="entity-text">
                      <span className="entity-name" title={transaction.toEntity.name}>
                        {transaction.toEntity.name}
                      </span>
                      <span className="entity-id">({transaction.toEntity.id})</span>
                    </div>
                  </div>
                </div>
                
                <div className="transaction-description">
                  <span className="description-text">{transaction.description}</span>
                </div>
                
                <div className="transaction-meta">
                  <div className="meta-row">
                    <span>Processed:</span>
                    <span>{formatDateTime(transaction.timestamp)}</span>
                  </div>
                  <div className="meta-row">
                    <span>Approved by:</span>
                    <span>{transaction.approver}</span>
                  </div>
                  {transaction.validator && (transaction.validator.firstName || transaction.validator.lastName) && (
                    <div className="meta-row">
                      <span className="verified-badge">
                        ✅ Verified by: {transaction.validator.firstName} {transaction.validator.lastName}
                      </span>
                    </div>
                  )}
                  {transaction.verificationId && (
                    <div className="meta-row">
                      <span className="verified-badge">🔐 Identity Verified</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
