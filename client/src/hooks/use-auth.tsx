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
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Tentando fazer login com:", credentials);
      try {
        const res = await apiRequest("POST", "/api/login", credentials);
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
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a), ${user.fullName}!`,
        variant: "default",
      });
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
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Cadastro realizado com sucesso",
        description: `Bem-vindo(a), ${user.fullName}!`,
        variant: "default",
      });
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

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
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
