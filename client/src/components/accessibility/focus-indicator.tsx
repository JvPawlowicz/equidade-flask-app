import { useEffect } from "react";

/**
 * Focus indicator component that adds visual focus indicators
 * to improve keyboard navigation accessibility.
 */
export function FocusIndicator() {
  useEffect(() => {
    // Add class to body to style focus rings globally
    document.body.classList.add("js-focus-visible");

    // Setup event listeners to detect keyboard navigation vs mouse
    let hadKeyboardEvent = false;
    const keyboardModalityWhitelist = [
      "Tab",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Enter",
      "Space",
      "Escape",
      "Home",
      "End",
      "PageUp",
      "PageDown",
    ];

    // Handler to track keyboard interactions
    function handleKeyDown(e: KeyboardEvent) {
      if (keyboardModalityWhitelist.includes(e.key)) {
        hadKeyboardEvent = true;
        
        // Remove the class from body to show focus outlines
        document.body.classList.add("user-is-tabbing");
      }
    }

    // Handler for mouse interactions to hide focus outlines
    function handleMouseDown() {
      hadKeyboardEvent = false;
      
      // Add the class to body to hide focus outlines
      document.body.classList.remove("user-is-tabbing");
    }

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    
    // Add styles to head
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      /* Hide focus outlines by default (when using mouse) */
      body:not(.user-is-tabbing) button:focus,
      body:not(.user-is-tabbing) input:focus,
      body:not(.user-is-tabbing) select:focus,
      body:not(.user-is-tabbing) textarea:focus,
      body:not(.user-is-tabbing) a:focus,
      body:not(.user-is-tabbing) [tabindex]:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      
      /* Show focus outlines for keyboard users */
      body.user-is-tabbing button:focus,
      body.user-is-tabbing input:focus,
      body.user-is-tabbing select:focus,
      body.user-is-tabbing textarea:focus,
      body.user-is-tabbing a:focus,
      body.user-is-tabbing [tabindex]:focus {
        outline: 2px solid var(--primary) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px var(--background) !important;
      }
    `;
    document.head.appendChild(styleElement);

    // Clean up event listeners on unmount
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
      document.head.removeChild(styleElement);
    };
  }, []);

  return null; // This component doesn't render anything
}