import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

// Versão simplificada sem providers complexos
createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
