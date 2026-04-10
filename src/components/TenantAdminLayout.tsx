import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenantModules } from "@/hooks/useTenantModules";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Plug, LogOut, Flame, Puzzle, Users, Mail,
  CalendarDays, Menu, Search, Bell, Contact,
  Building2, TrendingUp, Shield, Briefcase, Cpu, FileText, ShieldAlert, ClipboardList, Inbox,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  module?: string;
  /** Permission key required to see this nav item */
  permission?: string;
  /** If true, only tenant_admin (or master_admin) can see this item */
  adminOnly?: boolean;
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Oversikt",
    items: [{ label: "Dashboard", href: "/tenant", icon: LayoutDashboard }],
  },
  {
    label: "CRM",
    items: [
      { label: "Kontaktpersoner", href: "/tenant/crm/contacts", icon: Contact, module: "crm", permission: "module.crm" },
      { label: "Kunder", href: "/tenant/crm/companies", icon: Building2, module: "crm", permission: "module.crm" },
      { label: "Deals", href: "/tenant/crm/deals", icon: TrendingUp, module: "crm", permission: "module.crm" },
      { label: "Jobber", href: "/tenant/crm/jobs", icon: Briefcase, module: "crm", permission: "module.crm" },
      { label: "Anlegg", href: "/tenant/crm/assets", icon: Cpu, module: "crm", permission: "module.crm" },
      { label: "Serviceavtaler", href: "/tenant/crm/agreements", icon: FileText, module: "crm", permission: "module.crm" },
      { label: "Skjemaer og maler", href: "/tenant/templates", icon: ClipboardList, module: "crm", permission: "module.crm" },
      { label: "Nettskjema-innsendt", href: "/tenant/templates/submissions", icon: Inbox, module: "crm", permission: "module.crm" },
      { label: "Garantisaker", href: "/tenant/crm/warranties", icon: ShieldAlert, module: "crm", permission: "module.crm" },
    ],
  },
  {
    label: "Operasjon",
    items: [
      { label: "Postkontoret", href: "/tenant/postkontoret", icon: Mail, module: "postkontoret", permission: "module.postkontoret" },
      { label: "Ressursplanlegger", href: "/tenant/ressursplanlegger", icon: CalendarDays, module: "ressursplanlegger", permission: "module.ressursplanlegger" },
    ],
  },
  {
    label: "Innstillinger",
    items: [
      { label: "Moduler", href: "/tenant/modules", icon: Puzzle, adminOnly: true },
      { label: "Integrasjoner", href: "/tenant/integrations", icon: Plug, adminOnly: true },
      { label: "Brukere", href: "/tenant/users", icon: Users, adminOnly: true },
      { label: "Tilgangsstyring", href: "/tenant/access-control", icon: Shield, adminOnly: true },
    ],
  },
];

function SidebarNav({
  location,
  onNavigate,
  collapsed,
  hasModule,
  hasPermission,
  isAdmin,
}: {
  location: ReturnType<typeof useLocation>;
  onNavigate?: () => void;
  collapsed?: boolean;
  hasModule: (m: string) => boolean;
  hasPermission: (k: string) => boolean;
  isAdmin: boolean;
}) {
  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            // Admin-only items hidden from regular users
            if (item.adminOnly && !isAdmin) return false;
            // Module not activated for tenant
            if (item.module && !hasModule(item.module)) return false;
            // Permission check (admins bypass)
            if (item.permission && !hasPermission(item.permission)) return false;
            return true;
          }),
        }))
        .filter((section) => section.items.length > 0),
    [hasModule, hasPermission, isAdmin]
  );

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      {visibleSections.length === 0 && !collapsed && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-sidebar-foreground/50 leading-relaxed">
            Du har ikke fått tildelt tilganger ennå. Kontakt din administrator.
          </p>
        </div>
      )}
      {visibleSections.map((section) => (
        <div key={section.label} className="mb-1">
          {!collapsed && (
            <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
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
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
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
          <Input placeholder="Søk kontakter, deals..." className="pl-9 h-9 w-64 bg-muted/50 border-0 focus-visible:ring-1" />
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
  const { isMasterAdmin } = useAuth();
  if (!isMasterAdmin) return null;
  return (
    <div className="border-t border-border p-2">
      <Link
        to="/admin"
        className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
      >
        <ArrowRightLeft className="w-4 h-4 shrink-0" />
        <span>Master Admin</span>
      </Link>
    </div>
  );
}

export default function TenantAdminLayout({ children }: { children: ReactNode }) {
  const { signOut, user, isMasterAdmin, isTenantAdmin } = useAuth();
  const { hasModule } = useTenantModules();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const isAdmin = isMasterAdmin || isTenantAdmin;

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
            </div>
            <SidebarNav location={location} onNavigate={() => setOpen(false)} hasModule={hasModule} hasPermission={hasPermission} isAdmin={isAdmin} />
            <RoleSwitchLink />
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
        </div>
        <SidebarNav location={location} hasModule={hasModule} hasPermission={hasPermission} isAdmin={isAdmin} />
        <RoleSwitchLink />
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
