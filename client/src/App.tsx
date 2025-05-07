import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import SimpleLogin from "@/pages/simple-login";
import SimpleDashboard from "@/pages/simple-dashboard";
import DashboardPage from "@/pages/dashboard-page";
import PatientsPage from "@/pages/patients-page";
import PatientDetails from "@/pages/patient-details";
import ProfessionalsPage from "@/pages/professionals-page";
import ProfessionalDetails from "@/pages/professional-details";
import AppointmentsPage from "@/pages/appointments-page";
import EvolutionsPage from "@/pages/evolutions-page";
import FacilitiesPage from "@/pages/facilities-page";
import FacilityDetails from "@/pages/facility-details";
import ReportsPage from "@/pages/reports-page";
import ChatPage from "@/pages/chat-page";
import DocumentsPage from "@/pages/documents-page";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { SkipLink } from "@/components/accessibility/skip-link";
import { FocusIndicator } from "@/components/accessibility/focus-indicator";
import { AccessibilityToolbar } from "@/components/accessibility/accessibility-toolbar";
import NotFound from "@/pages/not-found";
import { useAccessibility } from "@/hooks/use-accessibility";
import { useState, useEffect } from "react";
import { webSocketManager } from "@/lib/websocket-manager";
import { ConnectivityStatus } from "@/components/mobile/connectivity-status";
import { useNetworkStatus } from "@/hooks/use-mobile";
import { useResponsive } from "@/hooks/use-mobile";
import { registerServiceWorker } from "@/lib/offline-utils";
import { FacilityProvider } from "@/hooks/use-facility";
import { LgpdProvider } from "@/hooks/use-lgpd";

// Componente para anúncios de leitores de tela
function ScreenReaderAnnouncer() {
  const [announcements, setAnnouncements] = useState<Array<{id: number, text: string, politeness: 'polite' | 'assertive'}>>([]);
  const { announce, addAnnouncementListener, removeAnnouncementListener } = useAccessibility();
  
  useEffect(() => {
    let idCounter = 0;
    
    // Handler para novos anúncios
    const handleAnnouncement = (text: string, politeness: 'polite' | 'assertive' = 'polite') => {
      const id = idCounter++;
      setAnnouncements(prev => [...prev, { id, text, politeness }]);
      
      // Remover anúncios antigos após 10 segundos
      setTimeout(() => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }, 10000);
    };
    
    // Adicionar listener
    addAnnouncementListener(handleAnnouncement);
    
    // Limpar listener
    return () => {
      removeAnnouncementListener(handleAnnouncement);
    };
  }, [addAnnouncementListener, removeAnnouncementListener]);
  
  return (
    <>
      {/* Região de anúncios polite (não interrompe a fala atual) */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcements
          .filter(a => a.politeness === 'polite')
          .map(a => (
            <div key={a.id}>{a.text}</div>
          ))
        }
      </div>
      
      {/* Região de anúncios assertive (interrompe a fala atual) */}
      <div 
        aria-live="assertive" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcements
          .filter(a => a.politeness === 'assertive')
          .map(a => (
            <div key={a.id}>{a.text}</div>
          ))
        }
      </div>
    </>
  );
}

// Aplicação com todas as rotas
function App() {
  const { user, isLoading } = useAuth();
  const { announce } = useAccessibility();
  const { deviceType } = useResponsive();
  const { isOnline } = useNetworkStatus();
  
  // Anunciar carregamento para leitores de tela
  useEffect(() => {
    if (isLoading) {
      announce("Carregando aplicação, por favor aguarde...", "polite");
    }
  }, [isLoading, announce]);
  
  // Inicializar WebSocket e Service Worker
  useEffect(() => {
    // Inicializar WebSocket se o usuário estiver autenticado
    if (user && !isLoading) {
      webSocketManager.connect();
      
      // Anunciar status de conexão para leitores de tela
      if (isOnline) {
        announce("Conexão estabelecida", "polite");
      } else {
        announce("Você está trabalhando offline", "polite");
      }
    }
    
    // Registrar Service Worker para funcionalidades offline
    registerServiceWorker().then(registration => {
      if (registration) {
        console.log('Service Worker registrado com sucesso');
      }
    }).catch(error => {
      console.error('Erro ao registrar Service Worker:', error);
    });
    
    // Limpar WebSocket ao desmontar o componente
    return () => {
      webSocketManager.disconnect();
    };
  }, [user, isLoading, isOnline, announce]);
  
  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        aria-live="polite" 
        aria-busy="true"
      >
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }
  
  return (
    <>
      {/* Componente para anúncios de screen readers */}
      <ScreenReaderAnnouncer />
      
      {/* Indicador de foco para navegação por teclado */}
      <FocusIndicator />
      
      {/* Barra de ferramentas de acessibilidade */}
      <AccessibilityToolbar />
      
      {/* Skip link para acessibilidade */}
      <SkipLink targetId="main-content" />
      
      {/* Conteúdo principal da aplicação */}
      <main id="main-content" tabIndex={-1}>
        {/* Provider para seleção de unidades e termos LGPD */}
        <FacilityProvider>
          <LgpdProvider>
          <Switch>
            {/* Rotas simplificadas para fallback */}
            <Route path="/simple-login" component={SimpleLogin} />
            <Route path="/simple-dashboard" component={SimpleDashboard} />
            
            {/* Rota de autenticação */}
            <Route path="/auth" component={AuthPage} />
            
            {/* Rotas protegidas */}
            <ProtectedRoute path="/" component={DashboardPage} />
            <ProtectedRoute path="/pacientes" component={PatientsPage} />
            <ProtectedRoute path="/pacientes/:id" component={PatientDetails} />
            <ProtectedRoute path="/profissionais" component={ProfessionalsPage} />
            <ProtectedRoute path="/profissionais/:id" component={ProfessionalDetails} />
            <ProtectedRoute path="/agenda" component={AppointmentsPage} />
            <ProtectedRoute path="/evolucoes" component={EvolutionsPage} />
            <ProtectedRoute path="/unidades" component={FacilitiesPage} />
            <ProtectedRoute path="/unidades/:id" component={FacilityDetails} />
            <ProtectedRoute path="/relatorios" component={ReportsPage} />
            <ProtectedRoute path="/chat" component={ChatPage} />
            <ProtectedRoute path="/documentos" component={DocumentsPage} />
            
            {/* Página 404 para rotas não encontradas */}
            <Route path="/404" component={NotFound} />
            
            {/* Redirecionar para autenticação quando não estiver logado */}
            <Route path="/:rest*">
              {user ? <Redirect to="/" /> : <Redirect to="/auth" />}
            </Route>
          </Switch>
          
          {/* Componente de status de conectividade para dispositivos móveis */}
          {deviceType === 'mobile' && user && (
            <ConnectivityStatus 
              position="bottom"
              showInstallPrompt={true}
              onSync={async () => {
                try {
                  // Sincronizar dados offline
                  // Esta função será implementada quando tivermos a lógica completa de sincronização
                  announce("Sincronizando dados...", "polite");
                  // Por enquanto apenas exibimos a mensagem
                  setTimeout(() => {
                    announce("Sincronização concluída", "polite");
                  }, 1500);
                  return Promise.resolve();
                } catch (error) {
                  console.error('Erro na sincronização:', error);
                  return Promise.reject(error);
                }
              }}
            />
          )}
          </LgpdProvider>
        </FacilityProvider>
      </main>
    </>
  );
}

export default App;
