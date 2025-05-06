import { useState } from "react";
import { Menu, Search, Bell, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { NotificationsDropdown } from "../common/notifications";
import { cn } from "@/lib/utils";

interface HeaderProps {
  toggleSidebar: () => void;
  onSearch?: (term: string) => void;
}

export function Header({ toggleSidebar, onSearch }: HeaderProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="flex-1 max-w-lg mx-4 hidden md:block">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                className="pl-10"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Right side menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-primary relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full"></span>
            </Button>
            {showNotifications && (
              <NotificationsDropdown onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* Help */}
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Profile dropdown */}
          <div className="relative">
            <Avatar className="h-8 w-8 md:hidden">
              <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.fullName || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user?.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || ""}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
