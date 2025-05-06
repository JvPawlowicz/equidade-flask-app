import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  onSearch?: (term: string) => void;
}

export function AppLayout({ children, onSearch }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 ml-0 md:ml-64 min-h-screen">
        {/* Header */}
        <Header toggleSidebar={toggleSidebar} onSearch={onSearch} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
