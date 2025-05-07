import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { SiReplit } from "react-icons/si";

interface LoginWithReplitProps {
  className?: string;
}

export function LoginWithReplit({ className = "" }: LoginWithReplitProps) {
  return (
    <div className={className}>
      <Button 
        className="w-full flex items-center justify-center gap-2"
        variant="outline"
        onClick={() => {
          window.location.href = "/api/login";
        }}
      >
        <SiReplit className="h-4 w-4" />
        <span>Entrar com Replit</span>
      </Button>
    </div>
  );
}