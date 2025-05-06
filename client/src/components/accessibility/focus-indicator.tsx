import { useEffect, useState, useRef } from "react";

export function FocusIndicator() {
  const [activeElement, setActiveElement] = useState<Element | null>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let usingKeyboard = false;
    
    // Verificar se usuário está navegando por teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        usingKeyboard = true;
      }
    };
    
    // Rastrear elemento em foco
    const handleFocusIn = (e: FocusEvent) => {
      if (!usingKeyboard) return;
      
      // Ignorar elementos não visíveis ou que não devem receber foco visual
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BODY' || 
        target.hasAttribute('data-focus-ignore') ||
        target.classList.contains('skip-link')
      ) {
        hideIndicator();
        return;
      }
      
      setActiveElement(e.target as Element);
    };
    
    // Remover indicador quando foco é perdido
    const handleFocusOut = () => {
      hideIndicator();
    };
    
    // Resetar estado de navegação por teclado quando mouse é usado
    const handleMouseDown = () => {
      usingKeyboard = false;
      hideIndicator();
    };
    
    // Esconder indicador
    const hideIndicator = () => {
      setActiveElement(null);
    };
    
    // Adicionar event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('mousedown', handleMouseDown);
    
    // Limpar event listeners
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  // Atualizar posição do indicador quando activeElement muda
  useEffect(() => {
    if (!activeElement || !indicatorRef.current) return;
    
    const updatePosition = () => {
      const element = activeElement as HTMLElement;
      const rect = element.getBoundingClientRect();
      const indicator = indicatorRef.current;
      
      if (!indicator) return;
      
      // Ajustar posição considerando padding/margin
      indicator.style.top = `${rect.top + window.scrollY - 2}px`;
      indicator.style.left = `${rect.left + window.scrollX - 2}px`;
      indicator.style.width = `${rect.width + 4}px`;
      indicator.style.height = `${rect.height + 4}px`;
      indicator.classList.add('active');
    };
    
    updatePosition();
    
    // Atualizar posição durante scroll e redimensionamento
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [activeElement]);
  
  return (
    <div 
      ref={indicatorRef} 
      className={`focus-indicator ${activeElement ? 'active' : ''}`}
      aria-hidden="true"
    />
  );
}