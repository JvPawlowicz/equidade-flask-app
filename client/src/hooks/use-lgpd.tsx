import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { LgpdTermConsent } from "@/components/lgpd/term-consent";

type LgpdContextType = {
  showLgpdTerm: boolean;
  lgpdAccepted: boolean;
  setLgpdAccepted: (value: boolean) => void;
  closeLgpdTerm: () => void;
};

const LgpdContext = createContext<LgpdContextType | null>(null);

interface LgpdProviderProps {
  children: ReactNode;
}

export function LgpdProvider({ children }: LgpdProviderProps) {
  const { user } = useAuth();
  const [showLgpdTerm, setShowLgpdTerm] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  
  // Busca se o usuário já aceitou o termo LGPD
  const { data: lgpdStatus } = useQuery({
    queryKey: ['/api/users/lgpd-status'],
    queryFn: getQueryFn(),
    enabled: !!user,
  });
  
  // Quando o usuário faz login, verifica se já aceitou o termo LGPD
  useEffect(() => {
    // Verificação de segurança para garantir que lgpdStatus tenha o formato esperado
    if (user && lgpdStatus && typeof lgpdStatus === 'object') {
      const hasAccepted = lgpdStatus.lgpdAccepted === true;
      
      if (!hasAccepted) {
        // Se não aceitou, mostra o termo
        setShowLgpdTerm(true);
        setLgpdAccepted(false);
      } else {
        // Se já aceitou, atualiza o estado
        setLgpdAccepted(true);
      }
    }
  }, [user, lgpdStatus]);
  
  const handleAccept = async () => {
    try {
      // Envia aceitação para API
      await fetch('/api/users/lgpd-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // Atualiza estado local
      setLgpdAccepted(true);
      setShowLgpdTerm(false);
      
      // Invalida o cache para atualizar os dados de status LGPD
      queryClient.invalidateQueries({ queryKey: ['/api/users/lgpd-status'] });
      
      // Se for profissional, invalida também os dados profissionais
      if (user?.role === 'professional') {
        queryClient.invalidateQueries({ queryKey: ['/api/professionals/me'] });
      }
    } catch (error) {
      console.error('Erro ao salvar consentimento LGPD:', error);
      // Mesmo em caso de erro, fechamos o modal para não bloquear o usuário
      setShowLgpdTerm(false);
    }
  };
  
  const closeLgpdTerm = () => {
    setShowLgpdTerm(false);
  };
  
  return (
    <LgpdContext.Provider
      value={{
        showLgpdTerm,
        lgpdAccepted,
        setLgpdAccepted,
        closeLgpdTerm
      }}
    >
      {children}
      {showLgpdTerm && (
        <LgpdTermConsent 
          open={showLgpdTerm} 
          onAccept={handleAccept} 
          onClose={closeLgpdTerm} 
        />
      )}
    </LgpdContext.Provider>
  );
}

export function useLgpd() {
  const context = useContext(LgpdContext);
  if (!context) {
    throw new Error("useLgpd must be used within a LgpdProvider");
  }
  return context;
}