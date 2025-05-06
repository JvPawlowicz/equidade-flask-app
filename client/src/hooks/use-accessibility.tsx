import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type FontSize = "normal" | "large" | "x-large";
type ColorMode = "normal" | "high-contrast";

interface AccessibilityContextType {
  // Font size
  fontSize: FontSize;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  
  // Color modes
  colorMode: ColorMode;
  toggleHighContrast: () => void;
  
  // Screen reader announcements
  announce: (message: string, politeness?: "polite" | "assertive") => void;
  
  // Focus trap and keyboard navigation
  trapFocus: (elementId: string) => void;
  releaseFocus: () => void;
}

const defaultContext: AccessibilityContextType = {
  fontSize: "normal",
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  resetFontSize: () => {},
  
  colorMode: "normal",
  toggleHighContrast: () => {},
  
  announce: () => {},
  
  trapFocus: () => {},
  releaseFocus: () => {},
};

const AccessibilityContext = createContext<AccessibilityContextType>(defaultContext);

// CSS values for each font size level
const fontSizeCssVars = {
  "normal": {
    "--font-size-base": "1rem",
    "--font-size-sm": "0.875rem",
    "--font-size-lg": "1.125rem",
    "--font-size-xl": "1.25rem",
    "--font-size-2xl": "1.5rem",
    "--font-size-3xl": "1.875rem",
    "--font-size-4xl": "2.25rem"
  },
  "large": {
    "--font-size-base": "1.125rem",
    "--font-size-sm": "1rem",
    "--font-size-lg": "1.25rem",
    "--font-size-xl": "1.375rem",
    "--font-size-2xl": "1.625rem",
    "--font-size-3xl": "2rem",
    "--font-size-4xl": "2.375rem"
  },
  "x-large": {
    "--font-size-base": "1.25rem",
    "--font-size-sm": "1.125rem",
    "--font-size-lg": "1.375rem",
    "--font-size-xl": "1.5rem",
    "--font-size-2xl": "1.75rem",
    "--font-size-3xl": "2.125rem",
    "--font-size-4xl": "2.5rem"
  }
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  // Load saved preferences from localStorage
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem("accessibility-font-size");
    return (saved as FontSize) || "normal";
  });
  
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    const saved = localStorage.getItem("accessibility-color-mode");
    return (saved as ColorMode) || "normal";
  });
  
  // For screen reader announcements
  const [announcer, setAnnouncer] = useState<HTMLElement | null>(null);
  
  // For focus trapping
  const [focusTrap, setFocusTrap] = useState<HTMLElement | null>(null);
  const [previousFocus, setPreviousFocus] = useState<Element | null>(null);
  
  // Initialize screen reader announcer element on mount
  useEffect(() => {
    // Create screen reader announcer element if it doesn't exist
    if (!document.getElementById("sr-announcer")) {
      const div = document.createElement("div");
      div.id = "sr-announcer";
      div.setAttribute("aria-live", "polite");
      div.setAttribute("aria-atomic", "true");
      div.className = "sr-only"; // This class hides the element visually
      document.body.appendChild(div);
      setAnnouncer(div);
    } else {
      setAnnouncer(document.getElementById("sr-announcer"));
    }
    
    // Add .sr-only style if it doesn't exist
    if (!document.getElementById("accessibility-styles")) {
      const style = document.createElement("style");
      style.id = "accessibility-styles";
      style.textContent = `
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        body.high-contrast {
          --foreground: #ffffff;
          --background: #000000;
          --primary: #ffff00;
          --primary-foreground: #000000;
          --secondary: #00ffff;
          --secondary-foreground: #000000;
          --accent: #ff00ff;
          --accent-foreground: #000000;
          --destructive: #ff0000;
          --destructive-foreground: #ffffff;
          --muted: #333333;
          --muted-foreground: #ffffff;
          --popover: #000000;
          --popover-foreground: #ffffff;
          --card: #000000;
          --card-foreground: #ffffff;
          --border: #ffffff;
          --input: #333333;
          color-scheme: dark;
        }
        
        .focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Cleanup on unmount
    return () => {
      // Don't remove the announcer or styles as they may be used by other components
    };
  }, []);
  
  // Apply font size changes
  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem("accessibility-font-size", fontSize);
    
    // Apply font size variables to document root
    const root = document.documentElement;
    const fontSizeVars = fontSizeCssVars[fontSize];
    
    Object.entries(fontSizeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [fontSize]);
  
  // Apply color mode changes
  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem("accessibility-color-mode", colorMode);
    
    // Apply color mode class to body
    if (colorMode === "high-contrast") {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }
  }, [colorMode]);
  
  // Focus trap functionality
  useEffect(() => {
    if (!focusTrap) return;
    
    // Save current focus
    if (!previousFocus) {
      setPreviousFocus(document.activeElement);
    }
    
    // Focus the first focusable element in the trap
    const focusableElements = focusTrap.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
    
    // Handle tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (!focusTrap) return;
      
      const focusableElements = Array.from(focusTrap.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )) as HTMLElement[];
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusTrap, previousFocus]);
  
  // Font size adjustment functions
  const increaseFontSize = () => {
    setFontSize(current => {
      if (current === "normal") return "large";
      if (current === "large") return "x-large";
      return current;
    });
  };
  
  const decreaseFontSize = () => {
    setFontSize(current => {
      if (current === "x-large") return "large";
      if (current === "large") return "normal";
      return current;
    });
  };
  
  const resetFontSize = () => {
    setFontSize("normal");
  };
  
  // Color mode toggle
  const toggleHighContrast = () => {
    setColorMode(current => current === "normal" ? "high-contrast" : "normal");
  };
  
  // Screen reader announcement function
  const announce = (message: string, politeness: "polite" | "assertive" = "polite") => {
    if (!announcer) return;
    
    // Update aria-live attribute if needed
    if (announcer.getAttribute("aria-live") !== politeness) {
      announcer.setAttribute("aria-live", politeness);
    }
    
    // Set the message
    announcer.textContent = message;
    
    // Clear after a short delay to allow for repeated announcements
    setTimeout(() => {
      if (announcer.textContent === message) {
        announcer.textContent = "";
      }
    }, 3000);
  };
  
  // Focus trap functions
  const trapFocus = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      setFocusTrap(element);
    }
  };
  
  const releaseFocus = () => {
    if (previousFocus && previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
    setFocusTrap(null);
    setPreviousFocus(null);
  };
  
  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        
        colorMode,
        toggleHighContrast,
        
        announce,
        
        trapFocus,
        releaseFocus,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}