import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col w-full max-w-full overflow-x-hidden">
      <Header />
      <main className="flex-grow w-full max-w-full overflow-x-hidden">
        {children}
      </main>
      <Footer />
    </div>
  );
};
