import React from 'react';
import { CheckCircle } from 'lucide-react';

const TransactionHistory = ({ transactions }) => {
  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const getShortName = (name) => {
    // Extract short name (first 2-3 words or abbreviation)
    if (name.length <= 20) return name;
    const words = name.split(' ');
    if (words.length >= 2) {
      return words.slice(0, 2).join(' ');
    }
    return name.substring(0, 20) + '...';
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
            <div key={transaction.id} className="transaction-item compact">
              <div className="transaction-row">
                <span className="tx-amount">{formatCurrency(transaction.amount)}</span>
                <span className="tx-flow" title={`${transaction.fromEntity.name} → ${transaction.toEntity.name}`}>
                  {getShortName(transaction.fromEntity.name)} → {getShortName(transaction.toEntity.name)}
                </span>
                <span className="tx-status">
                  <CheckCircle size={12} className="status-icon success" />
                  {transaction.status === 'approved' ? 'Approved' : 'Done'}
                </span>
              </div>
              <div className="transaction-row secondary">
                <span className="tx-desc">{transaction.description}</span>
                <span className="tx-date">{formatDateTime(transaction.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
