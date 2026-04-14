import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { AccessibilityToolbox } from "@/components/accessibility/AccessibilityToolbox";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <AccessibilityToolbox />
    </div>
  );
};

export default Layout;