import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import AppointmentsPage from "@/pages/appointments-page";
import PatientsPage from "@/pages/patients-page";
import PatientDetails from "@/pages/patient-details";
import ProfessionalsPage from "@/pages/professionals-page";
import ProfessionalDetails from "@/pages/professional-details";
import FacilitiesPage from "@/pages/facilities-page";
import FacilityDetails from "@/pages/facility-details";
import ReportsPage from "@/pages/reports-page";
import ChatPage from "@/pages/chat-page";
import EvolutionsPage from "@/pages/evolutions-page";
import { ProtectedRoute } from "./lib/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "./hooks/use-auth";

// Componente para depuração
function DebugAuth() {
  const auth = useAuth();
  
  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Debug Auth</h2>
      <div className="space-y-4">
        <div>
          <p className="font-semibold">Estado de autenticação:</p>
          <pre className="bg-gray-100 p-2 rounded mt-1">
            {JSON.stringify({
              isLoading: auth.isLoading,
              error: auth.error?.message || null,
              user: auth.user ? {
                id: auth.user.id,
                username: auth.user.username,
                fullName: auth.user.fullName,
                role: auth.user.role,
              } : null
            }, null, 2)}
          </pre>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.href = '/auth'} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Ir para Login
          </button>
          
          {auth.user && (
            <button 
              onClick={() => auth.logoutMutation.mutate()} 
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Switch>
      <Route path="/debug" component={DebugAuth} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Rotas protegidas com layout do sistema */}
      <Route path="/:rest*">
        {(params) => {
          // Se não for a rota de auth, usa o layout com sidebar
          return (
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex-1 overflow-auto">
                <Switch>
                  <ProtectedRoute path="/" component={DashboardPage} />
                  <ProtectedRoute path="/dashboard" component={DashboardPage} />
                  <ProtectedRoute path="/agenda" component={AppointmentsPage} />
                  <ProtectedRoute path="/pacientes" component={PatientsPage} />
                  <ProtectedRoute path="/pacientes/:id" component={PatientDetails} />
                  <ProtectedRoute path="/profissionais" component={ProfessionalsPage} />
                  <ProtectedRoute path="/profissionais/:id" component={ProfessionalDetails} />
                  <ProtectedRoute path="/unidades" component={FacilitiesPage} />
                  <ProtectedRoute path="/unidades/:id" component={FacilityDetails} />
                  <ProtectedRoute path="/relatorios" component={ReportsPage} />
                  <ProtectedRoute path="/chat" component={ChatPage} />
                  <ProtectedRoute path="/evolucoes" component={EvolutionsPage} />
                  <Route component={NotFound} />
                </Switch>
              </div>
            </div>
          );
        }}
      </Route>
    </Switch>
  );
}

export default App;
