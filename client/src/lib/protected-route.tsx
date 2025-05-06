import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const auth = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  // Efeito para verificar autenticação diretamente via API
  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      if (!isMounted) return;
      
      setIsVerifying(true);
      
      try {
        // Primeiro, verifique se já temos um usuário no contexto de autenticação
        if (auth.user) {
          console.log("Protected Route: User already in auth context", auth.user.username);
          setIsAuthenticated(true);
          setIsVerifying(false);
          return;
        }
        
        // Verificar se o usuário está autenticado com cache-busting
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/user?_=${timestamp}`, { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          console.log("Protected Route: User verified via API", data.username);
          setIsAuthenticated(true);
          
          // Atualizar o contexto de auth
          if (auth && typeof auth.setUser === 'function') {
            auth.setUser(data);
          }
          
          // Atualizar o cache do queryClient
          queryClient.setQueryData(['/api/user'], data);
        } else {
          console.log("Protected Route: User not authenticated via API");
          setIsAuthenticated(false);
          
          // Limpar o contexto de auth
          if (auth && typeof auth.setUser === 'function') {
            auth.setUser(null);
          }
          
          // Limpar o cache do queryClient
          queryClient.setQueryData(['/api/user'], null);
          
          // Informar o usuário que ele precisa fazer login
          toast({
            title: "Sessão expirada",
            description: "Por favor, faça login novamente para continuar.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error verifying authentication:", error);
        if (isMounted) {
          setIsAuthenticated(false);
          
          // Limpar o contexto de auth em caso de erro
          if (auth && typeof auth.setUser === 'function') {
            auth.setUser(null);
          }
          
          // Limpar o cache do queryClient
          queryClient.setQueryData(['/api/user'], null);
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    };

    verifyAuth();
    
    return () => {
      isMounted = false;
    };
  }, [location, auth.user, auth, toast]);

  // Renderizar o Route com verificação direta à API
  return (
    <Route path={path}>
      {(params) => {
        if (isVerifying) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 mt-4">Verificando autenticação...</span>
            </div>
          );
        }
        
        if (!isAuthenticated) {
          console.log("Protected Route: Redirecting to auth page");
          return <Redirect to="/auth" />;
        }
        
        // Se o usuário está autenticado, renderize o componente com os parâmetros da rota
        return <Component {...params} />;
      }}
    </Route>
  );
}
