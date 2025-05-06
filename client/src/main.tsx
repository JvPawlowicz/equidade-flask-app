import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { AccessibilityProvider } from "@/hooks/use-accessibility";
import { 
  AccessibilityToolbar,
  FocusIndicator, 
} from "@/components/accessibility";

// Versão completa com providers necessários
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AccessibilityProvider>
        <FocusIndicator />
        <App />
        <AccessibilityToolbar />
        <Toaster />
      </AccessibilityProvider>
    </AuthProvider>
  </QueryClientProvider>
);
