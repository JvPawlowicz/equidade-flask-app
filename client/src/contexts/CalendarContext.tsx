import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Define o tipo de um evento
export interface CalendarEvent {
  id: number;
  title?: string;
  startTime: string;
  endTime: string;
  status: string;
  procedureType: string;
  patientId: number;
  patientName: string;
  professionalId: number;
  professionalName: string;
  roomId?: number;
  roomName?: string;
  notes?: string;
  facilityId?: number;
  facilityName?: string;
}

// Define o tipo para o contexto
interface CalendarContextType {
  events: CalendarEvent[];
  isLoading: boolean;
  error: Error | null;
  fetchEvents: (start?: Date, end?: Date, facilityId?: number | string, professionalId?: number | string) => Promise<CalendarEvent[] | undefined>;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: number, updatedEvent: Partial<CalendarEvent>) => void;
  deleteEvent: (id: number) => void;
}

// Cria o contexto com valor inicial vazio
export const CalendarContext = createContext<CalendarContextType>({
  events: [],
  isLoading: false,
  error: null,
  fetchEvents: async () => [] as CalendarEvent[], // Retorna um array vazio do tipo CalendarEvent[]
  addEvent: () => {},
  updateEvent: () => {},
  deleteEvent: () => {},
});

// Provedor do contexto
export const CalendarProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Função para buscar eventos no servidor
  const fetchEvents = async (start?: Date, end?: Date, facilityId?: number | string, professionalId?: number | string): Promise<CalendarEvent[]> => {
    if (!user) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Construir query params para os filtros fornecidos
      const params = new URLSearchParams();
      
      if (start && end) {
        params.append('startDate', start.toISOString());
        params.append('endDate', end.toISOString());
      }
      
      if (facilityId) {
        params.append('facilityId', facilityId.toString());
      }
      
      if (professionalId) {
        params.append('professionalId', professionalId.toString());
      }
      
      // Construir a URL com os query params
      const url = `/api/appointments${params.toString() ? `?${params.toString()}` : ''}`;
      
      const responseData = await apiRequest<any[]>('GET', url);
      
      // Processar os eventos recebidos
      const formattedEvents = responseData.map((appointment: any) => ({
        id: appointment.id,
        title: appointment.title || `${appointment.patient?.fullName} - ${appointment.procedureType}`,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        procedureType: appointment.procedureType,
        patientId: appointment.patientId,
        patientName: appointment.patient?.fullName || 'Sem paciente',
        professionalId: appointment.professionalId,
        professionalName: appointment.professional?.fullName || 'Sem profissional',
        roomId: appointment.roomId,
        roomName: appointment.room?.name || 'Sem sala',
        notes: appointment.notes,
        facilityId: appointment.facilityId,
        facilityName: appointment.facility?.name || 'Sem unidade'
      }));
      
      setEvents(formattedEvents);
      return formattedEvents;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido ao buscar eventos'));
      toast({
        title: "Erro ao carregar agendamentos",
        description: "Não foi possível carregar os agendamentos",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Função para adicionar um novo evento
  const addEvent = (event: CalendarEvent) => {
    setEvents(prev => [...prev, event]);
  };

  // Função para atualizar um evento existente
  const updateEvent = (id: number, updatedEvent: Partial<CalendarEvent>) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === id ? { ...event, ...updatedEvent } : event
      )
    );
  };

  // Função para excluir um evento
  const deleteEvent = (id: number) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  };

  // Buscar eventos iniciais quando o contexto for montado
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  return (
    <CalendarContext.Provider value={{
      events,
      isLoading,
      error,
      fetchEvents,
      addEvent,
      updateEvent,
      deleteEvent
    }}>
      {children}
    </CalendarContext.Provider>
  );
};

// Hook customizado para usar o contexto do calendário
export const useCalendar = () => {
  const context = React.useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar deve ser usado dentro de um CalendarProvider');
  }
  return context;
};