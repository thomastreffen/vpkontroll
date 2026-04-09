import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Building2, LayoutDashboard, Plug, LogOut, Flame, Puzzle,
  Menu, Shield, Bell, Search, ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/admin/tenants", icon: Building2 },
  { label: "Moduler", href: "/admin/modules", icon: Puzzle },
  { label: "Integrasjoner", href: "/admin/integrations", icon: Plug },
  { label: "Tilgangsstyring", href: "/admin/access-control", icon: Shield },
];

function SidebarNav({ location, onNavigate }: { location: any; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {navItems.map((item) => {
        const active = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-[13px] font-medium transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function TopBar({ user, signOut, onMenuClick, isMobile }: { user: any; signOut: () => void; onMenuClick?: () => void; isMobile: boolean }) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onMenuClick}>
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Søk..." className="pl-9 h-9 w-64 bg-muted/50 border-0 focus-visible:ring-1" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {(user?.email?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="sm" className="gap-1 text-xs hidden sm:flex" onClick={signOut}>
            <LogOut className="w-3.5 h-3.5" />
            Logg ut
          </Button>
        </div>
      </div>
    </header>
  );
}

function RoleSwitchLink() {
  const { isTenantAdmin } = useAuth();
  if (!isTenantAdmin) return null;
  return (
    <div className="border-t border-border p-2">
      <Link
        to="/tenant"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
      >
        <ArrowRightLeft className="w-4 h-4 shrink-0" />
        <span>Tenant Admin</span>
      </Link>
    </div>
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
        <TopBar user={user} signOut={signOut} onMenuClick={() => setOpen(true)} isMobile />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-card flex flex-col">
            <SheetTitle className="sr-only">Navigasjon</SheetTitle>
            <div className="p-4 flex items-center gap-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Flame className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">VPKontroll</span>
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">Admin</span>
            </div>
            <SidebarNav location={location} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">VPKontroll</span>
          <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">Admin</span>
        </div>
        <SidebarNav location={location} />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} signOut={signOut} isMobile={false} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
