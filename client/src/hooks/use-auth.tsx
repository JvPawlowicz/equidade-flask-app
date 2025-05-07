import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, loginUserSchema, insertUserSchema, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// WebSocket temporariamente desativado até corrigirmos o login
// import webSocketManager from "../lib/websocket";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  setUser: (user: User | null) => void;
};

type LoginData = {
  username: string;
  password: string;
};

// Definindo um contexto padrão para evitar nulos
const defaultMutation = {
  mutate: () => {},
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  data: null,
  status: 'idle',
  reset: () => {},
  variables: null,
  failureCount: 0,
  failureReason: null,
  // Outros métodos e propriedades
} as any;

const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  loginMutation: defaultMutation as UseMutationResult<User, Error, LoginData>,
  logoutMutation: defaultMutation as UseMutationResult<void, Error, void>,
  registerMutation: defaultMutation as UseMutationResult<User, Error, InsertUser>,
  setUser: () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: true,
    refetchOnMount: true,
    staleTime: 0, // Sempre considerar os dados como obsoletos para garantir refetch
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Limpar espaços extras
      const cleanedCredentials = {
        username: credentials.username.trim(),
        password: credentials.password
      };
      
      console.log("Tentando fazer login com:", cleanedCredentials);
      try {
        const res = await apiRequest("POST", "/api/login", cleanedCredentials, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
        const userData = await res.json();
        console.log("Resposta do login:", userData);
        return userData;
      } catch (error) {
        console.error("Erro ao chamar API de login:", error);
        throw error;
      }
    },
    onSuccess: (user: User) => {
      console.log("Login bem-sucedido, usuário:", user);
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Recarregar os dados do usuário explicitamente
      refetchUser();
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${user.fullName}!`,
        variant: "default",
      });
      
      // Redirecionar para o dashboard após um pequeno atraso para dar tempo ao servidor
      // de estabelecer a sessão completamente
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    },
    onError: (error: Error) => {
      console.error("Erro no login:", error);
      toast({
        title: "Falha no login",
        description: error.message || "Credenciais inválidas. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      // Limpar espaços extras dos campos
      const cleanedUserData = {
        ...userData,
        username: userData.username.trim(),
        email: userData.email.trim(),
        fullName: userData.fullName.trim(),
        phone: userData.phone?.trim()
      };
      
      console.log("Tentando registrar usuário:", cleanedUserData);
      const res = await apiRequest("POST", "/api/register", cleanedUserData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Recarregar os dados do usuário explicitamente
      refetchUser();
      
      toast({
        title: "Cadastro realizado com sucesso",
        description: `Bem-vindo(a), ${user.fullName}!`,
        variant: "default",
      });
      
      // Redirecionar para o dashboard após um pequeno atraso para dar tempo ao servidor
      // de estabelecer a sessão completamente
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no cadastro",
        description: error.message || "Não foi possível realizar o cadastro. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado da sua conta.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message || "Não foi possível desconectar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Gerenciar a conexão WebSocket com base no estado de autenticação
  useEffect(() => {
    // Atualmente o WebSocket está temporariamente desativado enquanto consertamos o login
    // O código comentado será reativado quando o login estiver estável
    /*
    if (user) {
      console.log("Usuário autenticado, iniciando WebSocket");
      webSocketManager.connect(user);
    } else {
      console.log("Usuário não autenticado, desconectando WebSocket");
      webSocketManager.disconnect();
    }

    return () => {
      // Desconectar durante o cleanup do componente
      webSocketManager.disconnect();
    };
    */
  }, [user]);

  // Função para atualizar o usuário diretamente
  const setUser = (newUser: User | null) => {
    console.log("Atualizando usuário via setUser:", newUser);
    queryClient.setQueryData(["/api/user"], newUser);
    // Também forçamos um refetch para garantir consistência
    if (newUser) {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}
