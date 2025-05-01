import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart,
  Receipt,
  Users,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  Building2,
  Bell,
  MessageSquare
} from "lucide-react";
import 'boxicons/css/boxicons.min.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  // Por defecto, el sidebar estará contraído para mejor experiencia en dispositivos móviles
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    {
      title: "Dashboard",
      icon: <BarChart className="w-5 h-5" />,
      path: "/",
      showFor: ["CLIENTE", "ADMINISTRADOR", "EMPLEADO"],
    },
    {
      title: "Boletas",
      icon: <Receipt className="w-5 h-5" />,
      path: "/upload",
      showFor: ["CLIENTE", "ADMINISTRADOR", "EMPLEADO"],
    },
    {
      title: "Documentos",
      icon: <FileText className="w-5 h-5" />,
      path: "/documents",
      showFor: ["CLIENTE", "ADMINISTRADOR", "EMPLEADO"],
    },
    {
      title: "Empresas",
      icon: <Building2 className="w-5 h-5" />,
      path: "/companies",
      showFor: ["ADMINISTRADOR"],
    },
    {
      title: "Usuarios",
      icon: <Users className="w-5 h-5" />,
      path: "/tables",
      showFor: ["ADMINISTRADOR"],
    },
    {
      title: "Mensajes",
      icon: <MessageSquare className="w-5 h-5" />,
      path: "/user-messages",
      showFor: ["ADMINISTRADOR"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f9]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-white border-r border-gray-200",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full px-3 py-4 flex flex-col">
          <div className="flex items-center mb-6 pl-2">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-8"
            />
            <span className="ml-3 text-xl font-semibold text-gray-800">Hestion</span>
          </div>
          <div className="space-y-1 flex-1">
            {menuItems
              .filter(item => item.showFor.includes(user?.role || ""))
              .map((item) => (
                <Link key={item.path} href={item.path}>
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-lg",
                      location === item.path
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {item.icon}
                    <span className="ml-3">{item.title}</span>
                  </a>
                </Link>
              ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-300", isSidebarOpen ? "ml-64" : "ml-0")}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 fixed right-0 top-0 z-30 flex h-16 items-center gap-4 px-6 transition-all duration-300"
          style={{ width: isSidebarOpen ? 'calc(100% - 16rem)' : '100%' }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>

          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.nombreCompleto || user?.username}`} />
                <AvatarFallback>
                  {(user?.nombreCompleto || user?.username || "").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.nombreCompleto || user?.username}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="pt-24 pb-8 px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
