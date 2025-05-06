import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Phone, Mail, Building2 } from "lucide-react";

export default function FacilityDetails() {
  const { id } = useParams<{ id: string }>();
  
  const { data: facility, isLoading } = useQuery<any>({
    queryKey: [`/api/facilities/${id}`],
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Detalhes da Unidade</h1>
        <p className="text-gray-600">Informações detalhadas da unidade clínica</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !facility ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Unidade não encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Facility Basic Info Card */}
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <CardTitle>{facility.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Endereço</h3>
                      <p className="text-gray-600">{facility.address}</p>
                      <p className="text-gray-600">{facility.city}, {facility.state}</p>
                      <p className="text-gray-600">{facility.zipCode}</p>
                    </div>
                  </div>
                  
                  {facility.phone && (
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Telefone</h3>
                        <p className="text-gray-600">{facility.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {facility.email && (
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Email</h3>
                        <p className="text-gray-600">{facility.email}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {facility.cnpj && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">CNPJ</h3>
                      <p className="text-gray-600">{facility.cnpj}</p>
                    </div>
                  )}
                  
                  {facility.licenseNumber && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Número da Licença/Alvará</h3>
                      <p className="text-gray-600">{facility.licenseNumber}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Salas</h3>
                    <p className="text-gray-600">
                      {facility.rooms?.length || 0} salas cadastradas
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="rooms" className="mb-6">
            <TabsList>
              <TabsTrigger value="rooms">Salas</TabsTrigger>
              <TabsTrigger value="professionals">Profissionais</TabsTrigger>
            </TabsList>
            
            <TabsContent value="rooms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5" />
                    Salas da Unidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {facility.rooms && facility.rooms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {facility.rooms.map((room: any) => (
                        <div key={room.id} className="border rounded-md p-4">
                          <div className="font-medium">{room.name}</div>
                          <div className="text-sm text-gray-500">
                            {room.type || "Sala Padrão"}
                          </div>
                          <div className="text-sm text-gray-500">
                            Capacidade: {room.capacity || "Não especificada"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Nenhuma sala cadastrada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="professionals">
              <Card>
                <CardHeader>
                  <CardTitle>Profissionais da Unidade</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* We'd need to fetch professionals by facility here */}
                  <div className="text-center py-4">
                    <p className="text-gray-500">Dados de profissionais não disponíveis</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </AppLayout>
  );
}