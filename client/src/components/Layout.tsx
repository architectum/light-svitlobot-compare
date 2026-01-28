import { useState } from "react";
import { Zap, Menu, X, BarChart2, Home, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { BackToTop } from "./BackToTop";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "Дашборд", icon: Home },
  { href: "/charts", label: "Порівняння", icon: BarChart2 },
  // { href: "/contacts", label: "Контакти", icon: Mail },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col font-sans safe-area-inset">
      {/* Navigation */}
      <header className="bg-white/90 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-1.5 sm:p-2 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="currentColor" />
              </div>
              <h1 className="text-lg sm:text-xl font-display font-bold text-foreground tracking-tight">
                СвітлоБот <span className="text-primary">Monitor</span>
              </h1>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href} 
                  onClick={() => trackEvent("nav_click", { label: item.label, path: item.href })}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2",
                    location === item.href 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-white/95 backdrop-blur-lg animate-fade-in">
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href} 
                  onClick={() => {
                    trackEvent("nav_click", { label: item.label, path: item.href });
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3",
                    location === item.href 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-white/80 backdrop-blur-sm py-6 sm:py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            © {new Date().getFullYear()} СвітлоБот Моніторинг
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/contacts"
              onClick={() => trackEvent("nav_click", { label: "contacts_footer", path: "/contacts" })}
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-4 h-4" />
              Контакти
            </Link>
          </div>
        </div>
      </footer>
      
      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
