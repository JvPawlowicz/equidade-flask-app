import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <AlertTriangle className="w-16 h-16 text-destructive mb-4" aria-hidden="true" />
      <h1 className="text-4xl font-bold mb-2">Página não encontrada</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        A página que você está procurando não existe ou foi removida.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/" aria-label="Voltar para a página inicial">
            Ir para a página inicial
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Voltar
        </Button>
      </div>
    </div>
  );
}