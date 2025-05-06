import { useAccessibility } from "@/hooks/use-accessibility";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Moon, 
  Sun, 
  ChevronUp, 
  ChevronDown, 
  Settings
} from "lucide-react";
import { useState } from "react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AccessibilityToolbar() {
  const { 
    fontSize, 
    increaseFontSize, 
    decreaseFontSize, 
    resetFontSize,
    colorMode,
    toggleHighContrast, 
    announce 
  } = useAccessibility();
  
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => {
    const newState = !expanded;
    setExpanded(newState);
    announce(`Barra de acessibilidade ${newState ? 'expandida' : 'recolhida'}`);
  };
  
  // Converte rótulo para texto amigável
  const getFontSizeLabel = () => {
    switch (fontSize) {
      case 'normal':
        return 'Normal';
      case 'large':
        return 'Grande';
      case 'x-large':
        return 'Extra grande';
      default:
        return 'Normal';
    }
  };
  
  return (
    <TooltipProvider>
      <div 
        className={`fixed right-4 bg-background border border-border rounded-lg shadow-lg transition-all duration-300 z-50 ${
          expanded ? 'bottom-4 w-64' : 'bottom-4 w-11'
        }`}
        role="region"
        aria-label="Ferramentas de acessibilidade"
      >
        {/* Botão de expansão */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1"
          onClick={toggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? "Recolher ferramentas de acessibilidade" : "Expandir ferramentas de acessibilidade"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
        
        {expanded ? (
          // Ferramentas expandidas
          <div className="p-4 pt-10">
            <h3 className="text-sm font-semibold mb-3">Acessibilidade</h3>
            
            {/* Ajustes de texto */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground">Tamanho do texto</h4>
              <div className="flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        decreaseFontSize();
                        announce("Tamanho do texto diminuído");
                      }}
                      aria-label="Diminuir tamanho do texto"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Diminuir tamanho do texto</TooltipContent>
                </Tooltip>
                
                <span className="text-sm mx-2">{getFontSizeLabel()}</span>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => {
                        increaseFontSize();
                        announce("Tamanho do texto aumentado");
                      }}
                      aria-label="Aumentar tamanho do texto"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Aumentar tamanho do texto</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        resetFontSize();
                        announce("Tamanho do texto restaurado para o padrão");
                      }}
                      className="text-xs ml-1"
                      aria-label="Restaurar tamanho padrão do texto"
                    >
                      Resetar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restaurar tamanho padrão</TooltipContent>
                </Tooltip>
              </div>
              
              <Separator className="my-3" />
              
              {/* Modo de alto contraste */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <Label htmlFor="high-contrast" className="text-sm">Alto contraste</Label>
                </div>
                
                <Switch 
                  id="high-contrast" 
                  checked={colorMode === 'high-contrast'} 
                  onCheckedChange={() => {
                    toggleHighContrast();
                    announce(`Modo de alto contraste ${colorMode === 'high-contrast' ? 'desativado' : 'ativado'}`);
                  }}
                  aria-label="Alternar modo de alto contraste"
                />
              </div>
              
              {/* Mais opções em um popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    aria-label="Mais configurações de acessibilidade"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Mais opções
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Configurações adicionais</h4>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="animations" className="text-xs">Reduzir animações</Label>
                      <Switch id="animations" aria-label="Reduzir animações" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="spacing" className="text-xs">Aumentar espaçamento</Label>
                      <Switch id="spacing" aria-label="Aumentar espaçamento entre linhas" />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          // Botão único quando recolhido
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-11 w-11"
                onClick={toggleExpand}
                aria-label="Abrir ferramentas de acessibilidade"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Acessibilidade
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}