import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function ProfessionalDetails() {
  const { id } = useParams<{ id: string }>();
  
  const { data: professional, isLoading } = useQuery<any>({
    queryKey: [`/api/professionals/${id}`],
  });

  // Get professional type text
  const getProfessionalTypeText = (type?: string) => {
    if (!type) return "Não especificado";
    
    const typeMap: Record<string, string> = {
      psychologist: "Psicólogo(a)",
      physiotherapist: "Fisioterapeuta",
      speech_therapist: "Fonoaudiólogo(a)",
      occupational_therapist: "Terapeuta Ocupacional",
      other: "Outro",
    };
    return typeMap[type] || type;
  };

  // Get employment type text
  const getEmploymentTypeText = (type?: string) => {
    if (!type) return "Não especificado";
    
    const typeMap: Record<string, string> = {
      employee: "CLT",
      contractor: "Prestador de Serviço",
      freelancer: "Autônomo",
    };
    return typeMap[type] || type;
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Detalhes do Profissional</h1>
        <p className="text-gray-600">Informações detalhadas do profissional</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !professional ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Profissional não encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Professional Basic Info Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={professional.user?.profileImageUrl || undefined} alt={professional.user?.fullName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {professional.user?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="mt-4 text-xl font-semibold">{professional.user?.fullName}</h2>
                  <p className="text-gray-500 capitalize">
                    {professional.user?.role === "intern" ? "Estagiário" : "Profissional"}
                  </p>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Tipo de Profissional</h3>
                    <p>{getProfessionalTypeText(professional.professionalType)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Especialização</h3>
                    <p>{professional.specialization || "Não informado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Número do Registro</h3>
                    <p>{professional.licenseNumber || "Não informado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Tipo de Registro</h3>
                    <p>{professional.licenseType || "Não informado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Vínculo</h3>
                    <p>{getEmploymentTypeText(professional.employmentType)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Unidade</h3>
                    <p>{professional.user?.facility?.name || "Não informado"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="contact" className="mb-6">
            <TabsList>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="bio">Biografia</TabsTrigger>
              <TabsTrigger value="supervisor">Supervisor</TabsTrigger>
              {professional.interns && professional.interns.length > 0 && (
                <TabsTrigger value="interns">Estagiários</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Email</h3>
                      <p>{professional.user?.email || "Não informado"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Telefone</h3>
                      <p>{professional.user?.phone || "Não informado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="bio">
              <Card>
                <CardHeader>
                  <CardTitle>Biografia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-md">
                    {professional.bio ? (
                      <div className="whitespace-pre-wrap">{professional.bio}</div>
                    ) : (
                      <p className="text-gray-500 italic">Nenhuma biografia</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="supervisor">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Supervisor</CardTitle>
                </CardHeader>
                <CardContent>
                  {professional.supervisor ? (
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage 
                          src={professional.supervisor.user?.profileImageUrl || undefined} 
                          alt={professional.supervisor.user?.fullName} 
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {professional.supervisor.user?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{professional.supervisor.user?.fullName}</div>
                        <div className="text-sm text-gray-500">
                          {getProfessionalTypeText(professional.supervisor.professionalType)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">
                      {professional.user?.role === "intern" ? "Nenhum supervisor atribuído" : "Não aplicável"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {professional.interns && professional.interns.length > 0 && (
              <TabsContent value="interns">
                <Card>
                  <CardHeader>
                    <CardTitle>Estagiários Supervisionados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {professional.interns.map((intern: any) => (
                        <div key={intern.id} className="border rounded-md p-4 flex items-center gap-3">
                          <Avatar>
                            <AvatarImage 
                              src={intern.user?.profileImageUrl || undefined} 
                              alt={intern.user?.fullName} 
                            />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {intern.user?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{intern.user?.fullName}</div>
                            <div className="text-sm text-gray-500">
                              {getProfessionalTypeText(intern.professionalType)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </AppLayout>
  );
}