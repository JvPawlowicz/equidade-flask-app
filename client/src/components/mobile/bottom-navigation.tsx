import React, { useState, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/hooks/use-mobile';

interface BottomNavItem {
  label: string;
  icon: ReactNode;
  activeIcon?: ReactNode;
  href: string;
  exact?: boolean;
  badge?: number | string;
  badgeColor?: 'primary' | 'secondary' | 'destructive' | 'muted';
  onClick?: () => void;
  disabled?: boolean;
}

interface BottomNavigationProps {
  items: BottomNavItem[];
  className?: string;
  showLabels?: boolean;
  animated?: boolean;
  fixed?: boolean;
  compact?: boolean;
}

export function BottomNavigation({
  items,
  className,
  showLabels = true,
  animated = true,
  fixed = true,
  compact = false,
}: BottomNavigationProps) {
  const [location] = useLocation();
  const { deviceType } = useResponsive();
  
  // Apenas mostrar em dispositivos móveis
  if (deviceType !== 'mobile') {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "bg-background border-t border-border z-50 px-2",
        fixed ? "fixed bottom-0 left-0 right-0" : "w-full",
        className
      )}
    >
      <div className="flex items-center justify-around">
        {items.map((item, index) => {
          const isActive = 
            item.exact 
              ? location === item.href 
              : location.startsWith(item.href) && item.href !== '/';
          
          if (item.href === '/' && location === '/') {
            // Caso especial para a rota raiz
            // isActive = location === '/';
          }
          
          return (
            <BottomNavButton
              key={index}
              label={item.label}
              icon={isActive && item.activeIcon ? item.activeIcon : item.icon}
              href={item.href}
              isActive={isActive}
              badge={item.badge}
              badgeColor={item.badgeColor}
              onClick={item.onClick}
              disabled={item.disabled}
              showLabel={showLabels}
              animated={animated}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
}

interface BottomNavButtonProps {
  label: string;
  icon: ReactNode;
  href: string;
  isActive?: boolean;
  badge?: number | string;
  badgeColor?: 'primary' | 'secondary' | 'destructive' | 'muted';
  onClick?: () => void;
  disabled?: boolean;
  showLabel?: boolean;
  animated?: boolean;
  compact?: boolean;
}

function BottomNavButton({
  label,
  icon,
  href,
  isActive = false,
  badge,
  badgeColor = 'primary',
  onClick,
  disabled = false,
  showLabel = true,
  animated = true,
  compact = false,
}: BottomNavButtonProps) {
  // Determinar classes para o badge
  const badgeClasses = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    muted: 'bg-muted text-muted-foreground'
  };
  
  const buttonContent = (
    <div 
      className={cn(
        "flex flex-col items-center justify-center h-full",
        isActive ? "text-primary" : "text-muted-foreground",
        compact ? "py-2" : "py-3",
        disabled && "opacity-50"
      )}
    >
      <div className="relative">
        {badge !== undefined && (
          <span 
            className={cn(
              "absolute -top-2 -right-2 rounded-full text-xs font-bold px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center",
              badgeClasses[badgeColor]
            )}
          >
            {badge}
          </span>
        )}
        
        <div className={cn("text-2xl", compact && "text-xl")}>
          {animated ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${href}-${isActive ? 'active' : 'inactive'}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {icon}
              </motion.div>
            </AnimatePresence>
          ) : (
            icon
          )}
        </div>
      </div>
      
      {showLabel && (
        <span className={cn(
          "text-xs mt-1",
          compact && "mt-0.5 text-[0.65rem]"
        )}>
          {label}
        </span>
      )}
    </div>
  );
  
  return (
    <Link href={disabled ? "" : href}>
      <a
        className={cn(
          "flex-1 relative",
          !disabled && "cursor-pointer"
        )}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onClick?.();
        }}
        aria-disabled={disabled}
      >
        {isActive && animated && (
          <motion.div
            layoutId="bottomNavIndicator"
            className="absolute bottom-0 w-full h-0.5 bg-primary"
            transition={{ type: "spring", duration: 0.5 }}
          />
        )}
        
        {buttonContent}
      </a>
    </Link>
  );
}

