import { useAccessibility } from "@/hooks/use-accessibility";
import { useEffect, useRef } from "react";

interface SkipLinkProps {
  targetId: string;
  label?: string;
}

export function SkipLink({ targetId, label = "Pular para o conteúdo principal" }: SkipLinkProps) {
  const { announce } = useAccessibility();
  const linkRef = useRef<HTMLAnchorElement>(null);
  
  // Anunciar presença do link para leitores de tela quando a página carrega
  useEffect(() => {
    // Pequeno delay para garantir que leitores de tela capturem o anúncio
    const timer = setTimeout(() => {
      announce("Pressione Tab para acessar o link de pular para o conteúdo principal", "polite");
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [announce]);
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Encontrar o elemento de destino
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      // Focar no elemento de destino
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: 'smooth' });
      announce(`Navegado para ${label}`, "assertive");
    } else {
      announce("Destino não encontrado", "assertive");
    }
  };
  
  return (
    <a 
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
      ref={linkRef}
      onFocus={() => announce("Link de pular para o conteúdo principal encontrado. Pressione Enter para ativar.")}
    >
      {label}
    </a>
  );
}