import * as React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/use-mobile';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  touchOptimized?: boolean;
}

/**
 * Input otimizado para dispositivos touch com área de clique maior
 */
export function TouchInput({
  label,
  error,
  className,
  inputClassName,
  labelClassName,
  touchOptimized = true,
  ...props
}: TouchInputProps) {
  const { isTouchDevice } = useResponsive();
  const optimizeForTouch = touchOptimized && isTouchDevice;
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label 
          htmlFor={props.id} 
          className={cn(
            optimizeForTouch && "text-base",
            labelClassName
          )}
        >
          {label}
        </Label>
      )}
      
      <Input
        {...props}
        className={cn(
          optimizeForTouch && "h-12 text-base px-4",
          error && "border-red-500 focus:ring-red-500",
          inputClassName
        )}
      />
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

interface TouchTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
  textareaClassName?: string;
  labelClassName?: string;
  touchOptimized?: boolean;
}

/**
 * Textarea otimizada para dispositivos touch
 */
export function TouchTextarea({
  label,
  error,
  className,
  textareaClassName,
  labelClassName,
  touchOptimized = true,
  ...props
}: TouchTextareaProps) {
  const { isTouchDevice } = useResponsive();
  const optimizeForTouch = touchOptimized && isTouchDevice;
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label 
          htmlFor={props.id} 
          className={cn(
            optimizeForTouch && "text-base",
            labelClassName
          )}
        >
          {label}
        </Label>
      )}
      
      <Textarea
        {...props}
        className={cn(
          optimizeForTouch && "text-base px-4 py-3",
          error && "border-red-500 focus:ring-red-500",
          textareaClassName
        )}
      />
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

interface TouchSelectProps {
  label?: string;
  error?: string;
  className?: string;
  selectClassName?: string;
  labelClassName?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  touchOptimized?: boolean;
  showSearch?: boolean;
}

/**
 * Select customizado para melhor experiência em dispositivos touch
 * Abre um popover com opções maiores para facilitar a seleção
 */
export function TouchSelect({
  label,
  error,
  className,
  selectClassName,
  labelClassName,
  options,
  value,
  onChange,
  placeholder = "Selecione uma opção",
  disabled = false,
  touchOptimized = true,
  showSearch = false,
}: TouchSelectProps) {
  const { isTouchDevice } = useResponsive();
  const optimizeForTouch = touchOptimized && isTouchDevice;
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const selectedOption = options.find(option => option.value === value);
  
  const filteredOptions = showSearch
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn(
          optimizeForTouch && "text-base",
          labelClassName
        )}>
          {label}
        </Label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              optimizeForTouch && "h-12 text-base px-4",
              error && "border-red-500",
              !selectedOption && "text-muted-foreground",
              selectClassName
            )}
            disabled={disabled}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn(
          "w-full p-0",
          optimizeForTouch && "max-h-80"
        )}>
          {showSearch && (
            <div className="p-2 pb-0">
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={optimizeForTouch ? "h-10" : ""}
              />
            </div>
          )}
          <div className={cn(
            "overflow-y-auto max-h-60",
            optimizeForTouch && "max-h-72"
          )}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                    optimizeForTouch && "py-3",
                    option.value === value && "bg-gray-100 dark:bg-gray-800"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                Nenhuma opção encontrada.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

interface TouchDatePickerProps {
  label?: string;
  error?: string;
  className?: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  touchOptimized?: boolean;
  showTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * DatePicker otimizado para dispositivos touch
 */
export function TouchDatePicker({
  label,
  error,
  className,
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  touchOptimized = true,
  showTime = false,
  minDate,
  maxDate,
}: TouchDatePickerProps) {
  const { isTouchDevice } = useResponsive();
  const optimizeForTouch = touchOptimized && isTouchDevice;
  const [open, setOpen] = React.useState(false);
  const [hours, setHours] = React.useState<number>(value ? value.getHours() : 8);
  const [minutes, setMinutes] = React.useState<number>(value ? value.getMinutes() : 0);
  
  const handleDateChange = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      return;
    }
    
