import React, { useState, useEffect, useContext, useRef } from 'react';
// Renamed file to .jsx to properly handle JSX syntax
import { Link } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight, List, ArrowLeft, Filter } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { CalendarContext, useCalendar } from '../../contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFacility } from '@/hooks/use-facility';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getProcedureText, getStatusText, getStatusClass } from '@/lib/utils';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const Schedule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedFacility, selectedFacilityId: contextFacilityId, setSelectedFacilityId: setContextFacilityId } = useFacility();
  const { events, addEvent, updateEvent, deleteEvent, fetchEvents, isLoading: eventsLoading } = useCalendar();
  const [view, setView] = useState('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState(contextFacilityId?.toString() || '');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const calendarRef = useRef(null);

  // Sincronizar com o contexto global quando contextFacilityId mudar
  useEffect(() => {
    if (contextFacilityId && isInitialLoad) {
      setSelectedFacilityId(contextFacilityId.toString());
      setIsInitialLoad(false);
    }
  }, [contextFacilityId, isInitialLoad]);

  // Buscar unidades disponíveis
  useEffect(() => {
    const getFacilities = async () => {
      try {
        const response = await apiRequest('GET', '/api/facilities');
        setFacilities(response);
        // Se ainda não houver unidade selecionada, usar a primeira
        if (!selectedFacilityId && response.length > 0) {
          setSelectedFacilityId(response[0].id);
          // Atualizar também o contexto global
          setContextFacilityId(parseInt(response[0].id));
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar unidades",
          description: "Não foi possível carregar as unidades disponíveis",
          variant: "destructive"
        });
      }
    };

    getFacilities();
  }, []);

  // Buscar profissionais da unidade selecionada
  useEffect(() => {
    if (selectedFacilityId) {
      const getProfessionals = async () => {
        try {
          const response = await apiRequest('GET', `/api/professionals?facilityId=${selectedFacilityId}`);
          setProfessionals(response);
        } catch (error) {
          toast({
            title: "Erro ao carregar profissionais",
            description: "Não foi possível carregar os profissionais desta unidade",
            variant: "destructive"
          });
        }
      };

      getProfessionals();
    }
  }, [selectedFacilityId]);

  // Carregar eventos iniciais com base nos filtros
  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Usar a função fetchEvents do contexto CalendarContext que já suporta filtros
        const events = await fetchEvents(
          undefined, // start date
          undefined, // end date
          selectedFacilityId || undefined, 
          selectedProfessionalId || undefined
        );
        
        if (events) {
          setFilteredEvents(events);
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar agendamentos",
          description: "Não foi possível carregar os agendamentos",
          variant: "destructive"
        });
      }
    };

    loadEvents();
  }, [selectedFacilityId, selectedProfessionalId, fetchEvents]);

  const handleDateClick = (info) => {
    const startDate = info.date;
    // Abrir formulário de novo agendamento com a data selecionada
    setIsFormOpen(true);
  };

  const handleEventClick = (info) => {
    setSelectedEvent(info.event);
    // Abrir formulário de edição de agendamento
    setIsFormOpen(true);
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const handlePrevious = () => {
    const calendarApi = document.querySelector('.fc').FullCalendar;
    calendarApi.prev();
    setCurrentDate(calendarApi.getDate());
  };

  const handleNext = () => {
    const calendarApi = document.querySelector('.fc').FullCalendar;
    calendarApi.next();
    setCurrentDate(calendarApi.getDate());
  };

  const handleToday = () => {
    const calendarApi = document.querySelector('.fc').FullCalendar;
    calendarApi.today();
    setCurrentDate(calendarApi.getDate());
  };

  const handleFacilityChange = (facilityId) => {
    setSelectedFacilityId(facilityId);
    setSelectedProfessionalId(''); // Resetar seleção de profissional ao mudar de unidade
    
    // Atualizar o contexto global de unidade
    if (facilityId) {
      setContextFacilityId(parseInt(facilityId));
    } else {
      setContextFacilityId(null);
    }
  };

  const handleProfessionalChange = (professionalId) => {
    setSelectedProfessionalId(professionalId);
  };

  const getEvents = () => {
    // Converter eventos filtrados para o formato esperado pelo FullCalendar
    return filteredEvents.map(event => ({
      id: event.id.toString(),
      title: event.title || `${event.patientName} - ${getProcedureText(event.procedureType)}`,
      start: event.startTime,
      end: event.endTime,
      backgroundColor: getStatusClass(event.status),
      borderColor: getStatusClass(event.status),
      textColor: '#fff',
      extendedProps: {
        status: event.status,
        procedureType: event.procedureType,
        patientId: event.patientId,
        patientName: event.patientName,
        professionalId: event.professionalId,
        professionalName: event.professionalName,
        roomId: event.roomId,
        roomName: event.roomName,
        notes: event.notes,
        facilityId: event.facilityId,
        facilityName: event.facilityName
      }
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Button 
          variant="outline"
          className="gap-2"
          asChild
        >
          <Link href="/agenda">
            <ArrowLeft className="h-4 w-4" />
            Voltar para visualização padrão
          </Link>
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex flex-row items-center justify-between mb-4">
            <CardTitle className="text-xl font-bold">Agenda - Visualização Alternativa</CardTitle>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Hoje
              </Button>
              
              <div className="flex space-x-1">
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex space-x-1">
                <Button 
                  variant={view === 'dayGridMonth' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => handleViewChange('dayGridMonth')}
                >
                  Mês
                </Button>
                <Button 
                  variant={view === 'timeGridWeek' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => handleViewChange('timeGridWeek')}
                >
                  Semana
                </Button>
                <Button 
                  variant={view === 'timeGridDay' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => handleViewChange('timeGridDay')}
                >
                  Dia
                </Button>
                <Button 
                  variant={view === 'listWeek' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => handleViewChange('listWeek')}
                >
                  <List className="h-4 w-4 mr-1" />
                  Lista
                </Button>
              </div>
              
              <Button onClick={() => setIsFormOpen(true)}>
                Novo Agendamento
              </Button>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {/* Filtro por Unidade */}
              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="facility" className="text-sm font-medium">
                  Unidade:
                </label>
                <Select
                  value={selectedFacilityId.toString()}
                  onValueChange={handleFacilityChange}
                >
                  <SelectTrigger id="facility" className="w-full">
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem 
                        key={facility.id} 
                        value={facility.id.toString()}
                      >
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por Profissional */}
              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="professional" className="text-sm font-medium">
                  Profissional:
                </label>
                <Select
                  value={selectedProfessionalId.toString()}
                  onValueChange={handleProfessionalChange}
                >
                  <SelectTrigger id="professional" className="w-full">
                    <SelectValue placeholder="Todos os profissionais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os profissionais</SelectItem>
                    {professionals.map((professional) => (
                      <SelectItem 
                        key={professional.id} 
                        value={professional.id.toString()}
                      >
                        {professional.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
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
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Aqui seria renderizado o componente de formulário de agendamento */}
      {isFormOpen && (
        <div>
          {/* Componente de formulário */}
        </div>
      )}
    </div>
  );
};

export default Schedule;