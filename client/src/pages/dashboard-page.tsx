import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { PendingEvolutions } from "@/components/dashboard/pending-evolutions";
import { Loader2, CalendarCheck, FileWarning, Users, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch dashboard stats
  const { data: stats } = useQuery<{
    appointmentsToday: number;
    pendingEvolutions: number;
    totalPatients: number;
    totalFacilities: number;
  }>({
    queryKey: ["/api/appointments/stats"],
    queryFn: async () => {
      try {
        setIsLoading(true);
        // Calculate stats from different API calls
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get today's appointments
        const appointmentsRes = await fetch(
          `/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`,
          { credentials: "include" }
        );
        const appointments = await appointmentsRes.json();
        
        // Get pending evolutions
        const evolutionsRes = await fetch("/api/evolutions?status=pending", {
          credentials: "include",
        });
        const evolutions = await evolutionsRes.json();
        
        // Get total patients
        const patientsRes = await fetch("/api/patients", {
          credentials: "include",
        });
        const patients = await patientsRes.json();
        
        // Get total facilities
        const facilitiesRes = await fetch("/api/facilities", {
          credentials: "include",
        });
        const facilities = await facilitiesRes.json();
        
        return {
          appointmentsToday: appointments?.length || 0,
          pendingEvolutions: evolutions?.length || 0,
          totalPatients: patients?.length || 0,
          totalFacilities: facilities?.length || 0,
        };
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
          appointmentsToday: 0,
          pendingEvolutions: 0,
          totalPatients: 0,
          totalFacilities: 0,
        };
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <AppLayout>
      <div>
        {/* Welcome Header */}
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {user?.fullName || ""}
            </h1>
            <p className="text-muted-foreground mt-1">Bem-vindo ao seu dashboard</p>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Atendimentos hoje"
            value={isLoading ? "..." : (stats?.appointmentsToday || 0).toString()}
            icon={<CalendarCheck className="h-6 w-6" />}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Evoluções pendentes"
            value={isLoading ? "..." : (stats?.pendingEvolutions || 0).toString()}
            icon={<FileWarning className="h-6 w-6" />}
            iconClassName="bg-accent/10 text-accent"
          />
          <StatsCard
            title="Total de pacientes"
            value={isLoading ? "..." : (stats?.totalPatients || 0).toString()}
            icon={<Users className="h-6 w-6" />}
            iconClassName="bg-secondary/10 text-secondary"
          />
          <StatsCard
            title="Unidades clínicas"
            value={isLoading ? "..." : (stats?.totalFacilities || 0).toString()}
            icon={<Building2 className="h-6 w-6" />}
            iconClassName="bg-chart-5/10 text-chart-5"
          />
        </div>

        {/* Main content in two columns on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule - wider column */}
          <div className="lg:col-span-2">
            <Card className="shadow-md h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <CalendarCheck className="mr-2 h-5 w-5 text-primary" />
                  Agenda de Hoje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TodaySchedule />
              </CardContent>
            </Card>
          </div>

          {/* Pending Evolutions Section */}
          <div className="lg:col-span-1">
            <Card className="shadow-md h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <FileWarning className="mr-2 h-5 w-5 text-accent" />
                  Evoluções Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PendingEvolutions />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
