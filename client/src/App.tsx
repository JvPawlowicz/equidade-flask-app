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
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";

// Aplicação com todas as rotas
function App() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }
  
  return (
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
      
      {/* Redirecionar para autenticação quando não estiver logado */}
      <Route path="/:rest*">
        {user ? <Redirect to="/" /> : <Redirect to="/auth" />}
      </Route>
    </Switch>
  );
}

export default App;
