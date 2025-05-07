import { useQuery } from "@tanstack/react-query";
import { Appointment } from "@shared/schema";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { formatTimeRange, getStatusClass, getStatusText, getProcedureText, calculateAge } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function TodaySchedule() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: appointments, isLoading, error } = useQuery<any[]>({
    queryKey: [`/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-gray-800">Agenda de Hoje</CardTitle>
          <Button variant="link" asChild>
            <Link href="/agenda">Ver toda agenda</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0 flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-gray-800">Agenda de Hoje</CardTitle>
          <Button variant="link" asChild>
            <Link href="/agenda">Ver toda agenda</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-4 text-gray-600">
            Erro ao carregar a agenda. Por favor, tente novamente.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="link" asChild className="p-0 h-auto text-primary">
          <Link href="/agenda">Ver toda agenda</Link>
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Horário</TableHead>
              <TableHead className="text-xs">Paciente</TableHead>
              <TableHead className="text-xs">Profissional</TableHead>
              <TableHead className="text-xs">Procedimento</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments && appointments.length > 0 ? (
              appointments.map((appointment) => (
                <TableRow key={appointment.id} className="hover:bg-gray-50">
                  <TableCell className="whitespace-nowrap py-2 text-xs">
                    {formatTimeRange(appointment.startTime, appointment.endTime)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2">
                    <div className="flex items-center">
                      <AvatarInitials
                        name={appointment.patient?.fullName || ""}
                        className="h-7 w-7 rounded-full bg-blue-100 text-blue-500"
                      />
                      <div className="ml-2">
                        <div className="text-xs font-medium text-gray-900">
                          {appointment.patient?.fullName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {calculateAge(appointment.patient?.dateOfBirth)} anos
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs py-2">
                    {appointment.professional?.user?.fullName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs py-2">
                    {getProcedureText(appointment.procedureType)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-600">
                  Não há agendamentos para hoje.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
