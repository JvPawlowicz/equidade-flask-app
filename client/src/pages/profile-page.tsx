import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import AppLayout from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { convertToBase64 } from "@/lib/utils";

const profileSchema = z.object({
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  cpf: z
    .string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF deve ter no máximo 14 caracteres")
    .optional()
    .nullable(),
  birthDate: z.string().optional().nullable(),
  professionalCouncil: z.string().optional().nullable(),
  professionalCouncilNumber: z.string().optional().nullable(),
  profileImage: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Obter detalhes do profissional se o usuário for um profissional
  const { data: professionalData, isLoading: isLoadingProfessional } = useQuery({
    queryKey: ["/api/professionals/me"],
    enabled: !!user,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      cpf: "",
      birthDate: "",
      professionalCouncil: "",
      professionalCouncilNumber: "",
      profileImage: user?.profileImage || "",
    },
  });

  // Atualizar formulário quando os dados do profissional são carregados
  useEffect(() => {
    if (user) {
      form.setValue("fullName", user.fullName || "");
      form.setValue("profileImage", user.profileImage || "");
    }

    if (professionalData) {
      form.setValue("cpf", professionalData.cpf || "");
      
      if (professionalData.birthDate) {
        // Converter a data para o formato do formulário
        const dateObj = new Date(professionalData.birthDate);
        const formattedDate = format(dateObj, "yyyy-MM-dd");
        form.setValue("birthDate", formattedDate);
      }
      
      form.setValue("professionalCouncil", professionalData.professionalCouncil || "");
      form.setValue("professionalCouncilNumber", professionalData.professionalCouncilNumber || "");
    }

    // Atualizar a imagem de perfil
    setProfileImage(user?.profileImage || null);
  }, [user, professionalData, form]);

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // Primeiro atualizamos os dados básicos do usuário
      const userResponse = await apiRequest("PUT", "/api/users/profile", {
        fullName: data.fullName,
        profileImage: data.profileImage,
      });

      if (!userResponse.ok) {
        throw new Error("Erro ao atualizar dados básicos do perfil");
      }

      // Se o usuário for um profissional, atualizamos os dados profissionais também
      if (professionalData) {
        let birthDateFormatted = null;
        if (data.birthDate) {
          try {
            birthDateFormatted = data.birthDate;
          } catch (error) {
            console.error("Erro ao formatar data de nascimento:", error);
          }
        }

        const professionalResponse = await apiRequest("PUT", "/api/professionals/me", {
          cpf: data.cpf,
          birthDate: birthDateFormatted,
          professionalCouncil: data.professionalCouncil,
          professionalCouncilNumber: data.professionalCouncilNumber,
        });

        if (!professionalResponse.ok) {
          throw new Error("Erro ao atualizar dados profissionais");
        }
      }

      // Obter os dados atualizados do usuário
      const updatedUserResponse = await apiRequest("GET", "/api/user");
      if (!updatedUserResponse.ok) {
        throw new Error("Erro ao obter dados atualizados do usuário");
      }

      return await updatedUserResponse.json();
    },
    onSuccess: (updatedUser) => {
      // Atualizar o usuário no contexto de autenticação
      setUser(updatedUser);
      
      // Invalidar queries relacionadas ao usuário e profissional
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals/me"] });
      
      toast({
        title: "Perfil atualizado",
        description: "Seus dados foram atualizados com sucesso",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler para upload de imagem
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Converter a imagem para base64
      const base64Image = await convertToBase64(file);
      setProfileImage(base64Image as string);
      form.setValue("profileImage", base64Image as string);
      
      toast({
        title: "Imagem carregada",
        description: "A imagem será salva quando você atualizar o perfil",
        variant: "success",
      });
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar a imagem",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Submit do formulário
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Função para obter iniciais do nome para o avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Loader enquanto os dados estão sendo carregados
  if (isLoadingProfessional) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Meu Perfil</h1>
        <p className="text-gray-600">
          Visualize e edite suas informações pessoais
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cartão de perfil com avatar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Foto de Perfil</CardTitle>
            <CardDescription>
              Adicione uma foto para personalizar seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative mb-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profileImage || ""} alt={user?.fullName || "Usuário"} />
                <AvatarFallback className="text-2xl">
                  {user?.fullName ? getInitials(user.fullName) : "??"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute right-0 bottom-0">
                <label
                  htmlFor="profile-image"
                  className="cursor-pointer bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </label>
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-medium text-lg">{user?.fullName || "Usuário"}</h3>
              <p className="text-gray-500 text-sm">
                {user?.role === "admin"
                  ? "Administrador"
                  : user?.role === "coordinator"
                  ? "Coordenador"
                  : user?.role === "professional"
                  ? "Profissional"
                  : user?.role === "intern"
                  ? "Estagiário"
                  : "Secretário"}
              </p>
              <p className="text-gray-500 text-sm mt-1">{user?.username}</p>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de dados pessoais */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize seus dados cadastrais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome completo" {...field} />
                      </FormControl>
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
                        <Input placeholder="Seu CPF" {...field} />
                      </FormControl>
                      <FormDescription>
                        Digite apenas números ou no formato 000.000.000-00
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="professionalCouncil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conselho Profissional</FormLabel>
                        <FormControl>
                          <Input placeholder="CRM, CREFITO, CRP, etc" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionalCouncilNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do Conselho</FormLabel>
                        <FormControl>
                          <Input placeholder="Número do registro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}