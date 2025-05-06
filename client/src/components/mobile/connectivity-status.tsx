import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/use-mobile';
import { getPendingOperations } from '@/lib/offline-storage';
import { Wifi, WifiOff, AlertCircle, Download, Info } from 'lucide-react';
import { setupNetworkListeners } from '@/lib/offline-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ConnectivityStatusProps {
  position?: 'top' | 'bottom';
  className?: string;
  showInstallPrompt?: boolean;
  onSync?: () => Promise<void>;
}

/**
 * Componente que mostra o status de conectividade atual
 * e oferece ações como sincronização e instalação do app
 */
export function ConnectivityStatus({
  position = 'bottom',
  className,
  showInstallPrompt = true,
  onSync
}: ConnectivityStatusProps) {
  const { isOnline } = useNetworkStatus();
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
  const { toast } = useToast();
  
  // Verificar operações pendentes quando o status da rede mudar
  useEffect(() => {
    const checkPendingOperations = async () => {
      try {
        const pendingOps = await getPendingOperations();
        setPendingOperationsCount(pendingOps.length);
      } catch (error) {
        console.error('Erro ao verificar operações pendentes:', error);
      }
    };
    
    checkPendingOperations();
    
    // Configurar listener para mudanças de rede
    const removeListeners = setupNetworkListeners(
      // Online callback
      () => {
        toast({
          title: "Conexão restabelecida",
          description: "Você está online novamente.",
        });
        checkPendingOperations();
      },
      // Offline callback
      () => {
        toast({
          title: "Modo offline",
          description: "Você está trabalhando offline. Algumas funcionalidades podem estar limitadas.",
          variant: "destructive",
        });
      }
    );
    
    return () => {
      removeListeners();
    };
  }, [isOnline, toast]);
  
  // Verificar suporte a instalação PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Instalar o app como PWA
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('O prompt de instalação não está disponível');
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`O usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);
    
    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
    setShowInstall(false);
  };
  
  // Sincronizar dados quando voltar online
  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Você precisa estar online para sincronizar dados",
        variant: "destructive"
      });
      return;
    }
    
    if (!onSync) {
      toast({
        title: "Sincronização automática",
        description: "A sincronização será realizada automaticamente quando você ficar online"
      });
      return;
    }
    
    try {
      toast({
        title: "Sincronizando",
        description: "Sincronizando dados com o servidor...",
      });
      
      await onSync();
      
      // Verificar operações pendentes após sincronização
      const pendingOps = await getPendingOperations();
      setPendingOperationsCount(pendingOps.length);
      
      toast({
        title: "Sincronização concluída",
        description: pendingOps.length > 0 
          ? `Ainda há ${pendingOps.length} operações pendentes.` 
          : "Todos os dados foram sincronizados."
      });
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao sincronizar os dados",
        variant: "destructive"
      });
    }
  };
  
  // Se não há operações pendentes e está online, não mostrar nada
  if (isOnline && pendingOperationsCount === 0 && !showInstall) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "fixed left-0 right-0 px-4 py-2 z-50",
        position === 'top' ? "top-0" : "bottom-0",
        isOnline ? "bg-blue-50 border-t border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-100" 
                 : "bg-amber-50 border-t border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-100",
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                Online
                {pendingOperationsCount > 0 && ` (${pendingOperationsCount} sincronizações pendentes)`}
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Modo Offline</span>
            </>
          )}
        </div>
        
        <div className="flex gap-2">
          {pendingOperationsCount > 0 && isOnline && onSync && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs"
              onClick={handleSync}
            >
              Sincronizar
            </Button>
          )}
          
          {showInstall && showInstallPrompt && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs"
              onClick={handleInstallClick}
            >
              <Download className="h-3 w-3 mr-1" />
              Instalar App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConnectivityBannerProps {
  className?: string;
  onSync?: () => Promise<void>;
}

/**
 * Banner que exibe informações sobre o status de conectividade
 * e oferece ações como sincronização
 */
export function ConnectivityBanner({ className, onSync }: ConnectivityBannerProps) {
  const { isOnline } = useNetworkStatus();
  const [pendingOperationsCount, setPendingOperationsCount] = useState(0);
  const { toast } = useToast();
  
  // Verificar operações pendentes
  useEffect(() => {
    const checkPendingOperations = async () => {
      try {
        const pendingOps = await getPendingOperations();
        setPendingOperationsCount(pendingOps.length);
      } catch (error) {
        console.error('Erro ao verificar operações pendentes:', error);
      }
    };
    
    checkPendingOperations();
    const intervalId = setInterval(checkPendingOperations, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Se não há informações importantes para mostrar, não exibir o banner
  if (isOnline && pendingOperationsCount === 0) {
    return null;
  }
  
  // Sincronizar dados quando voltar online
  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Você precisa estar online para sincronizar dados",
        variant: "destructive"
      });
      return;
    }
    
    if (!onSync) {
      toast({
        title: "Sincronização automática",
        description: "A sincronização será realizada automaticamente quando você ficar online"
      });
      return;
    }
    
    try {
      await onSync();
      
      // Verificar operações pendentes após sincronização
      const pendingOps = await getPendingOperations();
      setPendingOperationsCount(pendingOps.length);
      
      toast({
        title: "Sincronização concluída",
        description: pendingOps.length > 0 
          ? `Ainda há ${pendingOps.length} operações pendentes.` 
          : "Todos os dados foram sincronizados."
      });
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao sincronizar os dados",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div 
      className={cn(
        "rounded-lg p-4 mb-4",
        isOnline 
          ? "bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100" 
          : "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isOnline ? (
            <Info className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-medium">
            {isOnline 
              ? "Você está online" 
              : "Modo offline"
            }
          </h3>
          
          <p className="text-sm mt-1">
            {!isOnline ? (
              "Você está trabalhando offline. Suas alterações serão salvas localmente e sincronizadas quando estiver online novamente."
            ) : pendingOperationsCount > 0 ? (
              `Você tem ${pendingOperationsCount} ${pendingOperationsCount === 1 ? 'operação pendente' : 'operações pendentes'} de sincronização.`
            ) : (
              "Todos os dados estão sincronizados."
            )}
          </p>
          
          {(pendingOperationsCount > 0 || !isOnline) && onSync && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={handleSync}
              disabled={!isOnline}
            >
              {isOnline ? "Sincronizar agora" : "Sincronizar quando online"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}