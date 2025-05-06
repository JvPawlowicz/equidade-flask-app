import React, { ReactNode, useState } from 'react';
import { useResponsive } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

interface AdaptiveFormProps {
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  hideSubmitWhenOffline?: boolean;
  desktopLayout?: 'normal' | 'two-column' | 'three-column';
  className?: string;
  footer?: ReactNode;
}

/**
 * Componente de formulário adaptativo que se ajusta automaticamente
 * para diferentes tamanhos de tela e condições de conectividade
 */
export function AdaptiveForm({
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  onCancel,
  isSubmitting = false,
  hideSubmitWhenOffline = false,
  desktopLayout = 'normal',
  className,
  footer,
}: AdaptiveFormProps) {
  const { deviceType, isTouchDevice } = useResponsive();
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});

  // Verificar se o formulário pode ser enviado com base no status de conectividade
  const canSubmit = !hideSubmitWhenOffline || isOnline;
  
  // Em dispositivos mobile, usamos uma abordagem de formulário em seções
  const isMobile = deviceType === 'mobile';
  
  // Layout de desktop baseado na propriedade desktopLayout
  const desktopGridClass = 
    desktopLayout === 'two-column' 
      ? 'lg:grid-cols-2 gap-6' 
      : desktopLayout === 'three-column'
        ? 'lg:grid-cols-3 gap-4'
        : '';
  
  // Manipular tentativa de enviar quando offline
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!isOnline && hideSubmitWhenOffline) {
      e.preventDefault();
      toast({
        title: "Você está offline",
        description: "Você precisará de uma conexão à internet para enviar este formulário.",
        variant: "destructive"
      });
      return;
    }
    
    onSubmit(e);
  };
  
  // Função para alternar a visibilidade de uma seção
  const toggleSection = (sectionId: string) => {
    setSectionsOpen(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Verificar se é um componente filho direto do formulário
  const renderChild = (child: React.ReactNode) => {
    if (!React.isValidElement(child)) {
      return child;
    }
    
    // Se for um FormSection em dispositivo mobile, aplica estilos específicos
    if (isMobile && child.type === FormSection) {
      const sectionId = child.props.id || Math.random().toString(36).substring(2, 9);
      const isOpen = sectionsOpen[sectionId] !== false; // Por padrão, aberto
      
      return React.cloneElement(child, {
        ...child.props,
        id: sectionId,
        isOpen,
        onToggle: () => toggleSection(sectionId),
        isMobile: true
      });
    }
    
    // Se não for um FormSection ou não for mobile, renderiza normalmente
    return child;
  };
  
  // Adicionar classes para tornar o formulário melhor para touch em dispositivos móveis
  const mobileClasses = isTouchDevice ? 'space-y-6' : 'space-y-4';
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className={cn(
            "space-y-4",
            isMobile ? mobileClasses : desktopGridClass ? `grid ${desktopGridClass}` : ''
          )}>
            {Array.isArray(children) 
              ? children.map((child, index) => (
                  <React.Fragment key={index}>
                    {renderChild(child)}
                  </React.Fragment>
                ))
              : renderChild(children)
            }
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          {footer ? (
            footer
          ) : (
            <>
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  className={isTouchDevice ? "min-h-[44px]" : ""}
                >
                  {cancelLabel}
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting || !canSubmit}
                className={cn(
                  isTouchDevice ? "min-h-[44px]" : "",
                  !onCancel && "ml-auto"
                )}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {submitLabel}
                  </>
                )}
              </Button>
            </>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

interface FormSectionProps {
  title: string;
  children: ReactNode;
  id?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  isOptional?: boolean;
  className?: string;
  description?: string;
}

/**
 * Seção de formulário que pode ser expandida/recolhida em dispositivos móveis
 */
export function FormSection({
  title,
  children,
  id,
  isOpen = true,
  onToggle,
  isMobile = false,
  isOptional = false,
  className,
  description,
}: FormSectionProps) {
  // Em desktop ou quando explicitamente aberto, mostrar conteúdo normalmente
  if (!isMobile || isOpen) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">
              {title}
              {isOptional && <span className="text-muted-foreground ml-2 text-sm">(opcional)</span>}
            </h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          
          {isMobile && onToggle && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {children}
      </div>
    );
  }
  
  // Em mobile quando fechado, mostrar só o cabeçalho
  return (
    <div className={cn("border rounded-md p-4", className)}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">
            {title}
            {isOptional && <span className="text-muted-foreground ml-2 text-sm">(opcional)</span>}
          </h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        
        {onToggle && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface FormRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Linha de formulário para agrupar campos em desktop
 */
export function FormRow({ children, className }: FormRowProps) {
  const { deviceType } = useResponsive();
  
  // Em mobile, empilhar os campos
  if (deviceType === 'mobile') {
    return (
      <div className={cn("space-y-4", className)}>
        {children}
      </div>
    );
  }
  
  // Em outros dispositivos, organizar em linha
  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {children}
    </div>
  );
}