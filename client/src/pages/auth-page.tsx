import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogIn, UserPlus } from "lucide-react";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  facilityId: z.number().optional(),
  role: z.enum(["admin", "coordinator", "professional", "intern", "secretary"], {
    errorMap: () => ({ message: "Papel inválido" }),
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phone: "",
      role: "professional",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    // Limpar espaços extras dos campos
    const cleanedData = {
      username: data.username.trim(),
      password: data.password
    };
    
    console.log("Tentando fazer login com:", cleanedData);
    
    try {
      // Fazer login diretamente sem usar a mutação
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Credenciais inválidas');
      }
      
      const userData = await response.json();
      console.log('Login bem-sucedido:', userData);
      
      // Atualizar manualmente o cache do query client
      queryClient.setQueryData(['/api/user'], userData);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Mostrar toast de sucesso
      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vindo(a), ${userData.fullName}!`,
      });
      
      // Redirecionar para a interface React
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast({
        title: 'Falha no login',
        description: error.message || 'Credenciais inválidas. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Limpar espaços extras dos campos
    const cleanedData = {
      ...data,
      username: data.username.trim(),
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      phone: data.phone?.trim()
    };
    
    console.log("Tentando registrar:", cleanedData);
    
    try {
      // Fazer registro diretamente sem usar a mutação
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Falha no registro');
      }
      
      const userData = await response.json();
      console.log('Registro bem-sucedido:', userData);
      
      // Atualizar manualmente o cache do query client
      queryClient.setQueryData(['/api/user'], userData);
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Mostrar toast de sucesso
      toast({
        title: 'Registro realizado com sucesso',
        description: `Bem-vindo(a), ${userData.fullName}!`,
      });
      
      // Redirecionar para a interface React
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error: any) {
      console.error('Erro no registro:', error);
      toast({
        title: 'Falha no registro',
        description: error.message || 'Não foi possível completar o registro. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Hero Section */}
      <div className="text-white lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center" style={{ backgroundColor: '#1A2B40' }}>
        <div className="max-w-lg mx-auto">
          <img 
            src="/assets/images/logo-equidade-plus.svg" 
            alt="Equidade+" 
            className="h-16 mb-6"
            aria-hidden="true"
          />
          <h1 className="text-2xl lg:text-3xl font-bold mb-4 text-white flex items-center">
            Equidade<span className="text-blue-400">+</span>
          </h1>
          <p className="text-xl lg:text-2xl font-medium mb-4 text-white">
            Gerenciamento de Clínicas Multi e Interdisciplinares
          </p>
          <p className="text-white/90 mb-8 text-base">
            Uma plataforma completa para gerenciamento de clínicas, agendamentos, prontuários 
            e evolução de pacientes. Desenvolvida especialmente para clínicas 
            interdisciplinares de atendimento a pessoas com deficiência.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-white/10 p-5 rounded-lg border border-white/20 shadow-md hover:shadow-lg transition-all duration-300">
              <h3 className="font-semibold mb-2 text-white text-base">Agendamento Simplificado</h3>
              <p className="text-white/95">
                Agende e gerencie consultas com facilidade, visualizando por dia, semana ou mês.
              </p>
            </div>
            <div className="bg-white/10 p-5 rounded-lg border border-white/20 shadow-md hover:shadow-lg transition-all duration-300">
              <h3 className="font-semibold mb-2 text-white text-base">Prontuários Integrados</h3>
              <p className="text-white/95">
                Registre e acompanhe o histórico de atendimentos e evoluções dos pacientes.
              </p>
            </div>
            <div className="bg-white/10 p-5 rounded-lg border border-white/20 shadow-md hover:shadow-lg transition-all duration-300">
              <h3 className="font-semibold mb-2 text-white text-base">Equipe Multidisciplinar</h3>
              <p className="text-white/95">
                Colaboração entre diferentes profissionais com acesso adaptado às funções.
              </p>
            </div>
            <div className="bg-white/10 p-5 rounded-lg border border-white/20 shadow-md hover:shadow-lg transition-all duration-300">
              <h3 className="font-semibold mb-2 text-white text-base">Supervisão de Estagiários</h3>
              <p className="text-white/95">
                Supervisione evoluções de estagiários com sistema de aprovação integrado.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Forms */}
      <div className="lg:w-1/2 p-8 flex items-center justify-center" style={{ backgroundColor: '#f5f8fa' }}>
        <Card className="w-full max-w-md shadow-xl border-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 p-1">
              <TabsTrigger value="login" className="text-base">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-base">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-primary" />
                  <CardTitle>Entrar no Sistema</CardTitle>
                </div>
                <CardDescription>
                  Entre com suas credenciais para acessar sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite seu nome de usuário" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Digite sua senha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                      disabled={loginForm.formState.isSubmitting}
                    >
                      {loginForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-4 w-4" />
                          Entrar
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button variant="link" onClick={() => setActiveTab("register")}>
                  Não tem uma conta? Cadastre-se
                </Button>
              </CardFooter>
            </TabsContent>
            
            <TabsContent value="register">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <CardTitle>Criar Conta</CardTitle>
                </div>
                <CardDescription>
                  Cadastre-se para acessar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite um nome de usuário" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite seu nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Digite seu email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite seu telefone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Digite uma senha" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Conta</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="professional">Profissional</option>
                              <option value="intern">Estagiário</option>
                              <option value="secretary">Secretário(a)</option>
                              <option value="coordinator">Coordenador</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                      disabled={registerForm.formState.isSubmitting}
                    >
                      {registerForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Cadastrar
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button variant="link" onClick={() => setActiveTab("login")}>
                  Já tem uma conta? Faça login
                </Button>
              </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      {/* Copyright */}
      <div className="absolute bottom-2 right-4 text-xs text-gray-500">
        © {new Date().getFullYear()} Todos os direitos reservados - João Victor Gonzalez Pawlowicz - JVGP
      </div>
    </div>
  );
}