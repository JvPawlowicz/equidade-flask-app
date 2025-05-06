import { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, HelpCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { NotificationsDropdown } from "../common/notifications";
import { cn } from "@/lib/utils";
import { useAccessibility } from "@/hooks/use-accessibility";

interface HeaderProps {
  toggleSidebar: () => void;
  onSearch?: (term: string) => void;
}

export function Header({ toggleSidebar, onSearch }: HeaderProps) {
  const { user } = useAuth();
  const { announce } = useAccessibility();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current && 
        !notificationsRef.current.contains(event.target as Node) &&
        showNotifications
      ) {
        setShowNotifications(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);
  
  // Handle keyboard navigation for notifications dropdown
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && showNotifications) {
        setShowNotifications(false);
        announce("Notificações fechadas");
      }
    }
    
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showNotifications, announce]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
      announce(`Pesquisando por: ${searchTerm}`);
    }
  };
  
  const handleClearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    announce("Campo de pesquisa limpo");
  };
  
  const toggleNotifications = () => {
    const newState = !showNotifications;
    setShowNotifications(newState);
    announce(`Notificações ${newState ? "abertas" : "fechadas"}`);
  };

  return (
    <header 
      className="sticky top-0 z-10 bg-white shadow-sm dark:bg-gray-800 dark:text-white"
      role="banner"
      aria-label="Cabeçalho da aplicação"
    >
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
          aria-label="Alternar menu de navegação"
          aria-expanded="false"
          aria-controls="sidebar-navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        {/* Search */}
        <div className="flex-1 max-w-lg mx-4 hidden md:block">
          <form 
            onSubmit={handleSearch}
            role="search"
            aria-label="Pesquisa no sistema"
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <Input
                type="search"
                className="pl-10"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Pesquisar no sistema"
                ref={searchInputRef}
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={handleClearSearch}
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right side menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-primary relative"
              onClick={toggleNotifications}
              aria-label="Notificações"
              aria-expanded={showNotifications}
              aria-haspopup="true"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span 
                className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full"
                aria-label="Novas notificações"
                role="status"
              ></span>
            </Button>
            {showNotifications && (
              <NotificationsDropdown onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Help */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 hover:text-primary"
            aria-label="Ajuda"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Profile dropdown */}
          <div className="relative">
            <Avatar 
              className="h-8 w-8 md:hidden"
              aria-label={`Perfil de ${user?.fullName || "usuário"}`}
            >
              <AvatarImage 
                src={user?.profileImageUrl || undefined} 
                alt="" 
              />
              <AvatarFallback 
                className="bg-primary/10 text-primary text-xs"
                aria-hidden="true"
              >
                {user?.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || ""}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
