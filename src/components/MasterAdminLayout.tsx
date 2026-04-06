import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Building2,
  LayoutDashboard,
  Plug,
  LogOut,
  Flame,
  Puzzle,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/admin/tenants", icon: Building2 },
  { label: "Moduler", href: "/admin/modules", icon: Puzzle },
  { label: "Integrasjoner", href: "/admin/integrations", icon: Plug },
];

function SidebarContent({ user, signOut, location, onNavigate }: {
  user: any; signOut: () => void; location: any; onNavigate?: () => void;
}) {
  return (
    <>
      <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Flame className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-sidebar-primary-foreground">VarmePumpe</p>
          <p className="text-xs text-sidebar-foreground/60">Master Admin</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 text-xs text-sidebar-foreground/50 truncate">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          Logg ut
        </Button>
      </div>
    </>
  );
}

export default function MasterAdminLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-sidebar">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5 text-sidebar-foreground" />
          </Button>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-sidebar-primary" />
            <span className="text-sm font-semibold text-sidebar-primary-foreground">VarmePumpe</span>
          </div>
        </header>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground flex flex-col">
            <SheetTitle className="sr-only">Navigasjon</SheetTitle>
            <SidebarContent user={user} signOut={signOut} location={location} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-auto">
          <div className="p-4 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <SidebarContent user={user} signOut={signOut} location={location} />
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
