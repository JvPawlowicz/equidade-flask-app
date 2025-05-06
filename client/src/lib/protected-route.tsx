import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  // Renderizar o Route sem verificação inicial
  return (
    <Route path={path}>
      {(params) => {
        const auth = useAuth();
        
        // Se estiver carregando, mostrar o loader
        if (auth.isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        
        // Se não tiver usuário, redirecionar para autenticação
        if (!auth.user) {
          return <Redirect to="/auth" />;
        }
        
        // Se o usuário está autenticado, renderize o componente com os parâmetros da rota
        return <Component {...params} />;
      }}
    </Route>
  );
}
