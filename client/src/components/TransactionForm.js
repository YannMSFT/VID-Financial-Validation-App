import React, { useState } from 'react';
import { AlertTriangle, Building, DollarSign, FileText, Tag } from 'lucide-react';
import { useDemoConfig } from '../DemoConfigContext';

const TransactionForm = ({ entities, onSubmit, onCancel }) => {
  const { config } = useDemoConfig();
  const [fromEntity, setFromEntity] = useState('');
  const [toEntity, setToEntity] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('operational');
  const [errorMessage, setErrorMessage] = useState('');

  const requiresApproval = parseFloat(amount) > config.company.approvalThreshold;

  const transactionCategories = [
    { value: 'operational', label: 'Operational Expense' },
    { value: 'capital', label: 'Capital Investment' },
    { value: 'transfer', label: 'Inter-Entity Transfer' },
    { value: 'procurement', label: 'Procurement' },
    { value: 'payroll', label: 'Payroll & Benefits' },
    { value: 'marketing', label: 'Marketing & Advertising' },
    { value: 'research', label: 'Research & Development' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (fromEntity === toEntity) {
      setErrorMessage('Source and destination entities cannot be the same');
      return;
    }
    
    setErrorMessage(''); // Clear any previous error
    
    const transactionData = {
      fromEntity: fromEntity,
      toEntity: toEntity,
      amount: parseFloat(amount),
      description: description.trim(),
      category
    };
    
    onSubmit(transactionData);
  };

  return (
    <div className="transaction-form-overlay">
      <div className="transaction-form">
        <h3>💰 New Financial Transaction</h3>
        
        {errorMessage && (
          <div className="error-message">
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                <Building size={16} />
                From Entity:
              </label>
              <select 
                value={fromEntity} 
                onChange={(e) => setFromEntity(e.target.value)}
                required
              >
                <option value="">Select source entity...</option>
                {entities.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({entity.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <Building size={16} />
                To Entity:
              </label>
              <select 
                value={toEntity} 
                onChange={(e) => setToEntity(e.target.value)}
                required
              >
                <option value="">Select destination entity...</option>
                {entities.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({entity.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <DollarSign size={16} />
                Amount:
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter transaction amount"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Tag size={16} />
                Category:
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {transactionCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              <FileText size={16} />
              Description:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter transaction description or purpose"
              rows="3"
              required
            />
          </div>

          <div className="transaction-summary">
            <div className="summary-row">
              <span>Transaction Amount:</span>
              <span className="total-value">${parseFloat(amount || 0).toLocaleString()}</span>
            </div>
            
            {requiresApproval && (
              <div className="approval-warning">
                <AlertTriangle size={16} />
                <span>{config.company.approvalRole} approval required for transactions over ${config.company.approvalThreshold?.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {requiresApproval ? `Submit for ${config.company.approvalRole} Approval` : 'Process Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
