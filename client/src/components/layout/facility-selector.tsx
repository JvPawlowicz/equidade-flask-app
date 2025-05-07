import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Building, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useFacility } from "@/hooks/use-facility";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FacilitySelectorProps {
  onFacilityChange?: (facilityId: number | null) => void;
  buttonVariant?: "default" | "outline" | "ghost";
  showAllOption?: boolean;
}

export function FacilitySelector({
  onFacilityChange,
  buttonVariant = "default",
  showAllOption = true,
}: FacilitySelectorProps) {
  const { selectedFacilityId, setSelectedFacilityId, facilities, isLoading } = useFacility();
  const [open, setOpen] = useState(false);

  // Buscar as unidades diretamente se não estiver disponível no contexto
  const { data: fallbackFacilities, isLoading: isFallbackLoading } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
    enabled: !facilities && isLoading, // Só carregar se não estiver já carregadas no contexto
  });

  // Escolher a fonte de dados correta
  const facilitiesList = facilities || fallbackFacilities || [];
  const isLoadingFacilities = isLoading || isFallbackLoading;

  // Obter detalhes da unidade selecionada
  const selectedFacility = selectedFacilityId !== null
    ? facilitiesList.find(f => f.id === selectedFacilityId)
    : null;

  // Manipular mudança de unidade
  const handleFacilityChange = (facilityId: number | null) => {
    setSelectedFacilityId(facilityId);
    
    if (onFacilityChange) {
      onFacilityChange(facilityId);
    }
    
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={buttonVariant}
          className="flex items-center gap-2 max-w-[200px] md:max-w-[250px] justify-start p-2 md:pl-3 md:pr-2"
          aria-label="Selecionar unidade"
        >
          <Building className="h-4 w-4 flex-shrink-0" />
          
          <span className="text-sm truncate flex-1 text-left">
            {isLoadingFacilities ? (
              <Skeleton className="h-4 w-24" />
            ) : selectedFacility ? (
              selectedFacility.name
            ) : (
              "Todas as unidades"
            )}
          </span>
          
          <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[240px] md:w-[280px]"
        aria-label="Lista de unidades"
      >
        <ScrollArea className="max-h-[300px]">
          {isLoadingFacilities ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              {showAllOption && (
                <DropdownMenuItem
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer",
                    selectedFacilityId === null && "bg-muted/50"
                  )}
                  onClick={() => handleFacilityChange(null)}
                  role="option"
                  aria-selected={selectedFacilityId === null}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {selectedFacilityId === null && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  <span className="flex-1">Todas as unidades</span>
                </DropdownMenuItem>
              )}

              {facilitiesList.map((facility) => (
                <DropdownMenuItem
                  key={facility.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer",
                    selectedFacilityId === facility.id && "bg-muted/50"
                  )}
                  onClick={() => handleFacilityChange(facility.id)}
                  role="option"
                  aria-selected={selectedFacilityId === facility.id}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {selectedFacilityId === facility.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  <span className="flex-1 truncate" title={facility.name}>
                    {facility.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}