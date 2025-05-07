import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFacility } from "@/hooks/use-facility";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Search, UserPlus, Eye, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { calculateAge, formatDate } from "@/lib/utils";

// Patient form schema
const patientSchema = z.object({
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  dateOfBirth: z.string().min(1, "Data de nascimento é obrigatória"),
  gender: z.string().optional(),
  cpf: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  guardianRelationship: z.string().optional(),
  insurancePlanId: z.string().optional(),
  insuranceNumber: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  facilityIds: z.array(z.string()).min(1, "Selecione pelo menos uma unidade"),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export default function PatientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedFacilityId } = useFacility();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  
  // Check if user can create patients
  const canCreatePatients = ["admin", "coordinator"].includes(user?.role || "");

  // Fetch patients
  const { data: patients, isLoading } = useQuery<any[]>({
    queryKey: ['/api/patients', searchTerm, selectedFacilityId, isPatientFormOpen],
    enabled: !isPatientFormOpen, // Não buscar pacientes quando o formulário estiver aberto
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (selectedFacilityId !== null) {
        params.append('facilityId', selectedFacilityId.toString());
      }
      
      const queryString = params.toString();
      const url = `/api/patients${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao buscar pacientes');
      }
      return response.json();
    }
  });

  // Fetch facilities for form
  const { data: facilities } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });

  // Fetch insurance plans for form
  const { data: insurancePlans } = useQuery<any[]>({
    queryKey: ["/api/insurance-plans"],
  });

  // Create patient form
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      gender: "",
      cpf: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      emergencyContact: "",
      emergencyPhone: "",
      guardianName: "",
      guardianPhone: "",
      guardianEmail: "",
      guardianRelationship: "",
      insurancePlanId: "",
      insuranceNumber: "",
      diagnosis: "",
      notes: "",
      facilityIds: [],
    },
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      // Format data for API
      const formattedValues = {
        ...values,
        dateOfBirth: new Date(values.dateOfBirth).toISOString(),
        insurancePlanId: values.insurancePlanId ? parseInt(values.insurancePlanId) : undefined,
      };
      
      const res = await apiRequest("POST", "/api/patients", formattedValues);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Paciente criado",
        description: "O paciente foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', searchTerm, selectedFacilityId] });
      setIsPatientFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar paciente",
        description: error.message || "Ocorreu um erro ao criar o paciente. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Efeito para atualizar a lista quando a unidade selecionada mudar
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/patients', searchTerm, selectedFacilityId] });
  }, [selectedFacilityId, searchTerm]);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    queryClient.invalidateQueries({ queryKey: ['/api/patients', searchTerm, selectedFacilityId] });
  };

  // Handle form submission
  const onSubmit = (data: PatientFormValues) => {
    createPatientMutation.mutate(data);
  };

  return (
    <AppLayout onSearch={setSearchTerm}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Pacientes</h1>
          <p className="text-gray-600">Gerencie os pacientes da clínica</p>
        </div>
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar pacientes..."
              className="pl-8 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          {canCreatePatients && (
            <Button onClick={() => setIsPatientFormOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Paciente
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
          ) : !patients || patients.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Nenhum paciente encontrado</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-2">
                  Tente ajustar sua busca ou{" "}
                  {canCreatePatients && (
                    <button
                      onClick={() => setIsPatientFormOpen(true)}
                      className="text-primary hover:underline"
                    >
                      cadastre um novo paciente
                    </button>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Plano de Saúde</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <AvatarInitials 
                            name={patient.fullName} 
                            className="w-10 h-10 rounded-full flex-shrink-0" 
                          />
                          <div>
                            <div className="font-medium">{patient.fullName}</div>
                            <div className="text-xs text-gray-500">
                              {formatDate(patient.dateOfBirth, "dd/MM/yyyy")}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{calculateAge(patient.dateOfBirth)} anos</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={patient.diagnosis}>
                        {patient.diagnosis || "---"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.phone && (
                            <div className="text-sm">{patient.phone}</div>
                          )}
                          {patient.email && (
                            <div className="text-xs text-gray-500">{patient.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.insurancePlan ? patient.insurancePlan.name : "---"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="icon" variant="ghost" asChild>
                            <Link href={`/pacientes/${patient.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" asChild>
                            <Link href={`/agenda?patientId=${patient.id}`}>
                              <Calendar className="h-4 w-4" />
                            </Link>
                          </Button>
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

      {/* New Patient Dialog */}
      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500">Informações Básicas</h3>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo do paciente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento*</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o gênero" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Masculino">Masculino</SelectItem>
                            <SelectItem value="Feminino">Feminino</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input placeholder="CPF do paciente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnóstico</FormLabel>
                        <FormControl>
                          <Input placeholder="Diagnóstico principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500">Informações de Contato</h3>
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="Telefone do paciente" {...field} />
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
                          <Input type="email" placeholder="Email do paciente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Endereço completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
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
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="Estado" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              {/* Guardian Info */}
              <div className="pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Responsável</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Responsável</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="guardianPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone do Responsável</FormLabel>
                        <FormControl>
                          <Input placeholder="Telefone do responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="guardianEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email do Responsável</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email do responsável" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="guardianRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relação</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a relação" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Mãe">Mãe</SelectItem>
                            <SelectItem value="Pai">Pai</SelectItem>
                            <SelectItem value="Avó">Avó</SelectItem>
                            <SelectItem value="Avô">Avô</SelectItem>
                            <SelectItem value="Tio">Tio</SelectItem>
                            <SelectItem value="Tia">Tia</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Insurance and Facilities */}
              <div className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Plano de Saúde</h3>
                    <FormField
                      control={form.control}
                      name="insurancePlanId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plano</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o plano" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="no_plan">Sem plano</SelectItem>
                              {insurancePlans?.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id.toString()}>
                                  {plan.name} - {plan.provider}
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
                      name="insuranceNumber"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Número da Carteirinha</FormLabel>
                          <FormControl>
                            <Input placeholder="Número da carteirinha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Unidades*</h3>
                    <FormField
                      control={form.control}
                      name="facilityIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidades de Atendimento</FormLabel>
                          <div className="border rounded-md max-h-60 overflow-y-auto p-2">
                            {facilities?.map((facility) => (
                              <div key={facility.id} className="flex items-center space-x-2 py-2">
                                <input
                                  type="checkbox"
                                  id={`facility-${facility.id}`}
                                  value={facility.id}
                                  checked={field.value.includes(facility.id.toString())}
                                  onChange={(e) => {
                                    const value = facility.id.toString();
                                    const newValue = e.target.checked
                                      ? [...field.value, value]
                                      : field.value.filter((val) => val !== value);
                                    field.onChange(newValue);
                                  }}
                                  className="rounded"
                                />
                                <label
                                  htmlFor={`facility-${facility.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {facility.name}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input placeholder="Observações adicionais" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPatientFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPatientMutation.isPending}>
                  {createPatientMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Cadastrar Paciente"
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
