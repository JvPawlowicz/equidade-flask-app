import { useState, useEffect } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";
import { useAccessibility } from "@/hooks/use-accessibility";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
  onSearch?: (term: string) => void;
  title?: string;
}

export function AppLayout({ children, onSearch, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { announce } = useAccessibility();
  const [location] = useLocation();

  // Anunciar mudanças de página para leitores de tela
  useEffect(() => {
    // Obter o título da página atual (caso não seja fornecido via props)
    let pageTitle = title;
    
    if (!pageTitle) {
      // Extrair título a partir da URL
      const path = location.split("/").filter(Boolean);
      if (path.length === 0) {
        pageTitle = "Dashboard";
      } else {
        // Formatar o nome da página (ex: '/pacientes' -> 'Pacientes')
        pageTitle = path[0].charAt(0).toUpperCase() + path[0].slice(1);
      }
    }
    
    // Anunciar mudança de página
    announce(`Página ${pageTitle} carregada`);
  }, [location, announce, title]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    
    // Anunciar estado do menu para leitores de tela
    const action = !sidebarOpen ? "aberto" : "fechado";
    announce(`Menu lateral ${action}`);
  };

  // Determinar título da página para o elemento title
  const pageTitle = title || "Clínica de Reabilitação";
  const fullTitle = `${pageTitle} | Sistema Clínico`;

  // Atualizar título do documento
  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - com role e aria-label para acessibilidade */}
      <Sidebar />

      {/* Main Content */}
      <div 
        className="flex flex-col flex-1 ml-0 md:ml-64 min-h-screen"
        role="region"
        aria-label="Conteúdo principal"
      >
        {/* Header - com aria-label para acessibilidade */}
        <Header 
          toggleSidebar={toggleSidebar} 
          onSearch={onSearch} 
        />

        {/* Page Content */}
        <main 
          id="main-content" 
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-background"
          tabIndex={-1}
          role="main"
          aria-label={`Página de ${pageTitle}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;