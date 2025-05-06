import React, { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  badge?: string;
  badgeVariant?: 'default' | 'outline' | 'secondary' | 'destructive';
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
  divider?: boolean;
  swipeActions?: SwipeAction[];
  actions?: ActionItem[];
  secondaryActions?: ActionItem[];
  onLongPress?: () => void;
}

interface SwipeAction {
  label: string;
  icon: ReactNode;
  color: string;
  backgroundColor: string;
  onClick: () => void;
}

interface ActionItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

/**
 * Componente ListItem otimizado para mobile
 * Suporta ações de swipe, menus de contexto e interações de toque
 */
export function ListItem({
  title,
  subtitle,
  description,
  leading,
  trailing,
  onClick,
  href,
  badge,
  badgeVariant = 'default',
  isActive = false,
  disabled = false,
  className,
  divider = true,
  swipeActions,
  actions,
  secondaryActions,
  onLongPress,
}: ListItemProps) {
  const { isTouchDevice } = useResponsive();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Configurar manipuladores de toque para swipe e longpress
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    
    // Iniciar timer para longpress
    if (onLongPress) {
      const timer = setTimeout(() => {
        onLongPress();
      }, 500); // 500ms para longpress
      
      setLongPressTimer(timer);
    }
    
    // Começar a monitorar swipe
    if (swipeActions && swipeActions.length > 0) {
      // Lógica para swipe aqui
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancelar longpress se o usuário mover o dedo
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Atualizar swipe offset
    if (swipeActions && swipeActions.length > 0) {
      // Lógica para swipe aqui
    }
  };
  
  const handleTouchEnd = () => {
    // Limpar timer de longpress
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Resetar swipe
    setSwipeOffset(0);
  };
  
  // Determinar o elemento de contêiner (a ou div)
  const Component = href ? 'a' : 'div';
  
  // Determinar classes com base nas props
  const itemClasses = cn(
    'flex items-center py-3 px-4 relative overflow-hidden transition-colors',
    divider && 'border-b border-gray-200 dark:border-gray-800',
    isActive ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-900/50',
    isTouchDevice && 'touch-manipulation tap-highlight-transparent active:bg-gray-200 dark:active:bg-gray-800',
    disabled && 'opacity-50 pointer-events-none',
    onClick && !disabled && 'cursor-pointer',
    className
  );
  
  // Renderizar acoes
  const renderActionsMenu = () => {
    if (!actions || actions.length === 0) return null;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.disabled}
              className={action.destructive ? 'text-red-600 dark:text-red-400' : ''}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
          
          {secondaryActions && secondaryActions.length > 0 && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />
              
              {secondaryActions.map((action, index) => (
                <DropdownMenuItem
                  key={`secondary-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  disabled={action.disabled}
                  className={action.destructive ? 'text-red-600 dark:text-red-400' : ''}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
  return (
    <Component
      href={href}
      className={itemClasses}
      onClick={disabled ? undefined : onClick}
      onTouchStart={isTouchDevice ? handleTouchStart : undefined}
      onTouchMove={isTouchDevice ? handleTouchMove : undefined}
      onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
      style={{ transform: `translateX(${swipeOffset}px)` }}
    >
      {/* Leading (left side) content */}
      {leading && (
        <div className="mr-4 flex-shrink-0">
          {leading}
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="font-medium truncate">{title}</div>
          
          {badge && (
            <Badge variant={badgeVariant} className="ml-2">
              {badge}
            </Badge>
          )}
        </div>
        
        {subtitle && (
          <div className="text-sm text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
        
        {description && (
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </div>
        )}
      </div>
      
      {/* Trailing (right side) content */}
      {(trailing || actions) && (
        <div className="ml-4 flex items-center">
          {trailing || (onClick && <ChevronRight className="h-5 w-5 text-muted-foreground" />)}
          {actions && renderActionsMenu()}
        </div>
      )}
    </Component>
  );
}

interface ListSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
  sticky?: boolean;
}

/**
 * Componente de seção para agrupar itens de lista
 */
export function ListSection({
  title,
  children,
  className,
  titleClassName,
  sticky = false,
}: ListSectionProps) {
  return (
    <div className={cn("mb-6", className)}>
      {title && (
        <div className={cn(
          "text-sm font-semibold uppercase text-muted-foreground px-4 py-2",
          sticky && "sticky top-0 bg-background z-10",
          titleClassName
        )}>
          {title}
        </div>
      )}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface ListDividerProps {
  className?: string;
  inset?: boolean;
}

/**
 * Divider para separar itens em uma lista
 */
export function ListDivider({ className, inset = false }: ListDividerProps) {
  return (
    <div 
      className={cn(
        "h-px bg-gray-200 dark:bg-gray-800",
        inset && "ml-16",
        className
      )} 
    />
  );
}

interface ListEmptyProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Componente para mostrar quando uma lista está vazia
 */
export function ListEmpty({
  title,
  message,
  icon,
  action,
  className,
}: ListEmptyProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      {icon && (
        <div className="text-muted-foreground mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      
      {message && (
        <p className="text-muted-foreground mb-4 max-w-md">
          {message}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}