import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
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

function App() {
  return (
    <>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={DashboardPage} />
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
      <Toaster />
    </>
  );
}

export default App;
