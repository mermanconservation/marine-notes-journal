import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/", url: "marinenotesjournal.com" },
    { name: "About", href: "/about", url: "marinenotesjournal.com/about" },
    { name: "Submit Manuscript", href: "/submit", url: "marinenotesjournal.com/submit" },
    { name: "Author Guidelines", href: "/guidelines", url: "marinenotesjournal.com/guidelines" },
    { name: "Editorial Board", href: "/editorial-board", url: "marinenotesjournal.com/editorial-board" },
    { name: "Archive", href: "/archive", url: "marinenotesjournal.com/archive" },
    { name: "DOI Lookup", href: "/doi-search", url: "marinenotesjournal.com/doi-search" },
    { name: "Contact", href: "/contact", url: "marinenotesjournal.com/contact" }
  ];

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <img src={logo} alt="Marine Notes Journal" className="h-10 w-10" />
            <span className="font-academic font-semibold text-xl text-foreground">
              Marine Notes Journal
            </span>
          </Link>

          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                title={item.url}
              >
                <span className="block">{item.name}</span>
                <span className="block text-xs opacity-60 group-hover:opacity-100 transition-opacity">
                  {item.url}
                </span>
              </Link>
            ))}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-border">
            <nav className="py-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="block">{item.name}</span>
                  <span className="block text-xs opacity-60">{item.url}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;