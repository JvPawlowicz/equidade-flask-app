import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CardHeader, CardTitle, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, FileText } from "lucide-react";
import { Link } from "wouter";
import { formatDate, getProcedureText } from "@/lib/utils";

interface PendingEvolutionCardProps {
  evolution: any;
}

function PendingEvolutionCard({ evolution }: PendingEvolutionCardProps) {
  return (
    <Card className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between mb-3">
        <div className="font-medium text-gray-900">{evolution.patient?.fullName}</div>
        <span className="text-xs text-gray-500">
          {formatDate(evolution.appointment?.startTime || "")}
        </span>
      </div>
      <div className="flex items-center mb-3">
        <User className="text-gray-400 mr-2 h-4 w-4" />
        <span className="text-sm text-gray-600">
          {evolution.professional?.user?.fullName}
        </span>
      </div>
      <div className="flex items-center mb-3">
        <FileText className="text-gray-400 mr-2 h-4 w-4" />
        <span className="text-sm text-gray-600">
          {evolution.appointment ? (
            getProcedureText(evolution.appointment?.procedureType || "")
          ) : (
            "Procedimento não especificado"
          )}
        </span>
      </div>
      <div className="mt-4">
        <Button size="sm" className="w-full" asChild>
          <Link href={`/evolucoes?id=${evolution.id}`}>
            Realizar Evolução
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export function PendingEvolutions() {
  const { user } = useAuth();
  
  const { data: evolutions, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/evolutions?status=pending"],
  });
  
  // For supervisors, also get evolutions pending approval
  const { data: pendingApproval, isLoading: isLoadingApproval, error: errorApproval } = useQuery<any[]>({
    queryKey: ["/api/evolutions?status=pending"],
    enabled: user?.role === "admin" || user?.role === "coordinator" || user?.professional?.interns?.length > 0,
  });



  return (
    <div>
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">Evoluções Pendentes</CardTitle>
          <Button variant="link" asChild>
            <Link href="/evolucoes">Ver todas</Link>
          </Button>
        </div>
      </CardHeader>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-4 text-gray-600">
          Erro ao carregar evoluções pendentes. Por favor, tente novamente.
        </div>
      ) : !evolutions || evolutions.length === 0 ? (
        <div className="text-center py-4 text-gray-600">
          Não há evoluções pendentes.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evolutions.map((evolution) => (
            <PendingEvolutionCard key={evolution.id} evolution={evolution} />
          ))}
        </div>
      )}
      
      {/* If user is a supervisor, show evolutions pending approval */}
      {(user?.role === "admin" || user?.role === "coordinator" || user?.professional?.interns?.length > 0) && pendingApproval && pendingApproval.length > 0 && (
        <>
          <CardHeader className="px-0 pt-6 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">Evoluções Aguardando Aprovação</CardTitle>
          </CardHeader>
          
          {isLoadingApproval ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : errorApproval ? (
            <div className="text-center py-4 text-gray-600">
              Erro ao carregar evoluções para aprovação. Por favor, tente novamente.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingApproval.filter(e => e.supervisorId === user?.professional?.id).map((evolution) => (
                <PendingEvolutionCard key={evolution.id} evolution={evolution} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
