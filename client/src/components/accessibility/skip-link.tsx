import { useState, useEffect } from "react";

interface SkipLinkProps {
  mainContentId?: string;
}

/**
 * Skip link component that allows keyboard users to skip navigation
 * and jump directly to the main content.
 * 
 * This component should be placed at the very beginning of your layout.
 */
export function SkipLink({ mainContentId = "main-content" }: SkipLinkProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // Handle focus events
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);
  
  // Handle click events
  const handleClick = () => {
    const mainContent = document.getElementById(mainContentId);
    if (mainContent) {
      // Focus the main content
      mainContent.focus();
      // Also set tabIndex temporarily to make it focusable
      if (!mainContent.hasAttribute("tabindex")) {
        mainContent.setAttribute("tabindex", "-1");
        // Remove tabindex after blur to maintain correct DOM semantics
        const handleBlurOnce = () => {
          mainContent.removeAttribute("tabindex");
          mainContent.removeEventListener("blur", handleBlurOnce);
        };
        mainContent.addEventListener("blur", handleBlurOnce);
      }
    }
  };
  
  // Add CSS for the skip link
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: var(--primary);
        color: var(--primary-foreground);
        padding: 8px;
        z-index: 100;
        transition: top 0.2s;
        border-bottom-right-radius: 4px;
      }
      
      .skip-link:focus {
        top: 0;
      }
      
      .skip-link.visible {
        top: 0;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <a
      href={`#${mainContentId}`}
      className={`skip-link ${isVisible ? "visible" : ""}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
    >
      Pular para o conteúdo principal
    </a>
  );
}