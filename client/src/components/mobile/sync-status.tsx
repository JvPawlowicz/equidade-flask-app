import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/use-mobile';
import { Cloud, CloudOff, Database, RefreshCw, Server, ServerOff, AlertTriangle, Check, CloudCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPendingOperations } from '@/lib/offline-storage';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncStatusIndicatorProps {
  className?: string;
  variant?: 'minimal' | 'standard' | 'detailed';
  showDetails?: boolean;
  onSync?: () => Promise<void>;
  syncStatus?: 'syncing' | 'synced' | 'error' | 'pending' | 'offline';
}

/**
 * Componente que exibe o status de sincronização para operações offline
 */
export function SyncStatusIndicator({
  className,
  variant = 'standard',
  showDetails = true,
  onSync,
  syncStatus: externalSyncStatus,
}: SyncStatusIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error' | 'pending' | 'offline'>(
    externalSyncStatus || (isOnline ? 'synced' : 'offline')
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Verificar operações pendentes regularmente
  useEffect(() => {
    // Definir status inicial
    if (externalSyncStatus) {
      setSyncStatus(externalSyncStatus);
    } else {
      setSyncStatus(isOnline ? 'synced' : 'offline');
    }
    
    const checkPending = async () => {
      try {
        const pendingOps = await getPendingOperations();
        setPendingCount(pendingOps.length);
        
        if (pendingOps.length > 0 && isOnline) {
          setSyncStatus('pending');
        } else if (!isOnline) {
          setSyncStatus('offline');
        } else if (externalSyncStatus !== 'error') {
          setSyncStatus('synced');
        }
      } catch (error) {
        console.error('Erro ao verificar operações pendentes:', error);
      }
    };
    
    // Verificar imediatamente
    checkPending();
    
    // E verificar periodicamente
    const intervalId = setInterval(checkPending, 30000);
    
    return () => clearInterval(intervalId);
  }, [isOnline, externalSyncStatus]);
  
  // Manipular sincronização manual
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
      setIsSyncing(true);
      setSyncStatus('syncing');
      
      await onSync();
      
      // Verificar operações pendentes após sincronização
      const pendingOps = await getPendingOperations();
      setPendingCount(pendingOps.length);
      
      if (pendingOps.length > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('synced');
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      setSyncStatus('error');
      
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao sincronizar os dados",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Renderizar indicador de acordo com a variante
  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "flex items-center justify-center rounded-full w-3 h-3",
                syncStatus === 'synced' ? "bg-green-500" : 
                syncStatus === 'pending' ? "bg-yellow-500" : 
                syncStatus === 'error' ? "bg-red-500" : 
                syncStatus === 'syncing' ? "bg-blue-500 animate-pulse" : 
                "bg-gray-500",
                className
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            {syncStatus === 'synced' && "Todos os dados estão sincronizados"}
            {syncStatus === 'pending' && `${pendingCount} ${pendingCount === 1 ? 'item pendente' : 'itens pendentes'} de sincronização`}
            {syncStatus === 'error' && "Erro na sincronização"}
            {syncStatus === 'syncing' && "Sincronizando..."}
            {syncStatus === 'offline' && "Você está offline"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (variant === 'standard') {
    return (
      <div className={cn("flex items-center", className)}>
        {syncStatus === 'synced' && (
          <Check className="h-4 w-4 text-green-500 mr-2" />
        )}
        {syncStatus === 'pending' && (
          <CloudCog className="h-4 w-4 text-yellow-500 mr-2" />
        )}
        {syncStatus === 'error' && (
          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
        )}
        {syncStatus === 'syncing' && (
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin mr-2" />
        )}
        {syncStatus === 'offline' && (
          <CloudOff className="h-4 w-4 text-gray-500 mr-2" />
        )}
        
        <span className="text-sm">
          {syncStatus === 'synced' && "Sincronizado"}
          {syncStatus === 'pending' && `${pendingCount} pendente${pendingCount === 1 ? '' : 's'}`}
          {syncStatus === 'error' && "Erro"}
          {syncStatus === 'syncing' && "Sincronizando..."}
          {syncStatus === 'offline' && "Offline"}
        </span>
        
        {(syncStatus === 'pending' || syncStatus === 'error') && onSync && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSync}
            disabled={isSyncing || !isOnline}
            className="h-6 w-6 ml-1"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }
  
  // Variante detalhada
  return (
    <div 
      className={cn(
        "border rounded-md p-4",
        syncStatus === 'synced' ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900" : 
        syncStatus === 'pending' ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900" : 
        syncStatus === 'error' ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900" : 
        syncStatus === 'syncing' ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900" : 
        "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800",
        className
      )}
    >
      <div className="flex items-center mb-2">
        {syncStatus === 'synced' && (
          <Cloud className="h-5 w-5 text-green-500 mr-2" />
        )}
        {syncStatus === 'pending' && (
          <CloudCog className="h-5 w-5 text-yellow-500 mr-2" />
        )}
        {syncStatus === 'error' && (
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
        )}
        {syncStatus === 'syncing' && (
          <RefreshCw className="h-5 w-5 text-blue-500 animate-spin mr-2" />
        )}
        {syncStatus === 'offline' && (
          <ServerOff className="h-5 w-5 text-gray-500 mr-2" />
        )}
        
        <h3 className="font-medium">
          {syncStatus === 'synced' && "Dados sincronizados"}
          {syncStatus === 'pending' && "Sincronização pendente"}
          {syncStatus === 'error' && "Erro na sincronização"}
          {syncStatus === 'syncing' && "Sincronizando dados..."}
          {syncStatus === 'offline' && "Modo offline"}
        </h3>
      </div>
      
      {showDetails && (
        <div className="text-sm">
          {syncStatus === 'synced' && (
            <p>Todos os dados estão atualizados no servidor.</p>
          )}
          {syncStatus === 'pending' && (
            <p>{`Existem ${pendingCount} ${pendingCount === 1 ? 'operação pendente' : 'operações pendentes'} de sincronização.`}</p>
          )}
          {syncStatus === 'error' && (
            <p>Ocorreu um erro ao sincronizar dados com o servidor.</p>
          )}
          {syncStatus === 'syncing' && (
            <p>Sincronizando dados com o servidor...</p>
          )}
          {syncStatus === 'offline' && (
            <p>Você está trabalhando offline. As alterações serão sincronizadas quando você ficar online novamente.</p>
          )}
        </div>
      )}
      
      {(syncStatus === 'pending' || syncStatus === 'error' || syncStatus === 'offline') && onSync && (
        <Button 
          variant={syncStatus === 'error' ? "destructive" : "outline"} 
          size="sm"
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className="mt-2"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar agora
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface OfflineStatusProps {
  className?: string;
  syncCount?: number;
  children?: React.ReactNode;
  onSync?: () => Promise<void>;
}

/**
 * Componente que exibe diferentes conteúdos com base no status de conexão
 */
export function OfflineContent({
  className,
  syncCount = 0,
  children,
  onSync
}: OfflineStatusProps) {
  const { isOnline } = useNetworkStatus();
  const { deviceType } = useResponsive();
  const isMobile = deviceType === 'mobile';
  
  return (
    <div className={className}>
      {isOnline ? (
        // Quando estiver online, mostrar o conteúdo normal
        <>{children}</>
      ) : (
        // Quando estiver offline, mostrar uma mensagem
        <div className="space-y-4">
          <div className={cn(
            "bg-amber-50 border border-amber-200 rounded-md p-4",
            "dark:bg-amber-900/20 dark:border-amber-900"
          )}>
            <div className="flex items-center mb-2">
              <CloudOff className="h-5 w-5 text-amber-500 mr-2" />
              <h3 className="font-medium">Modo offline</h3>
            </div>
            
            <p className="text-sm">
              Você está trabalhando offline. Algumas funcionalidades podem estar limitadas.
              {syncCount > 0 && ` Existem ${syncCount} alterações pendentes para sincronização.`}
            </p>
            
            {onSync && syncCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onSync}
                disabled={!isOnline}
                className="mt-2"
              >
                <Database className="h-4 w-4 mr-2" />
                Sincronizar quando online
              </Button>
            )}
          </div>
          
          {/* Ainda mostra o conteúdo, mas pode estar limitado */}
          <div className={cn(
            "opacity-85",
            isMobile && "overflow-x-hidden" // Prevenir scroll horizontal em mobile
          )}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}