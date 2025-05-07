import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "./appointment-form";
import { ExportAgendaPdf } from "../agenda/export-agenda-pdf";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getProcedureText, getStatusText, getStatusClass } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface CalendarViewProps {
  facilityId?: number;
  professionalId?: number;
  patientId?: number;
}

export function CalendarView({ facilityId, professionalId, patientId }: CalendarViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("timeGridWeek");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clickedAppointmentId, setClickedAppointmentId] = useState<number | null>(null);
  
  // Build query parameters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Add date range based on current view
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    
    if (view === "dayGridMonth") {
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
    } else if (view === "timeGridWeek") {
      const day = startDate.getDay() || 7; // Convert Sunday from 0 to 7
      startDate.setDate(startDate.getDate() - day + 1); // Start from Monday
      endDate.setDate(startDate.getDate() + 6); // End on Sunday
    }
    
    params.append("startDate", startDate.toISOString());
    params.append("endDate", endDate.toISOString());
    
    // Add additional filters if provided
    if (facilityId) params.append("facilityId", facilityId.toString());
    if (professionalId) params.append("professionalId", professionalId.toString());
    if (patientId) params.append("patientId", patientId.toString());
    
    return params.toString();
  }, [currentDate, view, facilityId, professionalId, patientId]);
  
  // Fetch appointments
  const { data: appointments, isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/appointments', facilityId, professionalId, patientId, currentDate, view],
    queryFn: async () => {
      const url = `/api/appointments?${buildQueryParams()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao buscar agendamentos');
      }
      return response.json();
    }
  });
  
  // Fetch appointment details
  const { data: appointmentDetails, isLoading: isLoadingDetails } = useQuery<any>({
    queryKey: ['/api/appointments', clickedAppointmentId],
    enabled: !!clickedAppointmentId && isAppointmentDetailsOpen,
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${clickedAppointmentId}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes do agendamento');
      }
      return response.json();
    }
  });
  
  // Handle appointment deletion
  const deleteAppointment = async () => {
    if (!clickedAppointmentId) return;
    
    try {
      await apiRequest("DELETE", `/api/appointments/${clickedAppointmentId}`);
      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsDeleteDialogOpen(false);
      setIsAppointmentDetailsOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao excluir agendamento",
        description: "Ocorreu um erro ao excluir o agendamento. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Handle date click
  const handleDateClick = (info: any) => {
    // Only admins and coordinators can create appointments
    if (!["admin", "coordinator"].includes(user?.role || "")) return;
    
    setSelectedDate(info.date);
    setSelectedTime(info.date.toTimeString().substring(0, 5));
    setIsAppointmentFormOpen(true);
  };
  
  // Handle event click
  const handleEventClick = (info: any) => {
    setClickedAppointmentId(parseInt(info.event.id));
    setIsAppointmentDetailsOpen(true);
  };
  
  // Format appointments for FullCalendar
  const getEvents = () => {
    if (!appointments) return [];
    
    return appointments.map(appointment => ({
      id: appointment.id.toString(),
      title: `${appointment.patient?.fullName} - ${getProcedureText(appointment.procedureType)}`,
      start: appointment.startTime,
      end: appointment.endTime,
      extendedProps: {
        patient: appointment.patient,
        professional: appointment.professional,
        room: appointment.room,
        status: appointment.status,
        procedureType: appointment.procedureType
      },
      backgroundColor: getEventColor(appointment.procedureType, appointment.status),
      borderColor: getEventColor(appointment.procedureType, appointment.status),
      display: 'block',
      classNames: ["appointment-event"],
      textColor: '#ffffff',
    }));
  };
  
  // Get color for appointment based on procedure type and status
  const getEventColor = (procedureType: string, status: string) => {
    // If cancelled or no_show, return red
    if (status === "cancelled" || status === "no_show") {
      return "#ef4444";
    }
    
    // Colors based on procedure type
    const procedureColors: Record<string, string> = {
      "psychology_aba": "#3b82f6", // blue
      "psychology_cbt": "#4f46e5", // indigo
      "physiotherapy_psychomotor": "#10b981", // green
      "physiotherapy_conventional": "#14b8a6", // teal
      "speech_therapy": "#8b5cf6", // purple
      "occupational_therapy": "#f59e0b", // amber
      "planning": "#6b7280", // gray
      "free_time": "#9ca3af", // light gray
      "other": "#6b7280", // gray
    };
    
    return procedureColors[procedureType] || "#6b7280";
  };
  
  // Handle appointment update from details dialog
  const handleStatusChange = async (status: string) => {
    if (!clickedAppointmentId) return;
    
    try {
      await apiRequest("PUT", `/api/appointments/${clickedAppointmentId}`, { status });
      toast({
        title: "Status atualizado",
        description: `O status do agendamento foi alterado para "${getStatusText(status)}".`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsAppointmentDetailsOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao atualizar o status. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  const handleViewChange = (newView: "dayGridMonth" | "timeGridWeek" | "timeGridDay") => {
    setView(newView);
  };
  
  // Check if user can edit appointments
  const canEditAppointments = ["admin", "coordinator"].includes(user?.role || "");
  
  // Check if user can edit this specific appointment
  const canEditThisAppointment = (appointmentData: any) => {
    if (!user) return false;
    if (["admin", "coordinator"].includes(user.role)) return true;
    
    // Professionals can only update status of their own appointments
    if (user.role === "professional" || user.role === "intern") {
      return user.professional?.id === appointmentData?.professionalId;
    }
    
    return false;
  };
  
  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={view === "dayGridMonth" ? "default" : "outline"} 
            onClick={() => handleViewChange("dayGridMonth")}
          >
            Mês
          </Button>
          <Button 
            variant={view === "timeGridWeek" ? "default" : "outline"} 
            onClick={() => handleViewChange("timeGridWeek")}
          >
            Semana
          </Button>
          <Button 
            variant={view === "timeGridDay" ? "default" : "outline"} 
            onClick={() => handleViewChange("timeGridDay")}
          >
            Dia
          </Button>
          
          {appointments && appointments.length > 0 && (
            <ExportAgendaPdf 
              appointments={appointments}
              professionalFilter={professionalId || null}
              patientFilter={patientId || null}
              view={view === "dayGridMonth" ? "Mês" : view === "timeGridWeek" ? "Semana" : "Dia"}
            />
          )}
        </div>
        
        {canEditAppointments && (
          <Button onClick={() => {
            setSelectedDate(new Date());
            setSelectedTime(null);
            setIsAppointmentFormOpen(true);
          }}>
            Novo Agendamento
          </Button>
        )}
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <h3 className="text-lg font-semibold">Erro ao carregar agendamentos</h3>
              <p className="text-sm text-gray-500">
                Ocorreu um erro ao carregar os agendamentos. Por favor, tente novamente.
              </p>
            </div>
          ) : (
            <div className="p-0 h-[700px]">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={view}
                headerToolbar={false}
                locale={ptBrLocale}
                events={getEvents()}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                initialDate={currentDate}
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                height="100%"
                stickyHeaderDates
                nowIndicator
                slotEventOverlap={false}
                eventDisplay="block"
                displayEventTime={true}
                displayEventEnd={true}
                eventMaxStack={1}
                slotDuration="00:15:00"
                slotLabelInterval="01:00"
                dayMaxEvents={false}
                forceEventDuration={true}
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6],
                  startTime: '08:00',
                  endTime: '20:00',
                }}
                datesSet={(dateInfo) => {
                  setCurrentDate(dateInfo.view.currentStart);
                  setView(dateInfo.view.type as any);
                }}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: false,
                  hour12: false
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Appointment Form Dialog */}
      {isAppointmentFormOpen && (
        <AppointmentForm
          isOpen={isAppointmentFormOpen}
          onClose={() => setIsAppointmentFormOpen(false)}
          appointmentId={selectedAppointment || undefined}
          facilityId={facilityId}
          date={selectedDate || undefined}
          time={selectedTime || undefined}
        />
      )}
      
      {/* Appointment Details Dialog */}
      <Dialog
        open={isAppointmentDetailsOpen}
        onOpenChange={(open) => !open && setIsAppointmentDetailsOpen(false)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : appointmentDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Paciente</h4>
                  <p className="mt-1">{appointmentDetails.patient?.fullName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Profissional</h4>
                  <p className="mt-1">{appointmentDetails.professional?.user?.fullName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Data e Hora de Início</h4>
                  <p className="mt-1">
                    {new Date(appointmentDetails.startTime).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Data e Hora de Término</h4>
                  <p className="mt-1">
                    {new Date(appointmentDetails.endTime).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Procedimento</h4>
                  <p className="mt-1">{getProcedureText(appointmentDetails.procedureType)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Unidade</h4>
                  <p className="mt-1">{appointmentDetails.facility?.name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Sala</h4>
                  <p className="mt-1">{appointmentDetails.room?.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(appointmentDetails.status)}`}>
                      {getStatusText(appointmentDetails.status)}
                    </span>
                  </p>
                </div>
              </div>
              
              {appointmentDetails.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Observações</h4>
                  <p className="mt-1 text-sm">{appointmentDetails.notes}</p>
                </div>
              )}
              
              {/* Status update buttons */}
              {canEditThisAppointment(appointmentDetails) && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Atualizar Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {appointmentDetails.status !== "confirmed" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        onClick={() => handleStatusChange("confirmed")}
                      >
                        Confirmar
                      </Button>
                    )}
                    
                    {appointmentDetails.status !== "completed" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        onClick={() => handleStatusChange("completed")}
                      >
                        Finalizar
                      </Button>
                    )}
                    
                    {appointmentDetails.status !== "cancelled" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        onClick={() => handleStatusChange("cancelled")}
                      >
                        Cancelar
                      </Button>
                    )}
                    
                    {appointmentDetails.status !== "no_show" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        onClick={() => handleStatusChange("no_show")}
                      >
                        Não Compareceu
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-600">
              Não foi possível carregar os detalhes do agendamento.
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            {canEditAppointments && appointmentDetails && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Excluir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAppointment(clickedAppointmentId);
                    setIsAppointmentFormOpen(true);
                    setIsAppointmentDetailsOpen(false);
                  }}
                >
                  Editar
                </Button>
              </>
            )}
            <Button 
              variant={canEditAppointments ? "outline" : "default"}
              onClick={() => setIsAppointmentDetailsOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteAppointment}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
