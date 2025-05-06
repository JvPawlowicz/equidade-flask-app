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
  const auth = useAuth();
  const [location] = useLocation();

  // Efeito para verificar autenticação toda vez que a rota muda ou o usuário muda
  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      setIsVerifying(true);
      
      try {
        // Verificar se o usuário está autenticado
        const response = await fetch('/api/user', { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (isMounted) {
          if (response.ok) {
            const userData = await response.json();
            console.log("Protected Route: User verified via API", userData.username);
            setIsAuthenticated(true);
          } else {
            console.log("Protected Route: User not authenticated via API");
            setIsAuthenticated(false);
          }
          setIsVerifying(false);
        }
      } catch (error) {
        console.error("Error verifying authentication:", error);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsVerifying(false);
        }
      }
    };

    verifyAuth();
    
    return () => {
      isMounted = false;
    };
  }, [location, auth.user]);

  // Renderizar o Route com verificação direta à API
  return (
    <Route path={path}>
      {(params) => {
        if (isVerifying) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Verificando autenticação...</span>
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
