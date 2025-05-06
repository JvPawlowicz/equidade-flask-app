import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Building2, MapPin, Users, DoorOpen, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Facility form schema
const facilitySchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  state: z.string().min(2, "Estado deve ter pelo menos 2 caracteres"),
  zipCode: z.string().min(5, "CEP deve ter pelo menos 5 caracteres"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cnpj: z.string().optional(),
  licenseNumber: z.string().optional(),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

export default function FacilitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFacilityFormOpen, setIsFacilityFormOpen] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Fetch facilities
  const { data: facilities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });

  // Create facility form
  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      cnpj: "",
      licenseNumber: "",
    },
  });

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: async (values: FacilityFormValues) => {
      const res = await apiRequest("POST", "/api/facilities", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Unidade criada",
        description: "A unidade foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      setIsFacilityFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar unidade",
        description: error.message || "Ocorreu um erro ao criar a unidade. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: FacilityFormValues) => {
    createFacilityMutation.mutate(data);
  };

  // Filter facilities by search term
  const filteredFacilities = facilities?.filter(
    (facility) =>
      facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Unidades</h1>
          <p className="text-gray-600">Gerencie as unidades clínicas</p>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-xs">
            <Input
              type="search"
              placeholder="Buscar unidades..."
              className="w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Button onClick={() => setIsFacilityFormOpen(true)}>
              <Building2 className="mr-2 h-4 w-4" />
              Nova Unidade
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !filteredFacilities || filteredFacilities.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">Nenhuma unidade encontrada</p>
          {searchTerm && (
            <p className="text-sm text-gray-400 mt-2">
              Tente ajustar sua busca ou{" "}
              {isAdmin && (
                <button
                  onClick={() => setIsFacilityFormOpen(true)}
                  className="text-primary hover:underline"
                >
                  cadastre uma nova unidade
                </button>
              )}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility) => (
            <Card key={facility.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>{facility.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div>{facility.address}</div>
                      <div className="text-gray-500">{facility.city}, {facility.state}</div>
                      <div className="text-gray-500">{facility.zipCode}</div>
                    </div>
                  </div>
                  
                  {facility.phone && (
                    <div className="flex items-center">
                      <div className="h-5 w-5 mr-2 flex items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      </div>
                      <span className="text-sm">{facility.phone}</span>
                    </div>
                  )}
                  
                  {facility.email && (
                    <div className="flex items-center">
                      <div className="h-5 w-5 mr-2 flex items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      </div>
                      <span className="text-sm">{facility.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-3 border-t">
                <div className="flex items-center text-sm text-gray-500">
                  <DoorOpen className="h-4 w-4 mr-1" />
                  <span>{facility.rooms?.length || 0} salas</span>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/unidades/${facility.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    Detalhes
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* New Facility Dialog */}
      <Dialog open={isFacilityFormOpen} onOpenChange={setIsFacilityFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Unidade</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-4">
                <h3 className="text-sm font-medium text-gray-500">Informações Básicas</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Unidade*</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da unidade clínica" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="CNPJ da unidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Licença/Alvará</FormLabel>
                      <FormControl>
                        <Input placeholder="Número da licença ou alvará" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Contact Info */}
              <div className="grid grid-cols-1 gap-4 pt-4">
                <h3 className="text-sm font-medium text-gray-500">Contato</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="Telefone da unidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email da unidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Address */}
              <div className="grid grid-cols-1 gap-4 pt-4">
                <h3 className="text-sm font-medium text-gray-500">Endereço</h3>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço*</FormLabel>
                      <FormControl>
                        <Input placeholder="Endereço completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade*</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado*</FormLabel>
                        <FormControl>
                          <Input placeholder="Estado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP*</FormLabel>
                      <FormControl>
                        <Input placeholder="CEP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFacilityFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createFacilityMutation.isPending}>
                  {createFacilityMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Cadastrar Unidade"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
