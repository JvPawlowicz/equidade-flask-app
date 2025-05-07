import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, X } from "lucide-react";
import { formatDate, calculateAge } from "@/lib/utils";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  
  const { data: patient, isLoading } = useQuery<any>({
    queryKey: [`/api/patients/${id}`],
  });
  
  // Buscar unidades disponíveis
  const { data: allFacilities } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });
  
  // Mutation para adicionar paciente a uma unidade
  const addFacilityMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST", 
        `/api/patients/${id}/facilities`, 
        { facilityId: parseInt(selectedFacilityId) }
      );
      return response.json();
    },
    onSuccess: () => {
      // Atualizar os dados do paciente
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${id}`] });
      toast({
        title: "Unidade adicionada",
        description: "O paciente foi vinculado à unidade com sucesso.",
      });
      setIsDialogOpen(false);
      setSelectedFacilityId("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar unidade",
        description: error.message || "Ocorreu um erro ao vincular o paciente à unidade.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation para remover paciente de uma unidade
  const removeFacilityMutation = useMutation({
    mutationFn: async (facilityId: number) => {
      const response = await apiRequest(
        "DELETE", 
        `/api/patients/${id}/facilities/${facilityId}`
      );
      return response.json();
    },
    onSuccess: () => {
      // Atualizar os dados do paciente
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${id}`] });
      toast({
        title: "Unidade removida",
        description: "O paciente foi desvinculado da unidade com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover unidade",
        description: error.message || "Ocorreu um erro ao desvincular o paciente da unidade.",
        variant: "destructive",
      });
    },
  });
  
  // Filtra as unidades que o paciente ainda não está vinculado
  const availableFacilities = allFacilities?.filter(
    (facility) => !patient?.facilities?.some((f: any) => f.id === facility.id)
  );
  
  // Verificar se o usuário tem permissão para gerenciar unidades
  const canManageFacilities = user?.role === "admin" || user?.role === "coordinator";

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Detalhes do Paciente</h1>
        <p className="text-gray-600">Informações completas e histórico</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !patient ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Paciente não encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Patient Basic Info Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <AvatarInitials name={patient.fullName} className="w-32 h-32 rounded-full text-2xl" />
                  <h2 className="mt-4 text-xl font-semibold">{patient.fullName}</h2>
                  <p className="text-gray-500">{calculateAge(patient.dateOfBirth)} anos</p>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Data de Nascimento</h3>
                    <p>{formatDate(patient.dateOfBirth, "dd/MM/yyyy")}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Gênero</h3>
                    <p>{patient.gender || "Não informado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">CPF</h3>
                    <p>{patient.cpf || "Não informado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Diagnóstico</h3>
                    <p>{patient.diagnosis || "Não informado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Plano de Saúde</h3>
                    <p>{patient.insurancePlan?.name || "Não possui"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Número da Carteirinha</h3>
                    <p>{patient.insuranceNumber || "N/A"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="contact" className="mb-6">
            <TabsList>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="address">Endereço</TabsTrigger>
              <TabsTrigger value="guardian">Responsável</TabsTrigger>
              <TabsTrigger value="notes">Anotações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Telefone</h3>
                      <p>{patient.phone || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email</h3>
                      <p>{patient.email || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Contato de Emergência</h3>
                      <p>{patient.emergencyContact || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Telefone de Emergência</h3>
                      <p>{patient.emergencyPhone || "Não informado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="address">
              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Endereço Completo</h3>
                      <p>{patient.address || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Cidade</h3>
                      <p>{patient.city || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                      <p>{patient.state || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">CEP</h3>
                      <p>{patient.zipCode || "Não informado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="guardian">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Responsável</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Nome do Responsável</h3>
                      <p>{patient.guardianName || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Relação</h3>
                      <p>{patient.guardianRelationship || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Telefone do Responsável</h3>
                      <p>{patient.guardianPhone || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email do Responsável</h3>
                      <p>{patient.guardianEmail || "Não informado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Anotações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-md">
                    {patient.notes ? (
                      <div className="whitespace-pre-wrap">{patient.notes}</div>
                    ) : (
                      <p className="text-gray-500 italic">Nenhuma anotação</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Unidades */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Unidades</CardTitle>
                <CardDescription>
                  Unidades nas quais o paciente está vinculado
                </CardDescription>
              </div>
              {canManageFacilities && availableFacilities && availableFacilities.length > 0 && (
                <Button 
                  onClick={() => setIsDialogOpen(true)} 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar Unidade
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {patient.facilities && patient.facilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {patient.facilities.map((facility: any) => (
                    <div key={facility.id} className="border rounded-md p-4 relative group">
                      {canManageFacilities && patient.facilities.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFacilityMutation.mutate(facility.id)}
                          aria-label={`Remover ${facility.name}`}
                          title="Remover unidade"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                      <div className="font-medium">{facility.name}</div>
                      <div className="text-sm text-gray-500">{facility.address}</div>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs bg-primary/10">
                          {facility.city}, {facility.state}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 italic mb-4">Nenhuma unidade vinculada</p>
                  {canManageFacilities && availableFacilities && availableFacilities.length > 0 && (
                    <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Adicionar Unidade
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Diálogo para adicionar unidade */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Unidade</DialogTitle>
                <DialogDescription>
                  Selecione uma unidade para vincular a este paciente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Select 
                  value={selectedFacilityId} 
                  onValueChange={setSelectedFacilityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFacilities && availableFacilities.length > 0 ? (
                      availableFacilities.map((facility) => (
                        <SelectItem key={facility.id} value={facility.id.toString()}>
                          {facility.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no_options" disabled>
                        Não há unidades disponíveis
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedFacilityId("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => addFacilityMutation.mutate()}
                  disabled={!selectedFacilityId || addFacilityMutation.isPending}
                >
                  {addFacilityMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AppLayout>
  );
}