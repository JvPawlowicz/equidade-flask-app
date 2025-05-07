import React, { useState, useEffect, useContext } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight, List } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { CalendarContext } from '../../contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getProcedureText, getStatusText, getStatusClass } from '@/lib/utils';

const Schedule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { events, addEvent, updateEvent, deleteEvent } = useContext(CalendarContext);
  const [view, setView] = useState('timeGridWeek');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    // Carregar eventos iniciais
    const fetchEvents = async () => {
      try {
        const response = await apiRequest('GET', '/api/appointments');
        // Processar os dados e adicionar ao contexto
        response.forEach(event => addEvent(event));
      } catch (error) {
        toast({
          title: "Erro ao carregar eventos",
          description: "Não foi possível carregar os agendamentos",
          variant: "destructive"
        });
      }
    };

    fetchEvents();
  }, []);

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

  const getEvents = () => {
    // Converter eventos do contexto para o formato esperado pelo FullCalendar
    return events.map(event => ({
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
        notes: event.notes
      }
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Agenda</CardTitle>
          
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