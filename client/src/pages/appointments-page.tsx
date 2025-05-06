import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { CalendarView } from "@/components/appointments/calendar-view";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Search, Plus, Filter } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterFacilityId, setFilterFacilityId] = useState<number | undefined>(undefined);
  const [filterProfessionalId, setFilterProfessionalId] = useState<number | undefined>(undefined);
  const [filterPatientId, setFilterPatientId] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch facilities for filters
  const { data: facilities } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });

  // Fetch professionals for filters
  const { data: professionals } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
  });

  // Fetch patients for filters
  const { data: patients } = useQuery<any[]>({
    queryKey: ["/api/patients"],
  });

  // Handle patient search
  const filteredPatients = patients?.filter(patient => 
    patient.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Check if user can create appointments
  const canCreateAppointments = ["admin", "coordinator"].includes(user?.role || "");

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Agenda</h1>
          <p className="text-gray-600">Gerencie os agendamentos de atendimentos</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          {canCreateAppointments && (
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Unidade</label>
                <Select 
                  value={filterFacilityId?.toString() || "all_facilities"}
                  onValueChange={(value) => setFilterFacilityId(value !== "all_facilities" ? parseInt(value) : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_facilities">Todas as unidades</SelectItem>
                    {facilities?.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Profissional</label>
                <Select 
                  value={filterProfessionalId?.toString() || "all_professionals"}
                  onValueChange={(value) => setFilterProfessionalId(value !== "all_professionals" ? parseInt(value) : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os profissionais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_professionals">Todos os profissionais</SelectItem>
                    {professionals?.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id.toString()}>
                        {professional.user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Paciente</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar paciente"
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && filteredPatients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setFilterPatientId(patient.id);
                            setSearchTerm(patient.fullName);
                          }}
                        >
                          {patient.fullName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Status</label>
                <Select 
                  value={filterStatus || "all_statuses"}
                  onValueChange={(value) => setFilterStatus(value !== "all_statuses" ? value : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">Todos os status</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Finalizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não Compareceu</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterFacilityId(undefined);
                  setFilterProfessionalId(undefined);
                  setFilterPatientId(undefined);
                  setFilterStatus(undefined);
                  setSearchTerm("");
                }}
                className="mr-2"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <CalendarView 
        facilityId={filterFacilityId}
        professionalId={filterProfessionalId}
        patientId={filterPatientId}
      />

      {/* Appointment Form Dialog */}
      {isFormOpen && (
        <AppointmentForm 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </AppLayout>
  );
}
