import React from 'react';

interface PriceSummaryProps {
  title?: string;
  subtitle?: string;
  amount: number;
  subtext?: string;
  style?: React.CSSProperties;
}

export const PriceSummary: React.FC<PriceSummaryProps> = ({
  title = 'Total a pagar',
  subtitle,
  amount,
  subtext,
  style,
}) => {
  return (
    <div className="trip-price-summary" style={style}>
      <div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--outline)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--secondary)' }}>
          ${Number(amount).toLocaleString('es-AR')}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{subtext}</div>
        )}
      </div>
    </div>
  );
};

export default PriceSummary;
