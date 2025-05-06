import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const auth = useAuth();
  const [location] = useLocation();

  // Efeito para verificar autenticação diretamente via API
  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      setIsVerifying(true);
      
      try {
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
        
        if (isMounted) {
          if (response.ok) {
            const data = await response.json();
            console.log("Protected Route: User verified via API", data.username);
            setUserData(data);
            setIsAuthenticated(true);
            
            // Atualizar o contexto de auth também
            if (auth && typeof auth.setUser === 'function') {
              auth.setUser(data);
            }
          } else {
            console.log("Protected Route: User not authenticated via API");
            setIsAuthenticated(false);
            setUserData(null);
          }
          setIsVerifying(false);
        }
      } catch (error) {
        console.error("Error verifying authentication:", error);
        if (isMounted) {
          setIsAuthenticated(false);
          setUserData(null);
          setIsVerifying(false);
        }
      }
    };

    verifyAuth();
    
    return () => {
      isMounted = false;
    };
  }, [location]);

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
