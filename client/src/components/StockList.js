import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StockList = ({ stocks, onStockSelect }) => {
  const formatPrice = (price) => `$${price.toFixed(2)}`;
  const formatChange = (change) => `${change >= 0 ? '+' : ''}${change.toFixed(2)}`;

  return (
    <div className="stock-list">
      <h2>📈 Available Stocks</h2>
      <div className="stocks-grid">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            className={`stock-card ${stock.change >= 0 ? 'positive' : 'negative'}`}
            onClick={() => onStockSelect(stock)}
          >
            <div className="stock-header">
              <div>
                <h3>{stock.symbol}</h3>
                <p className="stock-name">{stock.name}</p>
              </div>
              {stock.change >= 0 ? (
                <TrendingUp className="trend-icon positive" />
              ) : (
                <TrendingDown className="trend-icon negative" />
              )}
            </div>
            <div className="stock-price">
              <span className="price">{formatPrice(stock.price)}</span>
              <span className={`change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                {formatChange(stock.change)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockList;
