import React, { ReactNode } from 'react';
import { useLocation, Link } from 'wouter';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/use-mobile';
import {
  CalendarDays,
  Users,
  FileText,
  Home,
  MessageSquare,
  Menu,
  Settings,
  Building,
  Stethoscope
} from 'lucide-react';

interface NavigationItem {
  title: string;
  icon: ReactNode;
  path: string;
  roles?: string[];
  badges?: number | boolean;
}

interface BottomNavigationProps {
  className?: string;
  items?: NavigationItem[];
  showLabels?: boolean;
  expanded?: boolean;
}

/**
 * Componente de barra de navegação inferior para dispositivos móveis
 * Exibe ícones de navegação com badges opcionais
 */
export function BottomNavigation({
  className,
  items: customItems,
  showLabels = true,
  expanded = false,
}: BottomNavigationProps) {
  const [location] = useLocation();
  const { deviceType, width } = useResponsive();
  
  // Verifica se deve exibir a navegação inferior
  const shouldRender = deviceType === 'mobile' || deviceType === 'tablet';
  
  // Se não for um dispositivo móvel, não renderizar
  if (!shouldRender) {
    return null;
  }
  
  // Lista padrão de itens de navegação (se não for personalizada)
  const defaultItems: NavigationItem[] = [
    {
      title: 'Início',
      icon: <Home size={24} />,
      path: '/',
    },
    {
      title: 'Agenda',
      icon: <CalendarDays size={24} />,
      path: '/agenda',
    },
    {
      title: 'Pacientes',
      icon: <Users size={24} />,
      path: '/pacientes',
    },
    {
      title: 'Profissionais',
      icon: <Stethoscope size={24} />,
      path: '/profissionais',
    },
    {
      title: 'Unidades',
      icon: <Building size={24} />,
      path: '/unidades',
    },
    {
      title: 'Documentos',
      icon: <FileText size={24} />,
      path: '/documentos',
    },
    {
      title: 'Chat',
      icon: <MessageSquare size={24} />,
      path: '/chat',
    },
    {
      title: 'Mais',
      icon: <Menu size={24} />,
      path: '/mais',
    },
  ];
  
  // Usar itens personalizados ou padrão
  const items = customItems || defaultItems;
  
  // Limitar o número de itens visíveis com base na largura da tela
  const visibleItems = getVisibleItems(items, width);
  
  return (
    <nav className={cn(
      "flex items-center justify-around bg-background border-t border-gray-200 dark:border-gray-800 fixed bottom-0 left-0 right-0 z-50 h-16 px-2",
      expanded && "h-20",
      className
    )}>
      {visibleItems.map((item) => (
        <Link 
          key={item.path} 
          href={item.path}
        >
          <a className={cn(
            "flex flex-col items-center justify-center text-xs py-1 px-3 rounded-md transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            location === item.path
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800",
            expanded ? "h-16" : "h-14"
          )}>
            <div className="relative">
              {item.icon}
              
              {/* Badge para notificações */}
              {item.badges && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  {typeof item.badges === 'number' && item.badges > 0 ? 
                    (item.badges > 99 ? '99+' : item.badges) : ''}
                </span>
              )}
            </div>
            
            {showLabels && (
              <span className="mt-1">{item.title}</span>
            )}
          </a>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Retorna os itens visíveis com base na largura da tela
 */
function getVisibleItems(items: NavigationItem[], screenWidth: number): NavigationItem[] {
  // Em telas menores, mostrar menos itens
  if (screenWidth < 360) {
    return items.slice(0, 4);
  } else if (screenWidth < 480) {
    return items.slice(0, 5);
  }
  
  // Na maioria dos dispositivos móveis, mostrar até 5 itens
  return items.slice(0, 5);
}

interface MobilePageContainerProps {
  children: ReactNode;
  className?: string;
  showBottomNav?: boolean;
  bottomNavItems?: NavigationItem[];
  showBottomPadding?: boolean;
  title?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
}

/**
 * Container para páginas móveis com título e navegação inferior
 */
export function MobilePageContainer({
  children,
  className,
  showBottomNav = true,
  bottomNavItems,
  showBottomPadding = true,
  title,
  onBack,
  rightAction,
}: MobilePageContainerProps) {
  const { deviceType } = useResponsive();
  
  // Se não for um dispositivo móvel, renderizar apenas o conteúdo
  if (deviceType !== 'mobile' && deviceType !== 'tablet') {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <div className={cn(
      "flex flex-col min-h-screen bg-background",
      showBottomPadding && "pb-16",
      className
    )}>
      {/* Cabeçalho da página (opcional) */}
      {title && (
        <div className="sticky top-0 z-40 bg-background border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-medium">{title}</h1>
          </div>
          
          {rightAction && (
            <div className="flex items-center">{rightAction}</div>
          )}
        </div>
      )}
      
      {/* Conteúdo principal */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Barra de navegação inferior */}
      {showBottomNav && (
        <BottomNavigation items={bottomNavItems} />
      )}
    </div>
  );
}