import React, { ReactNode } from 'react';
import { useResponsive, DeviceType } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
  type?: 'grid' | 'flex' | 'block';
  showOn?: DeviceType[];
  hideOn?: DeviceType[];
  mobileLayout?: 'stacked' | 'single-column' | 'compact';
  desktopLayout?: 'multi-column' | 'dashboard' | 'expanded';
  preserveTabOrder?: boolean;
  optimizeForTouch?: boolean;
}

/**
 * Componente que ajusta o layout automaticamente com base no dispositivo
 * Útil para criar interfaces responsivas que otimizam o espaço em dispositivos móveis
 */
export function ResponsiveContainer({
  children,
  className = '',
  mobileClassName = '',
  tabletClassName = '',
  desktopClassName = '',
  type = 'block',
  showOn = ['mobile', 'tablet', 'laptop', 'desktop'],
  hideOn = [],
  mobileLayout = 'stacked',
  desktopLayout = 'multi-column',
  preserveTabOrder = true,
  optimizeForTouch = true,
}: ResponsiveContainerProps) {
  const { deviceType, isLowPowerMode, isTouchDevice } = useResponsive();
  
  // Verificar se deve exibir com base no tipo de dispositivo
  const shouldShow = showOn.includes(deviceType) && !hideOn.includes(deviceType);
  
  if (!shouldShow) {
    return null;
  }
  
  // Classe baseada no tipo de dispositivo
  const deviceClass = 
    deviceType === 'mobile' ? mobileClassName :
    deviceType === 'tablet' ? tabletClassName :
    desktopClassName;
  
  // Classes para tipos diferentes de container
  const typeClass = 
    type === 'grid' ? 'grid' :
    type === 'flex' ? 'flex' :
    'block';
  
  // Classes para layout específico do dispositivo
  const layoutClass = 
    deviceType === 'mobile' ? 
      mobileLayout === 'stacked' ? 'flex flex-col gap-4' :
      mobileLayout === 'single-column' ? 'flex flex-col w-full gap-2' : 
      'grid grid-cols-1 gap-2' :
    deviceType === 'tablet' ?
      'grid grid-cols-2 gap-3' :
    desktopLayout === 'multi-column' ? 'grid grid-cols-3 gap-4' :
    desktopLayout === 'dashboard' ? 'grid grid-cols-3 grid-rows-2 gap-4' :
    'flex gap-4';
  
  // Aplicar otimizações para touch quando apropriado
  const touchClass = optimizeForTouch && isTouchDevice ? 
    'touch-manipulation tap-highlight-transparent cursor-pointer' : '';
  
  // Ajustar para dispositivos com menor potência
  const lowPowerClass = isLowPowerMode ?
    'transition-none animate-none' : '';
  
  return (
    <div 
      className={cn(
        typeClass,
        layoutClass,
        deviceClass,
        touchClass,
        lowPowerClass,
        className
      )}
      data-device={deviceType}
      data-touch={isTouchDevice ? 'true' : 'false'}
      data-low-power={isLowPowerMode ? 'true' : 'false'}
    >
      {children}
    </div>
  );
}

/**
 * Componente que se adapta para mostrar apenas em determinados dispositivos
 */
export function DeviceVisibility({
  children,
  showOn = ['mobile', 'tablet', 'laptop', 'desktop'],
  hideOn = [],
  className,
}: {
  children: ReactNode;
  showOn?: DeviceType[];
  hideOn?: DeviceType[];
  className?: string;
}) {
  const { deviceType } = useResponsive();
  
  // Verificar se deve exibir com base no tipo de dispositivo
  const shouldShow = showOn.includes(deviceType) && !hideOn.includes(deviceType);
  
  if (!shouldShow) {
    return null;
  }
  
  return (
    <div className={className} data-device-visibility={deviceType}>
      {children}
    </div>
  );
}

/**
 * Componente que adapta automaticamente o layout conforme o dispositivo
 */
export function MobileAdaptiveLayout({
  desktopLayout,
  mobileLayout,
  tabletLayout,
  className,
}: {
  desktopLayout: ReactNode;
  mobileLayout: ReactNode;
  tabletLayout?: ReactNode;
  className?: string;
}) {
  const { deviceType } = useResponsive();
  
  return (
    <div className={className}>
      {deviceType === 'mobile' && mobileLayout}
      {deviceType === 'tablet' && (tabletLayout || mobileLayout)}
      {(deviceType === 'laptop' || deviceType === 'desktop') && desktopLayout}
    </div>
  );
}

/**
 * Componente para entrada otimizada em mobile (botões maiores, campos maiores)
 */
export function MobileOptimizedInput({
  children,
  className,
  touchClassName = 'p-4 text-lg touch-manipulation',
}: {
  children: ReactNode;
  className?: string;
  touchClassName?: string;
}) {
  const { isTouchDevice } = useResponsive();
  
  return (
    <div className={cn(
      className,
      isTouchDevice ? touchClassName : ''
    )}>
      {children}
    </div>
  );
}

/**
 * Componente para simplificar formulários em dispositivos móveis
 * removendo ou compactando campos não essenciais
 */
export function SimplifiedMobileForm({
  children,
  essentialFields,
  allFields,
  className,
}: {
  children: ReactNode;
  essentialFields: string[];
  allFields: Record<string, React.ReactNode>;
  className?: string;
}) {
  const { deviceType } = useResponsive();
  
  // Em dispositivos móveis, mostrar apenas campos essenciais
  const isReducedForm = deviceType === 'mobile';
  
  return (
    <div className={className}>
      {isReducedForm ? (
        // Mostrar versão simplificada em mobile
        <>
          {essentialFields.map(fieldName => (
            <div key={fieldName} className="mb-4">
              {allFields[fieldName]}
            </div>
          ))}
          {children}
        </>
      ) : (
        // Mostrar todos os campos em desktop
        <>
          {Object.entries(allFields).map(([fieldName, field]) => (
            <div key={fieldName} className="mb-4">
              {field}
            </div>
          ))}
          {children}
        </>
      )}
    </div>
  );
}