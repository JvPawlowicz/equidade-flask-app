import { useState, useEffect, useMemo } from "react";

// Breakpoints alinhados com Tailwind
const BREAKPOINTS = {
  sm: 640,   // Smartphones pequenos
  md: 768,   // Tablets e smartphones grandes
  lg: 1024,  // Tablets maiores e laptops pequenos
  xl: 1280,  // Laptops e desktops
  "2xl": 1536 // Telas grandes
};

export type DeviceType = "mobile" | "tablet" | "laptop" | "desktop";

export interface ResponsiveInfo {
  isMobile: boolean;       // sm e menor
  isTablet: boolean;       // entre md e lg
  isLaptop: boolean;       // entre lg e xl
  isDesktop: boolean;      // xl e maior
  deviceType: DeviceType;  // tipo de dispositivo inferido
  orientation: "portrait" | "landscape"; // orientação da tela
  isTouchDevice: boolean;  // se o dispositivo tem touchscreen
  isLowPowerMode: boolean; // estimativa de modo economia de bateria
  width: number;           // largura atual da viewport
  height: number;          // altura atual da viewport
}

// Hook principal para informações responsivas
export function useResponsive(): ResponsiveInfo {
  const [width, setWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [height, setHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState<boolean>(false);

  // Detectar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    // Detectar se é dispositivo touch
    const detectTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    // Tentar detectar modo de economia de bateria com base em algumas heurísticas
    const detectLowPowerMode = () => {
      // Estimativa básica com base na frequência de animação e habilidades do dispositivo
      if ('deviceMemory' in navigator) {
        setIsLowPowerMode((navigator as any).deviceMemory < 4);
      } else {
        // Tenta detectar com base em preferências de redução de movimento
        setIsLowPowerMode(
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
      }
    };

    // Inicializar valores
    handleResize();
    detectTouch();
    detectLowPowerMode();

    // Listener de redimensionamento
    window.addEventListener('resize', handleResize);
    
    // Listener para orientação em dispositivos móveis
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Calcular informações responsivas com base na largura
  const responsiveInfo = useMemo<ResponsiveInfo>(() => {
    const isMobile = width < BREAKPOINTS.md;
    const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
    const isLaptop = width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
    const isDesktop = width >= BREAKPOINTS.xl;
    
    let deviceType: DeviceType = "desktop";
    if (isMobile) deviceType = "mobile";
    else if (isTablet) deviceType = "tablet";
    else if (isLaptop) deviceType = "laptop";
    
    const orientation = height > width ? "portrait" : "landscape";

    return {
      isMobile,
      isTablet,
      isLaptop,
      isDesktop,
      deviceType,
      orientation,
      isTouchDevice,
      isLowPowerMode,
      width,
      height
    };
  }, [width, height, isTouchDevice, isLowPowerMode]);

  return responsiveInfo;
}

// Hook simplificado para compatibilidade com código existente
export function useMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}

// Hook para obter tipo de dispositivo
export function useDeviceType(): DeviceType {
  const { deviceType } = useResponsive();
  return deviceType;
}

// Hook para detectar orientação
export function useOrientation(): "portrait" | "landscape" {
  const { orientation } = useResponsive();
  return orientation;
}

// Hook para detectar possível conexão offline ou lenta
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('unknown');
  const [saveData, setSaveData] = useState<boolean>(false);

  useEffect(() => {
    const updateNetworkInfo = () => {
      setIsOnline(navigator.onLine);
      
      // Verificar API de conexão
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
          setConnectionType(conn.type || 'unknown');
          setEffectiveType(conn.effectiveType || 'unknown');
          setSaveData(!!conn.saveData);
        }
      }
    };

    // Inicializar
    updateNetworkInfo();

    // Eventos de mudança de conexão
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    
    // Listener para info de conexão, se disponível
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        conn.addEventListener('change', updateNetworkInfo);
        return () => {
          conn.removeEventListener('change', updateNetworkInfo);
        };
      }
    }

    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, []);

  return {
    isOnline,
    connectionType, // wifi, cellular, ethernet, etc.
    effectiveType,  // slow-2g, 2g, 3g, 4g
    saveData,       // se o modo de economia de dados está ativo
    isLowBandwidth: ['slow-2g', '2g', '3g'].includes(effectiveType),
  };
}