interface FloatingActionButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  label?: string;
  color?: 'default' | 'primary' | 'secondary' | 'destructive';
  size?: 'default' | 'large' | 'small';
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  className?: string;
  withBottomNav?: boolean;
}

/**
 * Botão de ação flutuante para ações primárias em dispositivos móveis
 */
export function FloatingActionButton({
  icon,
  onClick,
  href,
  label,
  color = 'primary',
  size = 'default',
  position = 'bottom-right',
  className,
  withBottomNav = true,
}: FloatingActionButtonProps) {
  const { deviceType } = useResponsive();
  const [, setLocation] = useLocation();
  
  // Determinar classes para posição
  const positionClasses = {
    'bottom-right': 'right-4 bottom-4',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-4',
    'bottom-left': 'left-4 bottom-4'
  };
  
  // Ajustar posição para BottomNavigation
  const bottomNavAdjustment = withBottomNav ? 'mb-16' : '';
  
  // Determinar classes para cores
  const colorClasses = {
    default: 'bg-background text-foreground hover:bg-accent hover:text-accent-foreground border border-border',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  };
  
  // Determinar tamanho
  const sizeClasses = {
    small: 'h-12 w-12 text-lg',
    default: 'h-14 w-14 text-xl',
    large: 'h-16 w-16 text-2xl'
  };
  
  // Mostrar apenas em dispositivos móveis
  if (deviceType !== 'mobile') {
    return null;
  }
  
  const buttonClassNames = cn(
    "rounded-full shadow-lg flex items-center justify-center transition-all",
    "fixed z-50",
    positionClasses[position],
    colorClasses[color],
    sizeClasses[size],
    bottomNavAdjustment,
    className
  );
  
  const buttonElement = (
    <button
      className={buttonClassNames}
      onClick={(e) => {
        if (href) {
          e.preventDefault();
          setLocation(href);
        }
        
        onClick?.();
      }}
      aria-label={label}
    >
      {icon}
    </button>
  );
  
  if (href) {
    return (
      <Link href={href}>
        <a className="block">{buttonElement}</a>
      </Link>
    );
  }
  
  return buttonElement;
}

interface MobileTabsProps {
  tabs: Array<{
    label: string;
    id: string;
    icon?: ReactNode;
    count?: number;
    disabled?: boolean;
  }>;
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  sticky?: boolean;
}

/**
 * Componente de abas otimizado para mobile
 */
export function MobileTabs({
  tabs,
  activeTab,
  onChange,
  className,
  sticky = false,
}: MobileTabsProps) {
  const [visibleTabs, setVisibleTabs] = useState<string[]>([]);
  const { deviceType } = useResponsive();
  
  // Apenas mostrar em dispositivos móveis
  if (deviceType !== 'mobile') {
    return null;
  }
  
  // Efeito para animar a entrada das abas
  useEffect(() => {
    setVisibleTabs([]);
    
    const timer = setTimeout(() => {
      const visible: string[] = [];
      tabs.forEach((tab, index) => {
        setTimeout(() => {
          visible.push(tab.id);
          setVisibleTabs([...visible]);
        }, index * 100);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [tabs]);
  
  return (
    <div 
      className={cn(
        "overflow-x-auto bg-background px-3 border-b border-border",
        sticky && "sticky top-0 z-30",
        className
      )}
    >
      <div className="flex items-center space-x-2 py-2 min-w-max">
        {tabs.map((tab, index) => (
          <motion.button
            key={tab.id}
            className={cn(
              "px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap",
              "flex items-center gap-2 transition-colors",
              tab.disabled && "opacity-50 cursor-not-allowed",
              tab.id === activeTab
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: visibleTabs.includes(tab.id) ? 1 : 0,
              y: visibleTabs.includes(tab.id) ? 0 : 10
            }}
            transition={{ duration: 0.2 }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-background/20 rounded-full">
                {tab.count}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}