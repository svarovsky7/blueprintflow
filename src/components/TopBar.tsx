import type { ReactNode } from 'react';

interface TopBarProps {
  children: ReactNode;
}

export default function TopBar({ children }: TopBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 64,
        zIndex: 1,
        background: '#333333',
        paddingBottom: 16,
      }}
    >
      {children}
    </div>
  );
}
