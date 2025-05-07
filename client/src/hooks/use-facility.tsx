import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface FacilityContextType {
  selectedFacilityId: number | null;
  setSelectedFacilityId: (id: number | null) => void;
  facilities: any[] | undefined;
  isLoading: boolean;
  selectedFacility: any | undefined;
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

interface FacilityProviderProps {
  children: ReactNode;
}

export function FacilityProvider({ children }: FacilityProviderProps) {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  
  // Fetch facilities
  const { data: facilities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });
  
  // Get selected facility details
  const selectedFacility = selectedFacilityId !== null
    ? facilities?.find(f => f.id === selectedFacilityId)
    : undefined;
  
  // Listen for facility changed events from other components
  useEffect(() => {
    const handleFacilityChanged = (event: CustomEvent<{ facilityId: number | null }>) => {
      setSelectedFacilityId(event.detail.facilityId);
    };
    
    window.addEventListener('facilityChanged', handleFacilityChanged as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('facilityChanged', handleFacilityChanged as EventListener);
    };
  }, []);
  
  // Load saved preference from localStorage
  useEffect(() => {
    const savedFacilityId = localStorage.getItem('selectedFacilityId');
    
    if (savedFacilityId) {
      setSelectedFacilityId(parseInt(savedFacilityId, 10));
    }
  }, []);
  
  // Whenever the selected facility changes, save to localStorage
  useEffect(() => {
    if (selectedFacilityId === null) {
      localStorage.removeItem('selectedFacilityId');
    } else {
      localStorage.setItem('selectedFacilityId', selectedFacilityId.toString());
    }
  }, [selectedFacilityId]);
  
  const value = {
    selectedFacilityId,
    setSelectedFacilityId,
    facilities,
    isLoading,
    selectedFacility,
  };
  
  return (
    <FacilityContext.Provider value={value}>
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  const context = useContext(FacilityContext);
  
  if (context === undefined) {
    throw new Error("useFacility must be used within a FacilityProvider");
  }
  
  return context;
}