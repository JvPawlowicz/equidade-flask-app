import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  BarChart, 
  Calendar, 
  Users, 
  User, 
  Building2, 
  FileText, 
  MessageCircle,
  LogOut, 
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  File
} from "lucide-react";
import { formatDate, getCurrentLocation } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAccessibility } from "@/hooks/use-accessibility";

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen: externalIsOpen, setIsOpen: setExternalIsOpen }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const { announce } = useAccessibility();
  const [location] = useLocation();
  const isMobile = useMobile();
  const [internalIsOpen, setInternalIsOpen] = useState(!isMobile);
  const [currentDate, setCurrentDate] = useState<string>(formatDate(new Date(), "dd 'de' MMMM 'de' yyyy"));
  const [currentCity, setCurrentCity] = useState<string>(getCurrentLocation());
  
  // Determine if we're using controlled or uncontrolled state
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const setIsOpen = isControlled 
    ? setExternalIsOpen as (isOpen: boolean) => void 
    : setInternalIsOpen;
  
  // Reference to first navigation item for keyboard navigation
  const firstNavItemRef = useRef<HTMLAnchorElement>(null);
  
  // Focus management after opening sidebar
  useEffect(() => {
    if (isOpen && isMobile) {
      // Set focus to first nav item when sidebar opens on mobile
      setTimeout(() => {
        if (firstNavItemRef.current) {
          firstNavItemRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, isMobile]);
  
  // Update date every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDate(formatDate(new Date(), "dd 'de' MMMM 'de' yyyy"));
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Handle keyboard navigation for sidebar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isMobile && isOpen) {
      setIsOpen(false);
      announce("Menu lateral fechado");
    }
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: <BarChart className="h-5 w-5" aria-hidden="true" /> },
    { path: "/agenda", label: "Agenda", icon: <Calendar className="h-5 w-5" aria-hidden="true" /> },
    { path: "/pacientes", label: "Pacientes", icon: <Users className="h-5 w-5" aria-hidden="true" /> },
    { path: "/profissionais", label: "Profissionais", icon: <User className="h-5 w-5" aria-hidden="true" /> },
    { path: "/unidades", label: "Unidades", icon: <Building2 className="h-5 w-5" aria-hidden="true" /> },
    { path: "/evolucoes", label: "Evoluções", icon: <FileText className="h-5 w-5" aria-hidden="true" /> },
    { path: "/documentos", label: "Documentos", icon: <File className="h-5 w-5" aria-hidden="true" /> },
    { path: "/relatorios", label: "Relatórios", icon: <FileBarChart className="h-5 w-5" aria-hidden="true" /> },
    { path: "/chat", label: "Chat", icon: <MessageCircle className="h-5 w-5" aria-hidden="true" /> },
  ];

  // Filter items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    
    // Restrict access based on role
    if (item.path === "/profissionais" && user.role === "secretary") return false;
    if (item.path === "/unidades" && user.role !== "admin") return false;
    if (item.path === "/relatorios" && !["admin", "coordinator"].includes(user.role)) return false;
    // Pacientes podem ser cadastrados por todos os usuários
    
    return true;
  });

  // Handle logout with accessibility announcement
  const handleLogout = () => {
    announce("Saindo do sistema");
    logoutMutation.mutate();
  };
  
  // Handle toggle sidebar with accessibility announcement
  const handleToggleSidebar = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    announce(`Menu lateral ${newState ? "aberto" : "fechado"}`);
  };

  if (isMobile && !isOpen) return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed top-4 left-4 z-20 bg-primary text-white rounded-full shadow-lg"
      onClick={handleToggleSidebar}
      aria-label="Abrir menu de navegação"
      aria-expanded="false"
      aria-controls="sidebar-navigation"
    >
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-10 bg-gray-900 bg-opacity-50"
          onClick={() => {
            setIsOpen(false);
            announce("Menu lateral fechado");
          }}
          aria-hidden="true"
          role="presentation"
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-20 w-64 bg-sidebar-background text-sidebar-foreground shadow-lg transition-transform duration-300",
          isMobile && !isOpen && "-translate-x-full",
          isMobile && isOpen && "translate-x-0"
        )}
        role="navigation"
        aria-label="Menu principal"
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col h-full">
          {/* Toggle for mobile view */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-0 translate-x-full rounded-l-none bg-primary text-white"
              onClick={handleToggleSidebar}
              aria-label="Fechar menu de navegação"
              aria-expanded="true"
              aria-controls="sidebar-navigation"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}

          {/* Logo */}
          <div 
            className="flex items-center justify-center h-20 px-6 bg-sidebar-primary/90 text-sidebar-primary-foreground"
            role="banner"
          >
            <h1 className="text-2xl font-bold tracking-wide">
              EQUIDADE
            </h1>
          </div>

          {/* User Info */}
          {user && (
            <div 
              className="flex items-center px-6 py-4 bg-sidebar-accent text-sidebar-accent-foreground"
              role="region"
              aria-label="Informações do usuário"
            >
              <Avatar className="h-12 w-12 border-2 border-white/30 shadow-md">
                <AvatarImage src={user.profileImageUrl || undefined} alt="" />
                <AvatarFallback className="bg-primary text-white font-bold" aria-hidden="true">
                  {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-bold">{user.fullName}</p>
                <p className="text-xs mt-0.5" aria-label={`Função: ${
                  user.role === "admin" ? "Administrador" : 
                  user.role === "coordinator" ? "Coordenador" : 
                  user.role === "professional" ? "Profissional" : 
                  user.role === "intern" ? "Estagiário" : 
                  user.role === "secretary" ? "Secretário(a)" : 
                  user.role
                }`}>
                  {user.role === "admin" ? "Administrador" : 
                   user.role === "coordinator" ? "Coordenador" : 
                   user.role === "professional" ? "Profissional" : 
                   user.role === "intern" ? "Estagiário" : 
                   user.role === "secretary" ? "Secretário(a)" : 
                   user.role}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav 
            className="flex-1 py-4 overflow-y-auto bg-sidebar-background"
            id="sidebar-navigation"
            aria-label="Menu de navegação"
          >
            {filteredNavItems.map((item, index) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center px-6 py-3 text-sm font-medium group transition-colors border-l-4",
                  location === item.path 
                    ? "border-l-primary bg-primary/10 text-primary font-bold"
                    : "border-l-transparent text-sidebar-foreground hover:border-l-primary/50 hover:bg-primary/5 hover:text-primary"
                )}
                aria-current={location === item.path ? "page" : undefined}
                ref={index === 0 ? firstNavItemRef : undefined}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div 
            className="px-6 py-4 bg-sidebar-accent/50"
            role="contentinfo"
            aria-label="Data atual e localização"
          >
            <div className="text-xs">
              <p className="mb-1 font-medium">{currentDate}</p>
              <p className="text-sidebar-accent-foreground">{currentCity}, Brasil</p>
            </div>
            <Button
              variant="outline"
              className="flex items-center w-full mt-4 text-sm justify-start p-2 font-medium border-primary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              onClick={handleLogout}
              aria-label="Sair do sistema"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
