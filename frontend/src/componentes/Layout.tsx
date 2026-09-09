import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.tsx';
import { BottomNav } from './BottomNav.tsx';
import { Footer } from './Footer.tsx';

export const Layout: React.FC = () => {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Layout;
