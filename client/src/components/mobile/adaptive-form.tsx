import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  UseFormReturn, 
  Controller,
  FieldValues
} from "react-hook-form";

type AdaptiveFormComponentProps = {
  title: string;
  description?: string;
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  children: ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
  autoComplete?: string;
  layout?: 'card' | 'plain';
};

/**
 * Componente de formulário adaptativo que se ajusta entre card e tela cheia
 * com base no tamanho da tela
 */
export function AdaptiveForm({
  title,
  description,
  form,
  onSubmit,
  children,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  onCancel,
  isSubmitting = false,
  className,
  autoComplete = "on",
  layout = 'card',
}: AdaptiveFormComponentProps) {
  const { deviceType } = useResponsive();
  const isMobile = deviceType === 'mobile';
  
  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete={autoComplete}>
        {children}
        
        <div className={cn(
          "flex items-center justify-end gap-2 mt-6",
          isMobile && "flex-col-reverse w-full gap-2"
        )}>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className={cn(isMobile && "w-full")}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
          )}
          
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className={cn(isMobile && "w-full")}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
  
  // Layout plano (sem card) para formulários simples ou inseridos em outra estrutura
  if (layout === 'plain') {
    return (
      <div className={className}>
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight mb-2">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {formContent}
      </div>
    );
  }
  
  // Layout com card para formulários standalone
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}

type AdaptiveFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

/**
 * Seção de formulário adaptativa para agrupar campos relacionados
 */
export function FormSection({
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: AdaptiveFormSectionProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const { deviceType } = useResponsive();
  const isMobile = deviceType === 'mobile';
  
  return (
    <div className={cn(
      "border rounded-lg p-4 mb-6",
      className
    )}>
      <div 
        className={cn(
          "flex justify-between items-center mb-4",
          collapsible && "cursor-pointer"
        )}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div>
          <h3 className="font-medium text-lg">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        
        {collapsible && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">
              {isCollapsed ? "Expandir" : "Recolher"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "h-4 w-4 transition-transform",
                isCollapsed ? "rotate-0" : "rotate-180"
              )}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Button>
        )}
      </div>
      
      <div className={cn(
        "space-y-4 transition-all",
        isCollapsed && "hidden"
      )}>
        {children}
      </div>
    </div>
  );
}

type AdaptiveFieldProps = {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  form: UseFormReturn<any>;
  options?: Array<{ label: string; value: string }>;
  className?: string;
  hideLabel?: boolean;
};

/**
 * Campo de formulário adaptativo que se ajusta para mobile
 */
export function AdaptiveField({
  name,
  label,
  description,
  placeholder,
  type = "text",
  required = false,
  form,
  options,
  className,
  hideLabel = false,
}: AdaptiveFieldProps) {
  const { deviceType } = useResponsive();
  const isMobile = deviceType === 'mobile';
  
  // Ajustar o placeholder para dispositivos móveis
  const mobileAdjustedPlaceholder = isMobile ? (placeholder || label) : placeholder;
  
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {!hideLabel && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          
          <FormControl>
            {type === "textarea" ? (
              <Textarea
                placeholder={mobileAdjustedPlaceholder}
                {...field}
                className={cn(isMobile && "text-base")}
              />
            ) : type === "select" && options ? (
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <SelectTrigger className={cn(isMobile && "text-base h-12")}>
                  <SelectValue placeholder={mobileAdjustedPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className={cn(isMobile && "text-base")}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === "date" ? (
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                        isMobile && "text-base h-12"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP", { locale: ptBR })
                      ) : (
                        <span>{mobileAdjustedPlaceholder}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : type === "radio" && options ? (
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
                className="flex flex-col space-y-1"
              >
                {options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                    <label
                      htmlFor={`${name}-${option.value}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            ) : type === "checkbox" ? (
              <Controller
                control={form.control}
                name={name}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <label
                      htmlFor={name}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                )}
              />
            ) : (
              <Input
                type={type}
                placeholder={mobileAdjustedPlaceholder}
                {...field}
                className={cn(isMobile && "text-base h-12")}
              />
            )}
          </FormControl>
          
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type FieldRowProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Linha de campos adaptativa para agrupar campos em uma linha
 */
export function FieldRow({ children, className }: FieldRowProps) {
  const { deviceType } = useResponsive();
  const isMobile = deviceType === 'mobile';
  
  return (
    <div className={cn(
      "grid gap-4",
      isMobile ? "grid-cols-1" : "grid-cols-2",
      className
    )}>
      {children}
    </div>
  );
}

type AdaptiveModalFormProps<T extends FieldValues> = {
  title: string;
  description?: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<T>;
  onSubmit: (values: T) => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  triggerContent?: ReactNode;
  triggerAsChild?: boolean;
  className?: string;
};

/**
 * Componente de formulário em modal adaptativo
 * Em dispositivos móveis exibe um drawer ao invés de um dialog
 */
export function AdaptiveModalForm<T extends FieldValues>({
  title,
  description,
  children,
  open,
  onOpenChange,
  form,
  onSubmit,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  isSubmitting = false,
  triggerContent,
  triggerAsChild = false,
  className,
}: AdaptiveModalFormProps<T>) {
  const { deviceType } = useResponsive();
  const isMobile = deviceType === 'mobile';
  
  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {children}
      </form>
    </Form>
  );
  
  const formActions = (
    <div className={cn(
      "flex items-center gap-2 mt-4",
      isMobile && "flex-col-reverse w-full"
    )}>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        className={cn(isMobile && "w-full")}
        disabled={isSubmitting}
      >
        {cancelLabel}
      </Button>
      
      <Button 
        type="submit" 
        disabled={isSubmitting}
        className={cn(isMobile && "w-full")}
        onClick={form.handleSubmit(onSubmit)}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
  
  // Usar Drawer para dispositivos móveis
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {triggerContent && (
          <DrawerTrigger asChild={triggerAsChild}>
            {triggerContent}
          </DrawerTrigger>
        )}
        <DrawerContent className="px-4">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className={cn("px-4", className)}>
            {formContent}
          </div>
          <DrawerFooter className="pt-2">
            {formActions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }
  
  // Usar Dialog para desktop
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerContent && (
        <DialogTrigger asChild={triggerAsChild}>
          {triggerContent}
        </DialogTrigger>
      )}
      <DialogContent className={cn("sm:max-w-[425px]", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          {formContent}
        </div>
        <DialogFooter>
          {formActions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}