import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { getCompanyLogo } from './CompanyLogos';

const TransactionHistory = ({ transactions }) => {
  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
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
        return '📣';
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
      <h2>
        <span>📊</span>
        Transaction History
      </h2>
      
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
                      <CheckCircle size={14} className="status-icon success" />
                      <span className="status-text approved">CFO Approved</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} className="status-icon success" />
                      <span className="status-text completed">Completed</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="transaction-details">
                <div className="entities-flow">
                  <div className="entity-info">
                    <div className="entity-logo-small">{getCompanyLogo(transaction.fromEntity.id)}</div>
                    <div className="entity-text">
                      <span className="entity-name" title={transaction.fromEntity.name}>
                        {transaction.fromEntity.name}
                      </span>
                      <span className="entity-id">({transaction.fromEntity.id})</span>
                    </div>
                  </div>
                  <div className="flow-arrow">→</div>
                  <div className="entity-info">
                    <div className="entity-logo-small">{getCompanyLogo(transaction.toEntity.id)}</div>
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
                    <span>Processed</span>
                    <span>{formatDateTime(transaction.timestamp)}</span>
                  </div>
                  <div className="meta-row">
                    <span>Approved by</span>
                    <span>{transaction.approver}</span>
                  </div>
                  {transaction.validator && (transaction.validator.firstName || transaction.validator.lastName) && (
                    <div className="meta-row">
                      <span className="verified-badge">
                        ✅ Verified: {transaction.validator.firstName} {transaction.validator.lastName}
                      </span>
                    </div>
                  )}
                  {transaction.verificationId && (
                    <div className="meta-row">
                      <span className="verified-badge">🔐 Identity Verified</span>
                    </div>
                  )}
                  {transaction.faceCheck && transaction.faceCheck.matchConfidenceScore !== undefined && (
                    <div className="meta-row">
                      <span className="face-check-badge">
                        📸 Face Match: {transaction.faceCheck.matchConfidenceScore}%
                      </span>
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
