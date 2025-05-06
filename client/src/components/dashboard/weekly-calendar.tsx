import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, formatTimeOnly } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function WeeklyCalendar() {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Calculate start and end of the week
  const getWeekBounds = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay() || 7; // Convert Sunday from 0 to 7
    startOfWeek.setDate(startOfWeek.getDate() - day + 1); // Start from Monday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // End on Sunday
    
    return { startOfWeek, endOfWeek };
  };
  
  const { startOfWeek, endOfWeek } = getWeekBounds();
  
  // Format dates for the API
  const startDate = startOfWeek.toISOString();
  const endDate = endOfWeek.toISOString();
  
  // Fetch the week's appointments
  const { data: appointments, isLoading } = useQuery<any[]>({
    queryKey: [`/api/appointments?startDate=${startDate}&endDate=${endDate}`],
  });
  
  // Generate an array of dates for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    return date;
  });
  
  // Time slots
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const time = new Date();
    time.setHours(8 + i, 0, 0, 0);
    return time;
  });
  
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };
  
  // Handle navigation
  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  
  // Get appointments for a specific day and time
  const getAppointmentsForTimeSlot = (day: Date, time: Date) => {
    if (!appointments) return [];
    
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    
    const timeHour = time.getHours();
    
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.startTime);
      return appointmentDate >= dayStart && 
             appointmentDate <= dayEnd && 
             appointmentDate.getHours() === timeHour;
    });
  };
  
  // Get appropriate color class for procedure type
  const getProcedureColorClass = (procedureType: string) => {
    const colorMap: Record<string, string> = {
      "psychology_aba": "bg-blue-100 border-l-4 border-blue-500",
      "psychology_cbt": "bg-indigo-100 border-l-4 border-indigo-500",
      "physiotherapy_psychomotor": "bg-green-100 border-l-4 border-green-500",
      "physiotherapy_conventional": "bg-teal-100 border-l-4 border-teal-500",
      "speech_therapy": "bg-purple-100 border-l-4 border-purple-500",
      "occupational_therapy": "bg-amber-100 border-l-4 border-amber-500",
      "planning": "bg-gray-100 border-l-4 border-gray-500",
      "free_time": "bg-gray-100 border-l-4 border-gray-500",
      "other": "bg-gray-100 border-l-4 border-gray-500",
    };
    
    return colorMap[procedureType] || "bg-gray-100 border-l-4 border-gray-500";
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium text-gray-900">
              {formatDate(startOfWeek, "MMMM yyyy")}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Semana de {formatDate(startOfWeek, "dd")} a {formatDate(endOfWeek, "dd")}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setView("day")}>
              Dia
            </Button>
            <Button 
              size="sm" 
              className={view === "week" ? "bg-primary text-white" : "bg-white text-gray-600"}
              variant={view === "week" ? "default" : "outline"}
              onClick={() => setView("week")}
            >
              Semana
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView("month")}>
              Mês
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={previousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-auto max-h-80">
            <div className="calendar-grid">
              {/* Calendar header with weekdays */}
              <div className="grid grid-cols-8 border-b border-gray-200">
                <div className="py-3 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200"></div>
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "py-3 text-center text-xs font-medium uppercase",
                      isToday(day) ? "text-primary font-semibold" : "text-gray-500"
                    )}
                  >
                    {formatDate(day, "EEE dd")}
                  </div>
                ))}
              </div>
              
              {/* Time slots and appointments */}
              <div className="calendar-grid">
                {/* Time slots */}
                {timeSlots.map((time, timeIndex) => (
                  <div
                    key={timeIndex}
                    className="calendar-time border-r border-gray-200 py-3 text-center text-xs font-medium text-gray-500"
                  >
                    {formatTimeOnly(time)}
                  </div>
                ))}
                
                {/* Appointment cells */}
                {weekDays.map((day, dayIndex) => (
                  timeSlots.map((time, timeIndex) => {
                    const slotAppointments = getAppointmentsForTimeSlot(day, time);
                    return (
                      <div
                        key={`${dayIndex}-${timeIndex}`}
                        className={cn(
                          "col-start-" + (dayIndex + 2),
                          "row-start-" + (timeIndex + 1),
                          "border-b border-r border-gray-100",
                          "min-h-[60px]"
                        )}
                      >
                        {slotAppointments.map((appointment, appIndex) => (
                          <div
                            key={appIndex}
                            className={cn(
                              "m-1 p-2 text-xs rounded",
                              getProcedureColorClass(appointment.procedureType)
                            )}
                          >
                            {appointment.patient?.fullName.split(' ')[0]} - {
                              (() => {
                                const procedureMap: Record<string, string> = {
                                  "psychology_aba": "Psico-ABA",
                                  "psychology_cbt": "Psico-TCC",
                                  "physiotherapy_psychomotor": "Fisio-Psico",
                                  "physiotherapy_conventional": "Fisio",
                                  "speech_therapy": "Fono",
                                  "occupational_therapy": "TO",
                                  "planning": "Planej.",
                                  "free_time": "Livre",
                                  "other": "Outro"
                                };
                                return procedureMap[appointment.procedureType] || "Outro";
                              })()
                            } ({appointment.room?.name})
                          </div>
                        ))}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
