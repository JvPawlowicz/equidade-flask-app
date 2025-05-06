import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Search, FileText, Eye, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getProcedureText } from "@/lib/utils";

// Evolution form schema
const evolutionSchema = z.object({
  appointmentId: z.string().min(1, "Selecione um atendimento"),
  content: z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres"),
  status: z.string().optional(),
});

type EvolutionFormValues = z.infer<typeof evolutionSchema>;

export default function EvolutionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isEvolutionFormOpen, setIsEvolutionFormOpen] = useState(false);
  const [selectedEvolution, setSelectedEvolution] = useState<any>(null);
  
  // Determine current user role capabilities
  const isProfessional = user?.role === "professional" || user?.role === "coordinator" || user?.role === "admin";
  const isIntern = user?.role === "intern";
  const isSupervisor = isProfessional;
  
  // Fetch evolutions based on user role and status filter
  const { data: evolutions, isLoading } = useQuery<any[]>({
    queryKey: [`/api/evolutions${searchTerm ? `?search=${searchTerm}` : ""}`],
  });

  // Fetch appointments for form
  const { data: appointments } = useQuery<any[]>({
    queryKey: ["/api/appointments?status=completed"],
    enabled: isEvolutionFormOpen,
  });

  // Create evolution form
  const form = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionSchema),
    defaultValues: {
      appointmentId: "",
      content: "",
      status: isIntern ? "pending" : "completed",
    },
  });

  // Create evolution mutation
  const createEvolutionMutation = useMutation({
    mutationFn: async (values: EvolutionFormValues) => {
      // Format data for API
      const formattedValues = {
        ...values,
        appointmentId: parseInt(values.appointmentId),
      };
      
      const res = await apiRequest("POST", "/api/evolutions", formattedValues);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Evolução registrada",
        description: "A evolução foi registrada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolutions"] });
      setIsEvolutionFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar evolução",
        description: error.message || "Ocorreu um erro ao registrar a evolução. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Approve evolution mutation
  const approveEvolutionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/evolutions/${id}`, {
        status: "approved",
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Evolução aprovada",
        description: "A evolução foi aprovada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolutions"] });
      setSelectedEvolution(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar evolução",
        description: error.message || "Ocorreu um erro ao aprovar a evolução. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Reject evolution mutation
  const rejectEvolutionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/evolutions/${id}`, {
        status: "rejected",
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Evolução rejeitada",
        description: "A evolução foi rejeitada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolutions"] });
      setSelectedEvolution(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao rejeitar evolução",
        description: error.message || "Ocorreu um erro ao rejeitar a evolução. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: EvolutionFormValues) => {
    createEvolutionMutation.mutate(data);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pendente" },
      completed: { bg: "bg-blue-100", text: "text-blue-800", label: "Concluído" },
      approved: { bg: "bg-green-100", text: "text-green-800", label: "Aprovado" },
      rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejeitado" },
    };
    
    const { bg, text, label } = statusMap[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Evoluções</h1>
          <p className="text-gray-600">Registre e acompanhe as evoluções dos atendimentos</p>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar evoluções..."
              className="pl-8 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(isProfessional || isIntern) && (
            <Button onClick={() => setIsEvolutionFormOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Nova Evolução
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !evolutions || evolutions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Nenhuma evolução encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Procedimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evolutions.map((evolution) => (
                    <TableRow key={evolution.id}>
                      <TableCell>
                        {formatDate(evolution.createdAt, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {evolution.appointment?.patient?.fullName || "—"}
                      </TableCell>
                      <TableCell>
                        {evolution.appointment?.professional?.user?.fullName || "—"}
                      </TableCell>
                      <TableCell>
                        {evolution.appointment?.procedureType ? 
                          getProcedureText(evolution.appointment.procedureType) : "—"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(evolution.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setSelectedEvolution(evolution)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {isSupervisor && evolution.status === "pending" && (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-green-600"
                                onClick={() => approveEvolutionMutation.mutate(evolution.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-red-600"
                                onClick={() => rejectEvolutionMutation.mutate(evolution.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Evolution Dialog */}
      <Dialog open={isEvolutionFormOpen} onOpenChange={setIsEvolutionFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Registrar Nova Evolução</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="appointmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Atendimento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o atendimento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {appointments?.map((appointment) => (
                          <SelectItem key={appointment.id} value={appointment.id.toString()}>
                            {formatDate(appointment.date)} - {appointment.patient?.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo da Evolução</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhadamente a evolução do atendimento" 
                        className="min-h-[200px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEvolutionFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createEvolutionMutation.isPending}>
                  {createEvolutionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Registrar Evolução"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Evolution Dialog */}
      <Dialog open={!!selectedEvolution} onOpenChange={(open) => !open && setSelectedEvolution(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Evolução</DialogTitle>
          </DialogHeader>
          {selectedEvolution && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Data</h3>
                <p>{formatDate(selectedEvolution.createdAt)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Paciente</h3>
                <p>{selectedEvolution.appointment?.patient?.fullName || "—"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Profissional</h3>
                <p>{selectedEvolution.appointment?.professional?.user?.fullName || "—"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Procedimento</h3>
                <p>
                  {selectedEvolution.appointment?.procedureType ? 
                    getProcedureText(selectedEvolution.appointment.procedureType) : "—"}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p>{getStatusBadge(selectedEvolution.status)}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Conteúdo</h3>
                <div className="p-4 border rounded-md whitespace-pre-wrap">
                  {selectedEvolution.content}
                </div>
              </div>
              
              <DialogFooter>
                {isSupervisor && selectedEvolution.status === "pending" && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-600"
                      onClick={() => rejectEvolutionMutation.mutate(selectedEvolution.id)}
                      disabled={rejectEvolutionMutation.isPending}
                    >
                      {rejectEvolutionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeitar
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-green-200 text-green-600"
                      onClick={() => approveEvolutionMutation.mutate(selectedEvolution.id)}
                      disabled={approveEvolutionMutation.isPending}
                    >
                      {approveEvolutionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Aprovar
                        </>
                      )}
                    </Button>
                  </div>
                )}
                <Button onClick={() => setSelectedEvolution(null)}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}