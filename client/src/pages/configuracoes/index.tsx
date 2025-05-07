import { useAuth } from "@/hooks/use-auth";
import { Link, Navigate, useLocation } from "wouter";
import { History, UserCog } from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Verificar se usuário tem permissão para visualizar a página
  if (!user || !["admin", "coordinator"].includes(user.role)) {
    return <Navigate to="/" />;
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Configurações</h1>
        <p className="text-gray-600">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="mb-2">Histórico</CardTitle>
                <CardDescription>
                  Visualize o histórico de ações realizadas pelos usuários no sistema
                </CardDescription>
              </div>
              <History className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-4">
              <Link href="/configuracoes/historico">
                <Button>Acessar histórico</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="mb-2">Usuários</CardTitle>
                <CardDescription>
                  Gerencie permissões de acesso e visualize informações de usuários
                </CardDescription>
              </div>
              <UserCog className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-4">
              <Link href="/configuracoes/usuarios">
                <Button>Gerenciar usuários</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </div>
    </AppLayout>
  );
}