    if (showTime && date) {
      const newDate = new Date(date);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      onChange(newDate);
    } else {
      onChange(date);
    }
  };
  
  const handleTimeChange = () => {
    if (!value) return;
    
    const newDate = new Date(value);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    onChange(newDate);
  };
  
  const incrementHours = () => {
    setHours((prev) => (prev === 23 ? 0 : prev + 1));
  };
  
  const decrementHours = () => {
    setHours((prev) => (prev === 0 ? 23 : prev - 1));
  };
  
  const incrementMinutes = () => {
    setMinutes((prev) => (prev === 59 ? 0 : prev + 1));
  };
  
  const decrementMinutes = () => {
    setMinutes((prev) => (prev === 0 ? 59 : prev - 1));
  };
  
  React.useEffect(() => {
    if (value) {
      setHours(value.getHours());
      setMinutes(value.getMinutes());
    }
  }, [value]);
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between",
              optimizeForTouch && "h-12 text-base px-4",
              !value && "text-muted-foreground",
              error && "border-red-500"
            )}
            disabled={disabled}
          >
            {value ? format(value, showTime ? 'PPp' : 'PP', { locale: ptBR }) : placeholder}
            <CalendarIcon className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDateChange}
            initialFocus
            disabled={disabled}
            className={cn(optimizeForTouch && "touch-manipulation")}
            fromDate={minDate}
            toDate={maxDate}
          />
          
          {showTime && value && (
            <div className="p-3 border-t">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Hora:</div>
                
                <div className="flex items-center space-x-3">
                  {/* Selector de hora */}
                  <div className="flex flex-col items-center">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7" 
                      onClick={incrementHours}
                    >
                      <ChevronUp size={16} />
                    </Button>
                    <div 
                      className={cn(
                        "w-12 h-9 border rounded flex items-center justify-center", 
                        optimizeForTouch && "h-10"
                      )}
                    >
                      {hours.toString().padStart(2, '0')}
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={decrementHours}
                    >
                      <ChevronDown size={16} />
                    </Button>
                  </div>
                  
                  <div className="text-xl">:</div>
                  
                  {/* Selector de minutos */}
                  <div className="flex flex-col items-center">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7" 
                      onClick={incrementMinutes}
                    >
                      <ChevronUp size={16} />
                    </Button>
                    <div 
                      className={cn(
                        "w-12 h-9 border rounded flex items-center justify-center", 
                        optimizeForTouch && "h-10"
                      )}
                    >
                      {minutes.toString().padStart(2, '0')}
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={decrementMinutes}
                    >
                      <ChevronDown size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full mt-3" 
                size="sm"
                onClick={() => {
                  handleTimeChange();
                  setOpen(false);
                }}
              >
                Confirmar
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}

interface DynamicFieldListProps {
  fields: any[];
  renderField: (field: any, index: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel?: string;
  emptyMessage?: string;
  maxFields?: number;
  className?: string;
}

/**
 * Componente para lista de campos dinâmicos em formulários
 * otimizado para entrada mobile
 */
export function DynamicFieldList({
  fields,
  renderField,
  onAdd,
  onRemove,
  addLabel = "Adicionar item",
  emptyMessage = "Nenhum item adicionado",
  maxFields,
  className,
}: DynamicFieldListProps) {
  const { isTouchDevice } = useResponsive();
  
  return (
    <div className={className}>
      {fields.length === 0 ? (
        <div className="text-center p-4 border border-dashed rounded-md text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="relative border rounded-md p-3">
              {renderField(field, index)}
              
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => onRemove(index)}
              >
                <X size={isTouchDevice ? 18 : 16} />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {(!maxFields || fields.length < maxFields) && (
        <Button
          type="button"
          variant="outline"
          size={isTouchDevice ? "default" : "sm"}
          className="mt-3"
          onClick={onAdd}
        >
          <Plus size={isTouchDevice ? 18 : 16} className="mr-1" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}