import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  return (
    <Route path={path}>
      {(params) => {
        try {
          const { user, isLoading } = useAuth();
          
          if (isLoading) {
            return (
              <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            );
          }
          
          if (!user) {
            return <Redirect to="/auth" />;
          }
          
          // Se o usuário está autenticado, renderize o componente com os parâmetros da rota
          return <Component {...params} />;
        } catch (error) {
          console.error("Erro no ProtectedRoute:", error);
          return <Redirect to="/auth" />;
        }
      }}
    </Route>
  );
}
