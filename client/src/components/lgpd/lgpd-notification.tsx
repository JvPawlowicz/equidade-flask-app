import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { LgpdTermConsent } from "./term-consent";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface LgpdNotificationProps {
  onClose?: () => void;
}

export function LgpdNotification({ onClose }: LgpdNotificationProps) {
  const { user } = useAuth();
  const [showTermConsent, setShowTermConsent] = useState(false);
  
  const handleViewTermClick = () => {
    setShowTermConsent(true);
  };
  
  const handleAcceptTerm = async () => {
    try {
      // Envia aceitação para API
      await apiRequest("POST", "/api/users/lgpd-consent", {});
      
      // Invalida o cache para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ["/api/users/lgpd-status"] });
      
      // Se for profissional, invalida também os dados profissionais
      if (user?.role === "professional" || user?.role === "coordinator") {
        queryClient.invalidateQueries({ queryKey: ["/api/professionals/me"] });
      }
      
      // Invalida lista de notificações
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      
      // Fechar o modal
      setShowTermConsent(false);
      
      // Fechar a notificação se houver callback
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Erro ao salvar consentimento LGPD:", error);
      setShowTermConsent(false);
    }
  };
  
  return (
    <>
      <div className="p-4 border-b border-gray-100 bg-amber-50 cursor-pointer">
        <div className="flex">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertCircle className="text-amber-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">Termo LGPD pendente</p>
            <p className="text-xs text-gray-500">
              É necessário aceitar o termo de consentimento LGPD para continuar utilizando todas as funcionalidades do sistema.
            </p>
            <button 
              className="text-xs mt-2 text-primary font-medium hover:underline"
              onClick={handleViewTermClick}
            >
              Visualizar e aceitar termo
            </button>
          </div>
        </div>
      </div>
      
      {showTermConsent && (
        <LgpdTermConsent
          open={showTermConsent}
          onAccept={handleAcceptTerm}
          onClose={() => setShowTermConsent(false)}
        />
      )}
    </>
  );
}