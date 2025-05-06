import React, { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Estilos comuns para inputs otimizados para toque
const TOUCH_STYLES = {
  base: 'min-h-12 text-base',
  active: 'border-primary',
  icon: 'h-5 w-5',
  hoverScale: 'transition-transform hover:scale-[1.01] active:scale-[0.98]'
};

interface TouchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  enhanced?: boolean;
  size?: 'default' | 'large';
}

/**
 * Input otimizado para interações em dispositivos touchscreen
 */
export function TouchInput({
  className,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  enhanced = true,
  size = 'default',
  ...props
}: TouchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  const containerClasses = cn(
    fullWidth && 'w-full',
    'relative'
  );
  
  const inputClasses = cn(
    enhanced && TOUCH_STYLES.base,
    enhanced && TOUCH_STYLES.hoverScale,
    isFocused && TOUCH_STYLES.active,
    size === 'large' && 'min-h-14',
    icon && iconPosition === 'left' && 'pl-10',
    icon && iconPosition === 'right' && 'pr-10',
    className
  );
  
  return (
    <div className={containerClasses}>
      {icon && (
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground",
            iconPosition === 'left' ? "left-3" : "right-3"
          )}
        >
          {icon}
        </div>
      )}
      
      <Input
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={inputClasses}
        {...props}
      />
    </div>
  );
}

interface TouchTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  fullWidth?: boolean;
  enhanced?: boolean;
}

/**
 * Textarea otimizado para interações em dispositivos touchscreen
 */
export function TouchTextarea({
  className,
  fullWidth = false,
  enhanced = true,
  ...props
}: TouchTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  
  const textareaClasses = cn(
    enhanced && TOUCH_STYLES.base,
    enhanced && TOUCH_STYLES.hoverScale,
    isFocused && TOUCH_STYLES.active,
    'min-h-[100px]',
    fullWidth && 'w-full',
    className
  );
  
  return (
    <Textarea
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={textareaClasses}
      {...props}
    />
  );
}

interface TouchSelectProps {
  options: Array<{ label: string; value: string }>;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
  enhanced?: boolean;
  size?: 'default' | 'large';
  disabled?: boolean;
}

/**
 * Select otimizado para interações em dispositivos touchscreen
 */
export function TouchSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção",
  className,
  fullWidth = false,
  enhanced = true,
  size = 'default',
  disabled = false,
}: TouchSelectProps) {
  const triggerClasses = cn(
    fullWidth && 'w-full',
    enhanced && TOUCH_STYLES.base,
    enhanced && TOUCH_STYLES.hoverScale,
    size === 'large' && 'min-h-14',
    className
  );
  
  const contentClasses = cn(
    enhanced && 'text-base'
  );
  
  return (
    <Select 
      value={value} 
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClasses}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClasses}>
        {options.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            className={enhanced ? 'text-base py-2.5' : undefined}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface TouchDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
  enhanced?: boolean;
  size?: 'default' | 'large';
  disabled?: boolean;
}

/**
 * DatePicker otimizado para interações em dispositivos touchscreen
 */
export function TouchDatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
  fullWidth = false,
  enhanced = true,
  size = 'default',
  disabled = false,
}: TouchDatePickerProps) {
  const [open, setOpen] = useState(false);
  
  const triggerClasses = cn(
    "justify-start text-left font-normal",
    fullWidth && 'w-full',
    enhanced && TOUCH_STYLES.base,
    enhanced && TOUCH_STYLES.hoverScale,
    size === 'large' && 'min-h-14',
    !value && "text-muted-foreground",
    className
  );
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={triggerClasses}
          onClick={() => setOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "PPP", { locale: ptBR })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          initialFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'large' | 'icon';
  icon?: ReactNode;
  fullWidth?: boolean;
  ripple?: boolean;
  children?: ReactNode;
}

/**
 * Botão otimizado para interações em dispositivos touchscreen
 */
export function TouchButton({
  className,
  variant = 'default',
  size = 'default',
  icon,
  fullWidth = false,
  ripple = true,
  children,
  ...props
}: TouchButtonProps) {
  const [rippleEffect, setRippleEffect] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setRippleEffect({ x, y, visible: true });
      
      setTimeout(() => {
        setRippleEffect(prev => ({ ...prev, visible: false }));
      }, 400);
    }
    
    props.onClick?.(e);
  };
  
  const buttonClasses = cn(
    "relative overflow-hidden",
    size === 'large' && 'min-h-14 text-base px-6',
    fullWidth && 'w-full',
    TOUCH_STYLES.hoverScale,
    className
  );
  
  return (
    <Button
      variant={variant}
      size={size === 'large' ? 'default' : size}
      className={buttonClasses}
      onClick={handleClick}
      {...props}
    >
      {ripple && rippleEffect.visible && (
        <span 
          className="absolute rounded-full bg-white/20 dark:bg-black/20 animate-ripple"
          style={{
            top: rippleEffect.y - 50,
            left: rippleEffect.x - 50,
            width: '100px',
            height: '100px',
          }}
        />
      )}
      
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  );
}