import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import PageTransition from './ui/PageTransition';
import { useStore } from '../store/useStore';

const Layout = () => {
  const { toggleSidebar } = useStore();
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background noise-bg">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-neonPurple/[0.02] blur-[100px]"></div>
      </div>

      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-[1]">
        <Navbar />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 relative h-full w-full">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;
