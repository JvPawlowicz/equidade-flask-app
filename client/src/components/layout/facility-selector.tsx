import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface FacilitySelectorProps {
  onFacilityChange?: (facilityId: number | null) => void;
  buttonVariant?: "default" | "outline" | "ghost";
  showAllOption?: boolean;
}

export function FacilitySelector({
  onFacilityChange,
  buttonVariant = "outline",
  showAllOption = true,
}: FacilitySelectorProps) {
  const { toast } = useToast();
  const [selectedFacility, setSelectedFacility] = useState<number | null>(null);
  
  // Buscar lista de unidades (facilities)
  const { data: facilities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });
  
  // Definir unidade padrão quando a lista é carregada (se ainda não estiver definida)
  useEffect(() => {
    if (facilities && facilities.length > 0 && selectedFacility === null) {
      // Verificar se há alguma preferência salva no localStorage
      const savedFacilityId = localStorage.getItem('selectedFacilityId');
      
      if (savedFacilityId && facilities.some(f => f.id.toString() === savedFacilityId)) {
        const facilityId = parseInt(savedFacilityId, 10);
        setSelectedFacility(facilityId);
        onFacilityChange?.(facilityId);
      } else {
        // Se não houver preferência salva, definir a primeira unidade como padrão
        setSelectedFacility(facilities[0].id);
        onFacilityChange?.(facilities[0].id);
      }
    }
  }, [facilities, selectedFacility, onFacilityChange]);
  
  // Manipular mudança na seleção de unidade
  const handleFacilityChange = (facilityId: string) => {
    // "all" é uma string especial para representar "Todas as unidades"
    const newFacilityId = facilityId === "all" ? null : parseInt(facilityId, 10);
    
    // Atualizar estado local
    setSelectedFacility(newFacilityId);
    
    // Salvar preferência no localStorage
    if (newFacilityId === null) {
      localStorage.removeItem('selectedFacilityId');
    } else {
      localStorage.setItem('selectedFacilityId', newFacilityId.toString());
    }
    
    // Chamar callback informando a mudança
    onFacilityChange?.(newFacilityId);
    
    // Mostrar feedback ao usuário
    toast({
      title: "Unidade alterada",
      description: newFacilityId === null 
        ? "Visualizando todas as unidades" 
        : `Unidade: ${facilities?.find(f => f.id === newFacilityId)?.name || 'Selecionada'}`,
      variant: "default",
    });
  };
  
  // Se não há unidades ou apenas uma, não mostrar o seletor
  if (isLoading || !facilities || facilities.length <= 1) {
    return null;
  }
  
  // Encontrar o nome da unidade selecionada
  const selectedFacilityName = selectedFacility
    ? facilities.find(f => f.id === selectedFacility)?.name || "Unidade"
    : "Todas as unidades";
  
  // Renderizar como dropdown em dispositivos pequenos e select em dispositivos maiores
  return (
    <div className="flex items-center">
      {/* Versão mobile (dropdown) */}
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={buttonVariant} className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="max-w-[140px] truncate">{selectedFacilityName}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Selecionar Unidade</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {showAllOption && (
              <DropdownMenuItem onClick={() => handleFacilityChange("all")}>
                <div className="flex items-center justify-between w-full">
                  <span>Todas as unidades</span>
                  {selectedFacility === null && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
            )}
            
            {facilities.map((facility) => (
              <DropdownMenuItem 
                key={facility.id}
                onClick={() => handleFacilityChange(facility.id.toString())}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{facility.name}</span>
                  {selectedFacility === facility.id && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Versão desktop (select) */}
      <div className="hidden lg:block">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Select 
                  value={selectedFacility === null ? "all" : selectedFacility.toString()} 
                  onValueChange={handleFacilityChange}
                >
                  <SelectTrigger className={`w-[180px] ${buttonVariant === 'ghost' ? 'border-none' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <SelectValue placeholder="Selecionar unidade" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {showAllOption && (
                      <SelectItem value="all">Todas as unidades</SelectItem>
                    )}
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Selecionar unidade para filtrar dados</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}