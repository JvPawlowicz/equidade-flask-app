import { useState, useEffect } from "react";

interface LgpdNotificationIndicatorProps {
  userId: number;
}

export function LgpdNotificationIndicator({ userId }: LgpdNotificationIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(false);
  
  useEffect(() => {
    // Verificar status LGPD
    if (userId) {
      fetch('/api/users/lgpd-status', {
        credentials: 'include'
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao obter status LGPD');
        }
        return response.json();
      })
      .then(data => {
        // Mostrar indicador apenas se o usuário NÃO tiver aceitado o termo
        setShowIndicator(data && data.lgpdAccepted !== true);
      })
      .catch(error => {
        console.error('Erro ao verificar status LGPD para indicador:', error);
        // Em caso de erro, mostramos o indicador por precaução
        setShowIndicator(true);
      });
    }
  }, [userId]);
  
  if (!showIndicator) {
    return null;
  }
  
  return (
    <span 
      className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full animate-pulse"
      aria-label="Termo LGPD pendente"
      role="status"
    ></span>
  );
}