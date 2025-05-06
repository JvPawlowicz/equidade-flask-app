import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { formatDate, calculateAge } from "@/lib/utils";
import { AvatarInitials } from "@/components/common/avatar-initials";

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  
  const { data: patient, isLoading } = useQuery<any>({
    queryKey: [`/api/patients/${id}`],
  });

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
            <CardHeader>
              <CardTitle>Unidades</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.facilities && patient.facilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {patient.facilities.map((facility: any) => (
                    <div key={facility.id} className="border rounded-md p-4">
                      <div className="font-medium">{facility.name}</div>
                      <div className="text-sm text-gray-500">{facility.address}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhuma unidade vinculada</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}