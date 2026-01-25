import { Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
      {/* Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Zap className="h-6 w-6 text-primary" fill="currentColor" />
              </div>
              <h1 className="text-xl font-display font-bold text-foreground tracking-tight">
                СвітлоБот <span className="text-primary">Monitor</span>
              </h1>
            </div>
            <nav className="flex gap-2 md:gap-4">
              <Link 
                href="/" 
                onClick={() => trackEvent("nav_click", { label: "dashboard", path: "/" })}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location === "/" 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Дашборд
              </Link>
              <Link 
                href="/charts" 
                onClick={() => trackEvent("nav_click", { label: "charts", path: "/charts" })}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location === "/charts" 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Порівняти відключення
              </Link>
              <Link 
                href="/contacts" 
                onClick={() => trackEvent("nav_click", { label: "contacts", path: "/contacts" })}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location === "/contacts" 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Contacts
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} СвітлоБот Моніторинг</p>
          <div className="flex items-center gap-4">
            <Link
              href="/contacts"
              onClick={() => trackEvent("nav_click", { label: "contacts_footer", path: "/contacts" })}
              className="hover:text-foreground transition-colors"
            >
              Contacts
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
