import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
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
  
  // Busca se o profissional já aceitou o termo LGPD
  const { data: professionalData } = useQuery({
    queryKey: ['/api/professionals/me'],
    queryFn: getQueryFn(),
    enabled: !!user,
  });
  
  // Quando o usuário faz login, verifica se já aceitou o termo LGPD
  useEffect(() => {
    if (user && professionalData) {
      if (!professionalData.lgpdAccepted) {
        // Se não aceitou, mostra o termo
        setShowLgpdTerm(true);
        setLgpdAccepted(false);
      } else {
        // Se já aceitou, atualiza o estado
        setLgpdAccepted(true);
      }
    }
  }, [user, professionalData]);
  
  const handleAccept = () => {
    setLgpdAccepted(true);
    setShowLgpdTerm(false);
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