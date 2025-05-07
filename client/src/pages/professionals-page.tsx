import { useState } from "react";
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
import { Loader2, Search, UserPlus, Eye, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Professional form schema
const professionalSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  role: z.enum(["admin", "coordinator", "professional", "intern", "secretary"]),
  facilityId: z.string().min(1, "Unidade é obrigatória"),
  professionalType: z.string().min(1, "Tipo profissional é obrigatório"),
  licenseNumber: z.string().optional(),
  licenseType: z.string().optional(),
  specialization: z.string().optional(),
  employmentType: z.string().min(1, "Tipo de vínculo é obrigatório"),
  hourlyRate: z.string().optional(),
  supervisorId: z.string().optional(),
  bio: z.string().optional(),
});

type ProfessionalFormValues = z.infer<typeof professionalSchema>;

export default function ProfessionalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isProfessionalFormOpen, setIsProfessionalFormOpen] = useState(false);
  
  // Check if user can create professionals
  const canCreateProfessionals = user?.role === "admin";

  // Fetch professionals
  const { data: professionals, isLoading } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
  });

  // Fetch facilities for form
  const { data: facilities } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });

  // Create professional form
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      role: "professional",
      facilityId: "",
      professionalType: "",
      licenseNumber: "",
      licenseType: "",
      specialization: "",
      employmentType: "employee",
      hourlyRate: "",
      supervisorId: "",
      bio: "",
    },
  });

  // Create professional mutation
  const createProfessionalMutation = useMutation({
    mutationFn: async (values: ProfessionalFormValues) => {
      // Format data for API
      const formattedValues = {
        ...values,
        facilityId: parseInt(values.facilityId),
        hourlyRate: values.hourlyRate ? parseInt(values.hourlyRate) : undefined,
        supervisorId: values.supervisorId ? parseInt(values.supervisorId) : undefined,
      };
      
      const res = await apiRequest("POST", "/api/professionals", formattedValues);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profissional criado",
        description: "O profissional foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      setIsProfessionalFormOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar profissional",
        description: error.message || "Ocorreu um erro ao criar o profissional. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ProfessionalFormValues) => {
    createProfessionalMutation.mutate(data);
  };

  // Filter professionals by search term
  const filteredProfessionals = professionals?.filter(
    (professional) =>
      professional.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get professional type text
  const getProfessionalTypeText = (type: string) => {
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
  const getEmploymentTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      employee: "CLT",
      contractor: "Prestador de Serviço",
      freelancer: "Autônomo",
    };
    return typeMap[type] || type;
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Profissionais</h1>
          <p className="text-gray-600">Gerencie a equipe de profissionais da clínica</p>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar profissionais..."
              className="pl-8 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canCreateProfessionals && (
            <Button onClick={() => setIsProfessionalFormOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Profissional
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
          ) : !filteredProfessionals || filteredProfessionals.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">Nenhum profissional encontrado</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-2">
                  Tente ajustar sua busca ou{" "}
                  {canCreateProfessionals && (
                    <button
                      onClick={() => setIsProfessionalFormOpen(true)}
                      className="text-primary hover:underline"
                    >
                      cadastre um novo profissional
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
                    <TableHead>Profissional</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Especialização</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfessionals.map((professional) => (
                    <TableRow key={professional.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage 
                              src={professional.user.profileImageUrl || undefined} 
                              alt={professional.user.fullName} 
                            />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {professional.user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{professional.user.fullName}</div>
                            <div className="text-xs text-gray-500 capitalize">
                              {professional.user.role === "intern" ? "Estagiário" : "Profissional"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getProfessionalTypeText(professional.professionalType)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={professional.specialization}>
                        {professional.specialization || "---"}
                      </TableCell>
                      <TableCell>{getEmploymentTypeText(professional.employmentType)}</TableCell>
                      <TableCell>
                        {professional.user.facility?.name || "---"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {professional.user.email && (
                            <div className="text-xs">{professional.user.email}</div>
                          )}
                          {professional.user.phone && (
                            <div className="text-xs text-gray-500">{professional.user.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="icon" variant="ghost" asChild>
                            <Link href={`/profissionais/${professional.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {professional.interns?.length > 0 && (
                            <Button size="icon" variant="ghost" asChild>
                              <Link href={`/profissionais/${professional.id}#estagiarios`}>
                                <Users className="h-4 w-4" />
                              </Link>
                            </Button>
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

      {/* New Professional Dialog */}
      <Dialog open={isProfessionalFormOpen} onOpenChange={setIsProfessionalFormOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Profissional</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Account Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500">Informações da Conta</h3>
                  
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome de usuário para login" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha*</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Usuário*</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {user?.role === "admin" && (
                              <>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="coordinator">Coordenador</SelectItem>
                              </>
                            )}
                            <SelectItem value="professional">Profissional</SelectItem>
                            <SelectItem value="intern">Estagiário</SelectItem>
                            <SelectItem value="secretary">Secretário(a)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="facilityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade*</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a unidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {facilities?.map((facility) => (
                              <SelectItem key={facility.id} value={facility.id.toString()}>
                                {facility.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500">Informações Pessoais</h3>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo do profissional" {...field} />
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
                        <FormLabel>Email*</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email do profissional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="Telefone do profissional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Professional Info */}
              <div className="pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Informações Profissionais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="professionalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Profissional*</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="psychologist">Psicólogo(a)</SelectItem>
                            <SelectItem value="physiotherapist">Fisioterapeuta</SelectItem>
                            <SelectItem value="speech_therapist">Fonoaudiólogo(a)</SelectItem>
                            <SelectItem value="occupational_therapist">Terapeuta Ocupacional</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialização</FormLabel>
                        <FormControl>
                          <Input placeholder="Área de especialização" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="licenseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Registro</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: CRP, CREFITO, CRFa" {...field} />
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
                        <FormLabel>Número de Registro</FormLabel>
                        <FormControl>
                          <Input placeholder="Número do registro profissional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Employment and Supervision Info */}
              <div className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Vínculo</h3>
                    <FormField
                      control={form.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Vínculo*</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de vínculo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="employee">CLT</SelectItem>
                              <SelectItem value="contractor">Prestador de Serviço</SelectItem>
                              <SelectItem value="freelancer">Autônomo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {(form.watch('employmentType') === 'contractor' || form.watch('employmentType') === 'freelancer') && (
                      <FormField
                        control={form.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Valor por Hora (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Valor por hora" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  
                  {form.watch('role') === 'intern' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-4">Supervisão</h3>
                      <FormField
                        control={form.control}
                        name="supervisorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supervisor</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o supervisor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {professionals
                                  ?.filter(p => p.user.role === 'professional')
                                  .map((professional) => (
                                    <SelectItem key={professional.id} value={professional.id.toString()}>
                                      {professional.user.fullName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bio */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Input placeholder="Breve descrição profissional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-6 border-t mt-6">
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsProfessionalFormOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createProfessionalMutation.isPending}>
                    {createProfessionalMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Concluir Cadastro"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
