import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, AlertTriangle, Calendar, LogOut, Users, Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, userRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sesión cerrada",
        description: "Ha cerrado sesión exitosamente",
      });
      navigate("/auth");
    }
  };
  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      TI: "Tecnología de Información",
      CLINICO: "Personal Clínico",
    };
    return labels[role] || role;
  };

  // Memoizar valores calculados para evitar re-renders innecesarios
  const userDisplayName = profile ? `${profile.nombres} ${profile.apellidos}` : user?.email || "Usuario";
  const userRoleLabel = userRole ? getRoleLabel(userRole) : "Usuario del Sistema";

  // Definir menús según el rol del usuario
  const getNavItems = () => {
    const baseItems = [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/excepciones", label: "Excepciones de Control", icon: AlertTriangle },
    ];

    switch (userRole) {
      case 'ADMIN':
        return [
          ...baseItems,
          { path: "/contingencia", label: "Citas de Contingencia", icon: Calendar },
          { path: "/usuarios", label: "Usuarios", icon: Users },
        ];
      case 'CLINICO':
        return [
          ...baseItems,
          { path: "/contingencia", label: "Citas de Contingencia", icon: Calendar },
        ];
      case 'TI':
        return baseItems;
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  // Componente de navegación reutilizable
  const NavigationItems = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Full Width */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center border-b px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <span className="text-xl font-bold text-primary-foreground">HL</span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Hospital Luis Heysen</h2>
                      <p className="text-xs text-muted-foreground">Control Interno</p>
                    </div>
                  </div>
                </div>
                <nav className="flex flex-col gap-1 p-4">
                  <NavigationItems onItemClick={() => setMobileMenuOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="text-xl font-bold text-primary-foreground">HL</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base lg:text-lg font-bold text-foreground">Hospital Luis Heysen de EsSalud</h1>
                <p className="text-xs text-muted-foreground">Sistema De Control Interno</p>
              </div>
            </div>
          </div>

          {/* Right Side - User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-foreground">
                {userDisplayName}
              </p>
              <p className="text-xs text-muted-foreground">
                {userRoleLabel}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 p-0"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="sticky top-16 hidden lg:block h-[calc(100vh-4rem)] w-64 border-r bg-card">
          <nav className="flex flex-col gap-1 p-4">
            <NavigationItems />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 w-full">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
