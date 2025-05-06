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
  ChevronRight
} from "lucide-react";
import { formatDate, getCurrentLocation } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [currentDate, setCurrentDate] = useState<string>(formatDate(new Date(), "dd 'de' MMMM 'de' yyyy"));
  const [currentCity, setCurrentCity] = useState<string>(getCurrentLocation());
  
  // Update date every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDate(formatDate(new Date(), "dd 'de' MMMM 'de' yyyy"));
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const navItems = [
    { path: "/", label: "Dashboard", icon: <BarChart className="h-5 w-5" /> },
    { path: "/agenda", label: "Agenda", icon: <Calendar className="h-5 w-5" /> },
    { path: "/pacientes", label: "Pacientes", icon: <Users className="h-5 w-5" /> },
    { path: "/profissionais", label: "Profissionais", icon: <User className="h-5 w-5" /> },
    { path: "/unidades", label: "Unidades", icon: <Building2 className="h-5 w-5" /> },
    { path: "/evolucoes", label: "Evoluções", icon: <FileText className="h-5 w-5" /> },
    { path: "/relatorios", label: "Relatórios", icon: <FileBarChart className="h-5 w-5" /> },
    { path: "/chat", label: "Chat", icon: <MessageCircle className="h-5 w-5" /> },
  ];

  // Filter items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    
    // Restrict access based on role
    if (item.path === "/profissionais" && user.role === "secretary") return false;
    if (item.path === "/unidades" && user.role !== "admin") return false;
    if (item.path === "/relatorios" && !["admin", "coordinator"].includes(user.role)) return false;
    
    return true;
  });

  if (isMobile && !isOpen) return null;

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-10 bg-gray-900 bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed inset-y-0 left-0 z-20 w-64 bg-sidebar-background text-sidebar-foreground shadow-lg border-r border-sidebar-border transition-transform duration-300",
        isMobile && !isOpen && "-translate-x-full",
        isMobile && isOpen && "translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Toggle for mobile view */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-0 translate-x-full rounded-l-none bg-primary text-white"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-6 border-b border-sidebar-border">
            <h1 className="text-xl font-semibold text-primary">
              EQUIDADE
            </h1>
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center px-6 py-3 border-b border-sidebar-border">
              <Avatar>
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.fullName} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-semibold">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">
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
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors",
                  location === item.path 
                    ? "text-primary bg-primary/10"
                    : "text-sidebar-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-sidebar-border">
            <div className="text-xs text-sidebar-foreground/70">
              <p className="mb-1">{currentDate}</p>
              <p>{currentCity}, Brasil</p>
            </div>
            <Button
              variant="ghost"
              className="flex items-center w-full mt-3 text-sm justify-start p-2 font-medium"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
