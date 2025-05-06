import { useState } from "react";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accessibility,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  PanelTop,
  MousePointerClick,
  Keyboard,
} from "lucide-react";

/**
 * Accessibility toolbar providing font size adjustment, high contrast mode,
 * and accessibility information.
 */
export function AccessibilityToolbar() {
  const {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    colorMode,
    toggleHighContrast,
    announce,
  } = useAccessibility();
  
  const [open, setOpen] = useState(false);
  
  // Handle font size increase with announcement
  const handleIncreaseFontSize = () => {
    increaseFontSize();
    announce("Tamanho do texto aumentado");
  };
  
  // Handle font size decrease with announcement
  const handleDecreaseFontSize = () => {
    decreaseFontSize();
    announce("Tamanho do texto diminuído");
  };
  
  // Handle font size reset with announcement
  const handleResetFontSize = () => {
    resetFontSize();
    announce("Tamanho do texto restaurado para o padrão");
  };
  
  // Handle high contrast toggle with announcement
  const handleToggleHighContrast = () => {
    toggleHighContrast();
    announce(
      colorMode === "normal" 
        ? "Modo de alto contraste ativado" 
        : "Modo de alto contraste desativado"
    );
  };
  
  return (
    <div className="fixed right-4 bottom-4 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full h-10 w-10 shadow-md"
                  aria-label="Opções de acessibilidade"
                >
                  <Accessibility className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[240px] p-4" 
                side="top"
                align="end"
                aria-label="Painel de acessibilidade"
              >
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Acessibilidade</h2>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Tamanho do Texto</h3>
                    <div className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleDecreaseFontSize}
                            disabled={fontSize === "normal"}
                            aria-label="Diminuir tamanho do texto"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Diminuir tamanho do texto</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleResetFontSize}
                            disabled={fontSize === "normal"}
                            aria-label="Restaurar tamanho padrão do texto"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Restaurar tamanho padrão</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleIncreaseFontSize}
                            disabled={fontSize === "x-large"}
                            aria-label="Aumentar tamanho do texto"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Aumentar tamanho do texto</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Contraste</h3>
                    <Button 
                      variant={colorMode === "high-contrast" ? "default" : "outline"}
                      size="sm" 
                      className="w-full"
                      onClick={handleToggleHighContrast}
                      aria-pressed={colorMode === "high-contrast"}
                      aria-label="Alternar modo de alto contraste"
                    >
                      <PanelTop className="h-4 w-4 mr-2" />
                      {colorMode === "high-contrast" ? "Alto Contraste Ativado" : "Alto Contraste"}
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Atalhos do Teclado</h3>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex justify-between py-1">
                        <span className="flex items-center">
                          <Keyboard className="h-3 w-3 mr-1" /> Tab
                        </span>
                        <span>Navegação</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="flex items-center">
                          <Keyboard className="h-3 w-3 mr-1" /> Enter
                        </span>
                        <span>Selecionar</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="flex items-center">
                          <Keyboard className="h-3 w-3 mr-1" /> Esc
                        </span>
                        <span>Fechar / Voltar</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Suporte a Leitor de Tela</h3>
                    <p className="text-xs text-muted-foreground flex items-start">
                      <MousePointerClick className="h-3 w-3 mr-1 mt-0.5" />
                      Esta aplicação é compatível com leitores de tela como NVDA, JAWS e VoiceOver.
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Acessibilidade</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}