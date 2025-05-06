import React, { useState, ReactNode } from 'react';
import { DeviceType, useResponsive } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SimplifiedFormProps {
  children: ReactNode;
  className?: string;
  mobileOnly?: boolean;
  initiallyExpanded?: boolean;
  title?: string;
  description?: string;
  submitButton?: ReactNode;
  saveOnBlur?: boolean;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
}

/**
 * Componente para renderizar um formulário simplificado em dispositivos móveis
 * com menos campos e layout otimizado para telas pequenas
 */
export function SimplifiedForm({
  children,
  className,
  mobileOnly = true,
  initiallyExpanded = true,
  title,
  description,
  submitButton,
  saveOnBlur = false,
  validationMode = 'onBlur',
}: SimplifiedFormProps) {
  const { deviceType } = useResponsive();
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  
  // Se for móvel apenas e não estiver em dispositivo móvel, renderizar normalmente
  if (mobileOnly && deviceType !== 'mobile') {
    return <div className={className}>{children}</div>;
  }
  
  // Renderização para dispositivos móveis
  return (
    <Card className={cn("mb-4", className)}>
      {title && (
        <CardHeader 
          className="py-3 cursor-pointer" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {isExpanded ? 
              <ChevronUp size={18} className="text-muted-foreground" /> : 
              <ChevronDown size={18} className="text-muted-foreground" />
            }
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      
      {isExpanded && (
        <CardContent className="py-3">
          {children}
          
          {submitButton && (
            <div className="mt-4">
              {submitButton}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
  isOptional?: boolean;
  icon?: ReactNode;
}

/**
 * Componente para seções de formulário que podem ser expandidas/recolhidas
 * Útil para formulários longos em dispositivos móveis
 */
export function FormSection({
  title,
  children,
  className,
  defaultCollapsed = false,
  isOptional = false,
  icon,
}: FormSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const { deviceType } = useResponsive();
  
  // Em dispositivos não-móveis, pode ser sempre expandido
  const shouldCollapseByDefault = deviceType === 'mobile' ? defaultCollapsed : false;
  const [isCollapseState, setIsCollapseState] = useState(shouldCollapseByDefault);
  
  // Atualizar estado quando o tipo de dispositivo mudar
  React.useEffect(() => {
    setIsCollapseState(deviceType === 'mobile' ? defaultCollapsed : false);
  }, [deviceType, defaultCollapsed]);
  
  return (
    <div className={cn(
      "border rounded-md mb-4",
      isOptional ? "border-dashed border-gray-300 dark:border-gray-700" : "border-solid border-gray-200 dark:border-gray-800",
      className
    )}>
      <div 
        className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 dark:bg-gray-900 rounded-t-md"
        onClick={() => setIsCollapseState(!isCollapseState)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-sm">
            {title} 
            {isOptional && <span className="text-gray-500 dark:text-gray-400 ml-1">(opcional)</span>}
          </h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          {isCollapseState ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>
      
      <div className={cn(
        "transition-all duration-200 overflow-hidden",
        isCollapseState ? "max-h-0 p-0" : "p-3"
      )}>
        {!isCollapseState && children}
      </div>
    </div>
  );
}

interface MobileStepFormProps {
  steps: {
    id: string;
    title: string;
    description?: string;
    content: ReactNode;
    isOptional?: boolean;
    validation?: () => boolean | Promise<boolean>;
  }[];
  onComplete?: (data: any) => void;
  className?: string;
  onStepChange?: (stepIndex: number) => void;
  showProgressBar?: boolean;
  allowSkipOptional?: boolean;
}

/**
 * Componente de formulário em etapas para dispositivos móveis
 * Divide formulários longos em etapas mais gerenciáveis
 */
export function MobileStepForm({
  steps,
  onComplete,
  className,
  onStepChange,
  showProgressBar = true,
  allowSkipOptional = true,
}: MobileStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleNext = async () => {
    // Verificar se existe validação para a etapa atual
    const currentStepData = steps[currentStep];
    
    if (currentStepData.validation) {
      const isValid = await currentStepData.validation();
      if (!isValid) return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      if (onStepChange) onStepChange(currentStep + 1);
    } else {
      // Última etapa, enviar formulário
      setIsSubmitting(true);
      if (onComplete) {
        try {
          await onComplete(formData);
        } catch (error) {
          console.error('Erro ao enviar formulário:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (onStepChange) onStepChange(currentStep - 1);
    }
  };
  
  const handleSkip = () => {
    if (steps[currentStep].isOptional && allowSkipOptional) {
      setCurrentStep(currentStep + 1);
      if (onStepChange) onStepChange(currentStep + 1);
    }
  };
  
  return (
    <div className={className}>
      {/* Barra de progresso */}
      {showProgressBar && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span>Etapa {currentStep + 1} de {steps.length}</span>
            <span>{steps[currentStep].title}</span>
          </div>
        </div>
      )}
      
      {/* Conteúdo da etapa atual */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">{steps[currentStep].title}</h2>
        {steps[currentStep].description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {steps[currentStep].description}
          </p>
        )}
        
        {steps[currentStep].content}
      </div>
      
      {/* Botões de navegação */}
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          Anterior
        </Button>
        
        <div className="flex items-center gap-2">
          {steps[currentStep].isOptional && allowSkipOptional && (
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              Pular
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {currentStep === steps.length - 1 ? (isSubmitting ? 'Enviando...' : 'Concluir') : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  );
}