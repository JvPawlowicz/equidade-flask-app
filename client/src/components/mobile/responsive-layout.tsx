import React, { ReactNode } from 'react';
import { useResponsive, DeviceType } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ConnectivityStatus } from './connectivity-status';

interface ResponsiveLayoutProps {
  children: ReactNode;
  mobileView?: ReactNode;
  tabletView?: ReactNode;
  desktopView?: ReactNode;
  className?: string;
  showConnectivityStatus?: boolean;
  connectivityStatusPosition?: 'top' | 'bottom';
  mobileHeader?: ReactNode;
  mobileFooter?: ReactNode;
  desktopHeader?: ReactNode;
  desktopFooter?: ReactNode;
  sidebar?: ReactNode;
  padForBottomNav?: boolean;
}

/**
 * Componente para renderizar layouts específicos com base no tipo de dispositivo
 */
export function ResponsiveLayout({
  children,
  mobileView,
  tabletView,
  desktopView,
  className,
  showConnectivityStatus = true,
  connectivityStatusPosition = 'bottom',
  mobileHeader,
  mobileFooter,
  desktopHeader,
  desktopFooter,
  sidebar,
  padForBottomNav = true,
}: ResponsiveLayoutProps) {
  const { deviceType, width, height } = useResponsive();
  
  // Se tiver uma view específica para o dispositivo atual, usá-la
  const renderContent = () => {
    if (deviceType === 'mobile' && mobileView) {
      return mobileView;
    } else if (deviceType === 'tablet' && tabletView) {
      return tabletView;
    } else if ((deviceType === 'laptop' || deviceType === 'desktop') && desktopView) {
      return desktopView;
    }
    
    // Se não tiver view específica, usar children como fallback
    return children;
  };
  
  // Adicionar classes específicas com base no tipo de dispositivo
  const deviceSpecificClasses = {
    mobile: 'pt-14 pb-16',
    tablet: 'pt-16 pb-0',
    laptop: 'pt-16 pb-0',
    desktop: 'pt-16 pb-0',
  };
  
  // Determinar se deve adicionar padding para bottom nav
  const bottomPadClass = padForBottomNav && deviceType === 'mobile' ? 'pb-16' : '';
  
  return (
    <div className={cn(
      "min-h-screen bg-background",
      bottomPadClass,
      className
    )}>
      {/* Header específico para o dispositivo atual */}
      {deviceType === 'mobile' ? mobileHeader : desktopHeader}
      
      {/* Layout principal */}
      <div className={cn(
        "flex flex-grow min-h-[calc(100vh-4rem)]",
        deviceType !== 'mobile' && sidebar ? "flex-row" : "flex-col"
      )}>
        {/* Sidebar para desktop/tablet */}
        {deviceType !== 'mobile' && sidebar && (
          <div className="w-64 border-r border-border shrink-0">
            {sidebar}
          </div>
        )}
        
        {/* Conteúdo principal */}
        <div className="flex-grow">
          {renderContent()}
        </div>
      </div>
      
      {/* Footer específico para o dispositivo atual */}
      {deviceType === 'mobile' ? mobileFooter : desktopFooter}
      
      {/* Status de conectividade */}
      {showConnectivityStatus && (
        <ConnectivityStatus position={connectivityStatusPosition} />
      )}
    </div>
  );
}

interface ResponsiveViewportProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centered?: boolean;
  padding?: boolean;
}

/**
 * Componente para criar um contêiner responsivo que limita a largura em telas grandes
 * e se adapta a telas menores
 */
export function ResponsiveViewport({
  children,
  className,
  maxWidth = 'lg',
  centered = true,
  padding = true,
}: ResponsiveViewportProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    'full': 'max-w-full',
  };
  
  return (
    <div 
      className={cn(
        maxWidthClasses[maxWidth],
        padding && 'px-4 md:px-6',
        centered && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  mobileColumns?: 1 | 2;
  tabletColumns?: 2 | 3 | 4;
  desktopColumns?: 3 | 4 | 5 | 6;
  gap?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Grid responsivo que altera o número de colunas de acordo
 * com o tipo de dispositivo
 */
export function ResponsiveGrid({
  children,
  className,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 4,
  gap = 'md',
}: ResponsiveGridProps) {
  const { deviceType } = useResponsive();
  
  // Determinar número de colunas com base no dispositivo
  const columns = deviceType === 'mobile' 
    ? mobileColumns 
    : deviceType === 'tablet' 
      ? tabletColumns 
      : desktopColumns;
  
  // Classes para gap
  const gapClasses = {
    none: '',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };
  
  return (
    <div 
      className={cn(
        "grid",
        `grid-cols-${columns}`,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

interface ShowOnProps {
  children: ReactNode;
  devices: DeviceType[];
  className?: string;
}

/**
 * Componente que exibe seu conteúdo apenas nos dispositivos especificados
 */
export function ShowOn({ children, devices, className }: ShowOnProps) {
  const { deviceType } = useResponsive();
  
  if (!devices.includes(deviceType)) {
    return null;
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface HideOnProps {
  children: ReactNode;
  devices: DeviceType[];
  className?: string;
}

/**
 * Componente que esconde seu conteúdo nos dispositivos especificados
 */
export function HideOn({ children, devices, className }: HideOnProps) {
  const { deviceType } = useResponsive();
  
  if (devices.includes(deviceType)) {
    return null;
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
}