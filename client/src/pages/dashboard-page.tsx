import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/app-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TodaySchedule } from "@/components/dashboard/today-schedule";
import { PendingEvolutions } from "@/components/dashboard/pending-evolutions";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { Loader2, CalendarCheck, FileWarning, Users, Building2 } from "lucide-react";

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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Olá, {user?.fullName || ""}
          </h1>
          <p className="text-gray-600">Bem-vindo ao seu dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Atendimentos hoje"
            value={isLoading ? "..." : (stats?.appointmentsToday || 0).toString()}
            icon={<CalendarCheck className="text-xl text-primary" />}
            iconClassName="bg-blue-100 text-primary"
          />
          <StatsCard
            title="Evoluções pendentes"
            value={isLoading ? "..." : (stats?.pendingEvolutions || 0).toString()}
            icon={<FileWarning className="text-xl text-amber-500" />}
            iconClassName="bg-amber-100 text-amber-500"
          />
          <StatsCard
            title="Total de pacientes"
            value={isLoading ? "..." : (stats?.totalPatients || 0).toString()}
            icon={<Users className="text-xl text-green-500" />}
            iconClassName="bg-green-100 text-green-500"
          />
          <StatsCard
            title="Unidades clínicas"
            value={isLoading ? "..." : (stats?.totalFacilities || 0).toString()}
            icon={<Building2 className="text-xl text-purple-500" />}
            iconClassName="bg-purple-100 text-purple-500"
          />
        </div>

        {/* Today's Schedule */}
        <div className="mb-6">
          <TodaySchedule />
        </div>

        {/* Pending Evolutions Section */}
        <div className="mb-6">
          <PendingEvolutions />
        </div>

        {/* Calendar Preview */}
        <div className="mb-6">
          <WeeklyCalendar />
        </div>
      </div>
    </AppLayout>
  );
}
