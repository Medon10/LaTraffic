import React from 'react';

interface StopFieldProps {
  icon: string;
  label: string;
  hasError?: boolean;
  errorMessage?: string;
  note?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const StopField: React.FC<StopFieldProps> = ({
  icon,
  label,
  hasError = false,
  errorMessage,
  note,
  children,
  style,
}) => {
  return (
    <div
      className="stop-field-box"
      style={{
        borderColor: hasError ? 'var(--error)' : undefined,
        ...style,
      }}
    >
      <div className="stop-field-header">
        <span className="material-symbols-outlined">{icon}</span>
        <span>{label}</span>
      </div>

      {children}

      {hasError && errorMessage && (
        <div
          style={{
            color: 'var(--error)',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginTop: '4px',
          }}
        >
          {errorMessage}
        </div>
      )}

      {note && !hasError && (
        <div className="stop-note">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            info
          </span>
          <span>{note}</span>
        </div>
      )}
    </div>
  );
};

export default StopField;
