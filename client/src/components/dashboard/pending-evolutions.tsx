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
    <Card className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between mb-2">
        <div className="font-medium text-gray-900 text-xs">{evolution.patient?.fullName}</div>
        <span className="text-xs text-gray-500">
          {formatDate(evolution.appointment?.startTime || "")}
        </span>
      </div>
      <div className="flex items-center mb-2">
        <User className="text-gray-400 mr-1.5 h-3.5 w-3.5" />
        <span className="text-xs text-gray-600">
          {evolution.professional?.user?.fullName}
        </span>
      </div>
      <div className="flex items-center mb-2">
        <FileText className="text-gray-400 mr-1.5 h-3.5 w-3.5" />
        <span className="text-xs text-gray-600 truncate">
          {evolution.appointment ? (
            getProcedureText(evolution.appointment?.procedureType || "")
          ) : (
            "Procedimento não especificado"
          )}
        </span>
      </div>
      <div className="mt-2">
        <Button size="sm" variant="outline" className="w-full text-xs h-7" asChild>
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
      <div className="flex items-center justify-between mb-4">
        <Button variant="link" asChild className="p-0 h-auto text-primary">
          <Link href="/evolucoes">Ver todas</Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-4 text-xs text-gray-600">
          Erro ao carregar evoluções pendentes.
        </div>
      ) : !evolutions || evolutions.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-600">
          Não há evoluções pendentes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {evolutions.slice(0, 3).map((evolution) => (
            <PendingEvolutionCard key={evolution.id} evolution={evolution} />
          ))}
          {evolutions.length > 3 && (
            <div className="text-center mt-2">
              <Button variant="link" asChild className="text-xs p-0 h-auto">
                <Link href="/evolucoes">Ver mais {evolutions.length - 3} evolução(ões)</Link>
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* If user is a supervisor, show evolutions pending approval */}
      {(user?.role === "admin" || user?.role === "coordinator" || user?.professional?.interns?.length > 0) && pendingApproval && pendingApproval.length > 0 && (
        <>
          <div className="border-t border-gray-200 my-4 pt-4">
            <div className="text-sm font-medium mb-3">Evoluções Aguardando Aprovação</div>
          
            {isLoadingApproval ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : errorApproval ? (
              <div className="text-center py-2 text-xs text-gray-600">
                Erro ao carregar evoluções para aprovação.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {pendingApproval.filter(e => e.supervisorId === user?.professional?.id).slice(0, 2).map((evolution) => (
                  <PendingEvolutionCard key={evolution.id} evolution={evolution} />
                ))}
                {pendingApproval.filter(e => e.supervisorId === user?.professional?.id).length > 2 && (
                  <div className="text-center mt-1">
                    <Button variant="link" asChild className="text-xs p-0 h-auto">
                      <Link href="/evolucoes">
                        Ver mais {pendingApproval.filter(e => e.supervisorId === user?.professional?.id).length - 2} evolução(ões)
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
