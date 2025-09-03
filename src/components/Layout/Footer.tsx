import { Link } from "react-router-dom";
import { BookOpen, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-deep text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-8 w-8" />
              <span className="font-academic font-semibold text-xl">
                Marine Notes Journal
              </span>
            </div>
            <p className="text-primary-foreground/80 mb-4 max-w-md">
              An open-access peer-reviewed journal dedicated to advancing marine conservation 
              and ocean sciences through high-quality research publication.
            </p>
            <p className="text-sm text-primary-foreground/60">
              ISSN: - (Online)
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <nav className="space-y-2">
              <Link to="/submit" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Submit Manuscript
              </Link>
              <Link to="/guidelines" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Author Guidelines
              </Link>
              <Link to="/editorial-board" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Editorial Board
              </Link>
              <Link to="/archive" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Archive
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-primary-foreground/80">
                <Mail className="h-4 w-4" />
                <span className="text-sm">editor@marinenotesjournal.com</span>
              </div>
              <div className="flex items-start space-x-2 text-primary-foreground/80">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span className="text-sm">
                  Powered by Merman Conservation Expeditions Ltd<br />
                          
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-sm text-primary-foreground/60">
            © {new Date().getFullYear()} Marine Notes Journal. All rights reserved. 
            Licensed under Creative Commons Attribution 4.0
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
