import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, FileWarning, Wrench, Grid3x3, LogOut, ShieldCheck } from "lucide-react";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/nc", label: "Non-Conformités", icon: FileWarning },
  { to: "/capa", label: "CAPA", icon: Wrench },
  { to: "/amdec", label: "AMDEC", icon: Grid3x3 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <ShieldCheck className="h-6 w-6 text-sidebar-primary" />
          <div>
            <div className="font-semibold leading-tight">SMQ</div>
            <div className="text-xs text-sidebar-foreground/70">Qualité ISO 9001</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3">
          <div className="md:hidden flex gap-2">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="text-xs text-muted-foreground hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">{profile?.full_name || "—"}</div>
              <div className="text-xs text-muted-foreground">
                {profile ? ROLE_LABELS[profile.role] : ""}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Déconnexion
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
