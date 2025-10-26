import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="bg-gradient-ocean text-primary-foreground py-3 px-4 text-center">
        <p className="text-sm md:text-base font-medium">
          🎁 Publishing is free until January 7, 2026 — as a gift to the marine science community
        </p>
      </div>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;