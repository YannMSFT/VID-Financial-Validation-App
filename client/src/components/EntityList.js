import React from 'react';
import { getCompanyLogo } from './CompanyLogos';

const EntityList = ({ entities }) => {
  const formatCurrency = (amount) => `$${amount.toLocaleString()}`;
  const calculateBudgetUsage = (used, total) => ((used / total) * 100).toFixed(1);

  const getBudgetStatus = (usedPercent) => {
    if (usedPercent >= 80) return 'high';
    if (usedPercent >= 60) return 'medium';
    return 'low';
  };

  return (
    <div className="entity-list">
      <h2>
        <span>🏢</span>
        Company Entities & Budgets
      </h2>
      <div className="entities-grid">
        {entities.map((entity) => {
          const usedPercent = calculateBudgetUsage(entity.usedBudget, entity.budget);
          const budgetStatus = getBudgetStatus(parseFloat(usedPercent));
          const remainingBudget = entity.budget - entity.usedBudget;
          
          return (
            <div
              key={entity.id}
              className={`entity-card ${budgetStatus}`}
            >
              <div className="entity-header">
                <div className="entity-info">
                  <div className="entity-logo-wrapper">
                    {getCompanyLogo(entity.id)}
                  </div>
                  <div>
                    <h3>{entity.name}</h3>
                    <span className="entity-id">{entity.id}</span>
                    <span className="entity-type">{entity.type}</span>
                  </div>
                </div>
                <div className="entity-status">
                  <span className={`status-badge ${entity.status}`}>
                    {entity.status}
                  </span>
                </div>
              </div>
              
              <div className="budget-info">
                <div className="budget-row">
                  <span className="budget-label">Total Budget</span>
                  <span className="budget-value">{formatCurrency(entity.budget)}</span>
                </div>
                <div className="budget-row">
                  <span className="budget-label">Used</span>
                  <span className="budget-value used">{formatCurrency(entity.usedBudget)}</span>
                </div>
                <div className="budget-row">
                  <span className="budget-label">Remaining</span>
                  <span className={`budget-value remaining ${remainingBudget < entity.budget * 0.2 ? 'low' : ''}`}>
                    {formatCurrency(remainingBudget)}
                  </span>
                </div>
                
                <div className="budget-progress">
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${budgetStatus}`}
                      style={{ width: `${usedPercent}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{usedPercent}% utilized</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EntityList;
