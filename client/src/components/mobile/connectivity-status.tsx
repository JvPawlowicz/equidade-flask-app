import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/use-mobile';
import { usePendingSynchronizations } from '@/lib/offline-utils';
import { cn } from '@/lib/utils';
import { useIsAppInstalled, useInstallPrompt } from '@/lib/offline-utils';
import { AlertCircle, Check, CloudOff, Download, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConnectivityStatusProps {
  className?: string;
  showInstallPrompt?: boolean;
  showPendingSync?: boolean;
  variant?: 'minimal' | 'standard' | 'detailed';
  position?: 'top' | 'bottom' | 'inline';
}

/**
 * Componente que exibe o status de conectividade e sincronização
 * Útil para informar aos usuários quando estiverem offline e quando
 * houver dados pendentes de sincronização.
 */
export function ConnectivityStatus({
  className,
  showInstallPrompt = true,
  showPendingSync = true,
  variant = 'standard',
  position = 'bottom',
}: ConnectivityStatusProps) {
  const { isOnline, connectionType, effectiveType, isLowBandwidth } = useNetworkStatus();
  const { pendingCount, pendingItems, isLoading, refresh } = usePendingSynchronizations();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const isInstalled = useIsAppInstalled();
  
  // Estado para controlar a visibilidade do banner quando offline
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [lastConnectionChange, setLastConnectionChange] = useState(Date.now());
  
  // Mostrar o banner offline após alguns segundos desconectado
  useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => {
        setShowOfflineBanner(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setShowOfflineBanner(false);
      setLastConnectionChange(Date.now());
    }
  }, [isOnline]);
  
  // Classes de posicionamento
  const positionClass = 
    position === 'top' ? 'fixed top-0 left-0 right-0 z-50' :
    position === 'bottom' ? 'fixed bottom-0 left-0 right-0 z-50' :
    '';
  
  // Se não estiver online, nem tiver pendências, e não puder instalar, não mostrar nada
  if (isOnline && pendingCount === 0 && (!isInstallable || !showInstallPrompt || isInstalled) && variant === 'minimal') {
    return null;
  }
  
  // Variantes de exibição
  if (variant === 'minimal') {
    return (
      <div className={cn(
        "flex items-center gap-1",
        positionClass,
        !isOnline ? "text-red-500" : pendingCount > 0 ? "text-amber-500" : "text-green-500",
        className
      )}>
        {!isOnline ? <WifiOff size={14} /> : 
          pendingCount > 0 ? <RefreshCw size={14} /> : 
          <Wifi size={14} />}
      </div>
    );
  }
  
  // Versão detalhada com mais informações
  return (
    <>
      {/* Banner de modo offline */}
      {showOfflineBanner && (
        <div className={cn(
          "bg-red-100 dark:bg-red-900 p-2 text-center text-red-800 dark:text-red-200 border-t border-red-200 dark:border-red-800 shadow-md transition-all duration-300",
          positionClass,
          className
        )}>
          <div className="flex items-center justify-center gap-2">
            <CloudOff size={18} />
            <span>Você está offline. Os dados serão sincronizados quando a conexão for restaurada.</span>
          </div>
        </div>
      )}
      
      {/* Componente principal de status */}
      <div className={cn(
        "flex items-center justify-between p-2 text-sm border-t",
        positionClass,
        isOnline ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800" :
                  "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900",
        className
      )}>
        <div className="flex items-center gap-2">
          {/* Indicador de conectividade */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {isOnline ? (
                    <Wifi size={16} className="text-green-500" />
                  ) : (
                    <WifiOff size={16} className="text-red-500" />
                  )}
                  <span className={isOnline ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 max-w-xs">
                  <p>Tipo de conexão: {connectionType || "Desconhecido"}</p>
                  <p>Qualidade: {effectiveType || "Desconhecida"}</p>
                  {isLowBandwidth && <p className="text-amber-500">Conexão lenta detectada</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Indicador de sincronização */}
          {showPendingSync && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 ml-3">
                    {pendingCount > 0 ? (
                      <>
                        <RefreshCw size={16} className="text-amber-500 animate-spin" />
                        <span className="text-amber-600 dark:text-amber-400">
                          {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                        </span>
                      </>
                    ) : isLoading ? (
                      <RefreshCw size={16} className="text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Check size={16} className="text-green-500" />
                        <span className="text-green-600 dark:text-green-400">Sincronizado</span>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {pendingCount > 0 ? (
                    <p>Existem {pendingCount} alterações pendentes de sincronização</p>
                  ) : (
                    <p>Todos os dados estão sincronizados</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão de instalação do PWA */}
          {showInstallPrompt && isInstallable && !isInstalled && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={promptInstall}
              className="text-xs flex items-center gap-1"
            >
              <Download size={14} />
              Instalar App
            </Button>
          )}
          
          {/* Botão para forçar sincronização */}
          {pendingCount > 0 && isOnline && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refresh}
              className="text-xs"
              disabled={!isOnline}
            >
              <RefreshCw size={14} className="mr-1" />
              Sincronizar
            </Button>
          )}
          
          {/* Botão para verificar conexão */}
          {!isOnline && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              <AlertCircle size={14} className="mr-1" />
              Verificar
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Componente minimalista para exibir apenas um ícone de status
 */
export function ConnectivityStatusIcon({ className }: { className?: string }) {
  const { isOnline } = useNetworkStatus();
  const { pendingCount } = usePendingSynchronizations();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center justify-center rounded-full w-3 h-3",
            isOnline ? 
              pendingCount > 0 ? "bg-amber-500" : "bg-green-500" 
              : "bg-red-500",
            className
          )}>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {!isOnline ? (
            <p>Você está offline</p>
          ) : pendingCount > 0 ? (
            <p>{pendingCount} item(ns) pendente(s) de sincronização</p>
          ) : (
            <p>Conectado e sincronizado</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}