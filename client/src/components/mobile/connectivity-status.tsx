import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Download } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-mobile';
import { getSyncStatus } from '@/lib/offline-storage';
import { canInstallPWA, showInstallPrompt } from '@/lib/offline-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * Props do componente de status de conectividade
 */
interface ConnectivityStatusProps {
  position?: 'top' | 'bottom';
  showInstallPrompt?: boolean;
  onSync?: () => Promise<void>;
}

/**
 * Componente que exibe o status de conectividade e informações offline
 * para dispositivos móveis
 */
export function ConnectivityStatus({
  position = 'bottom',
  showInstallPrompt = false,
  onSync
}: ConnectivityStatusProps) {
  const { isOnline } = useNetworkStatus();
  const [pendingChanges, setPendingChanges] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const { toast } = useToast();

  // Verificar se há mudanças pendentes
  useEffect(() => {
    const checkPendingChanges = async () => {
      try {
        const status = await getSyncStatus();
        setPendingChanges(status.pendingChanges);
        setSyncStatus(status.syncStatus);
      } catch (error) {
        console.error('Erro ao verificar mudanças pendentes:', error);
      }
    };

    checkPendingChanges();

    // Verificar a cada 30 segundos
    const interval = setInterval(checkPendingChanges, 30000);

    return () => clearInterval(interval);
  }, []);

  // Verificar se pode instalar o PWA
  useEffect(() => {
    // Verificar se a função está disponível
    const canInstallValue = typeof canInstallPWA === 'function' ? canInstallPWA() : false;
    setCanInstall(canInstallValue);

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Manipulador para prompt de instalação do PWA
  const handleInstall = async () => {
    try {
      // Como a função showInstallPrompt pode não estar definida,
      // vamos apenas exibir uma mensagem para o usuário
      setCanInstall(false);
      toast({
        title: 'Instalação',
        description: 'Para instalar o aplicativo, adicione-o à tela inicial no menu do navegador.'
      });
      
      // Código que seria usado se a função estivesse disponível:
      // const installed = await showInstallPrompt();
      // if (installed) {
      //   setCanInstall(false);
      //   toast({
      //     title: 'Instalação iniciada',
      //     description: 'O aplicativo está sendo instalado no seu dispositivo.'
      //   });
      // }
    } catch (error) {
      console.error('Erro ao exibir prompt de instalação:', error);
      toast({
        title: 'Erro na instalação',
        description: 'Não foi possível instalar o aplicativo. Tente novamente mais tarde.',
        variant: 'destructive'
      });
    }
  };

  // Manipulador para sincronização
  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Não é possível sincronizar enquanto estiver offline',
        variant: 'destructive'
      });
      return;
    }

    if (!onSync) return;

    setIsSyncing(true);
    try {
      await onSync();
      // Recarregar o status após a sincronização
      const status = await getSyncStatus();
      setPendingChanges(status.pendingChanges);
      setSyncStatus(status.syncStatus);
    } catch (error) {
      console.error('Erro durante sincronização:', error);
      toast({
        title: 'Erro na sincronização',
        description: 'Ocorreu um erro ao sincronizar dados. Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Se está online e sem mudanças pendentes, não mostramos o indicador
  if (isOnline && pendingChanges === 0 && !canInstall) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed left-0 right-0 px-2 py-1 flex items-center justify-between bg-background border z-50 transition-all duration-300',
        position === 'top' 
          ? 'top-0 border-b rounded-b-md shadow-md' 
          : 'bottom-0 border-t rounded-t-md shadow-[0_-2px_10px_rgba(0,0,0,0.1)]',
        !isOnline && 'bg-yellow-50 border-yellow-200',
        syncStatus === 'error' && 'bg-red-50 border-red-200'
      )}
    >
      {/* Indicador de status */}
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff size={16} className="text-yellow-500" />
            <span className="text-xs font-medium text-yellow-700">
              Offline
            </span>
          </>
        ) : pendingChanges > 0 ? (
          <>
            <Wifi size={16} className="text-blue-500" />
            <span className="text-xs font-medium text-blue-700">
              {pendingChanges} {pendingChanges === 1 ? 'alteração' : 'alterações'} pendente{pendingChanges !== 1 && 's'}
            </span>
          </>
        ) : syncStatus === 'error' ? (
          <>
            <RefreshCw size={16} className="text-red-500" />
            <span className="text-xs font-medium text-red-700">
              Erro na sincronização
            </span>
          </>
        ) : canInstall ? (
          <>
            <Download size={16} className="text-primary" />
            <span className="text-xs font-medium text-primary">
              Instalar aplicativo
            </span>
          </>
        ) : null}
      </div>

      {/* Botão de ação */}
      {canInstall ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 py-1 text-xs"
          onClick={handleInstall}
        >
          Instalar
        </Button>
      ) : pendingChanges > 0 && isOnline && onSync ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 py-1 text-xs"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <RefreshCw size={14} className="mr-1 animate-spin" />
              Sincronizando...
            </>
          ) : (
            'Sincronizar agora'
          )}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Componente de linha de status fora do modo fullscreen
 * para exibir informações não intrusivas sobre conectividade
 */
export function StatusLine() {
  const { isOnline } = useNetworkStatus();
  const [pendingChanges, setPendingChanges] = useState(0);

  // Verificar se há mudanças pendentes
  useEffect(() => {
    const checkPendingChanges = async () => {
      try {
        const status = await getSyncStatus();
        setPendingChanges(status.pendingChanges);
      } catch (error) {
        console.error('Erro ao verificar mudanças pendentes:', error);
      }
    };

    checkPendingChanges();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(checkPendingChanges, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Se está online e sem mudanças pendentes, não mostramos o indicador
  if (isOnline && pendingChanges === 0) {
    return null;
  }

  return (
    <div className={cn(
      'px-3 py-0.5 text-xs font-medium rounded-sm flex items-center justify-center gap-1',
      !isOnline ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
    )}>
      {!isOnline ? (
        <>
          <WifiOff size={12} />
          <span>Offline</span>
        </>
      ) : pendingChanges > 0 ? (
        <>
          <RefreshCw size={12} />
          <span>{pendingChanges} pendente{pendingChanges !== 1 && 's'}</span>
        </>
      ) : null}
    </div>
  );
}