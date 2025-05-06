import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginStatus("Tentando login...");

    try {
      const res = await apiRequest("POST", "/api/login", { username, password });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha na autenticação");
      }

      const userData = await res.json();
      setLoginStatus(`Login bem-sucedido! Usuário: ${userData.username}`);
      
      // Verificar o estado da autenticação após login
      checkAuthStatus();
      
      toast({
        title: "Login bem-sucedido",
        description: `Bem-vindo(a), ${userData.fullName}!`,
      });

      // Redirecionar para a página inicial após 1 segundo
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error: any) {
      setLoginStatus(`Erro: ${error.message}`);
      toast({
        title: "Erro de login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/user", {
        credentials: "include"
      });
      const data = await res.json();
      setLoginStatus(`Status de autenticação: ${res.ok ? 'Autenticado' : 'Não autenticado'}, ID: ${data.id || 'N/A'}`);
    } catch (error) {
      setLoginStatus(`Erro ao verificar status: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Faça login para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Nome de usuário</Label>
                <Input 
                  id="username" 
                  placeholder="Nome de usuário" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          <Button 
            onClick={handleLogin} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
          
          {loginStatus && (
            <div className="mt-4 w-full p-2 bg-gray-100 rounded text-sm">
              {loginStatus}
            </div>
          )}
          
          <div className="mt-2 w-full">
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={checkAuthStatus}
            >
              Verificar status de autenticação
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}