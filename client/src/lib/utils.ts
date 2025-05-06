import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, formatString: string = "dd/MM/yyyy"): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, formatString, { locale: ptBR });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

export function formatTimeOnly(date: Date | string | null | undefined): string {
  return formatDate(date, "HH:mm");
}

export function formatTimeRange(startDate: Date | string, endDate: Date | string): string {
  return `${formatTimeOnly(startDate)} - ${formatTimeOnly(endDate)}`;
}

export function formatRelativeTime(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return formatDistance(dateObj, new Date(), { addSuffix: true, locale: ptBR });
  } catch (error) {
    console.error("Error formatting relative date:", error);
    return "";
  }
}

export function getInitials(name: string): string {
  if (!name) return "";
  
  const nameParts = name.split(" ");
  if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
  
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
}

export function getStatusClass(status: string | null | undefined): string {
  if (!status) return "status-pending";
  
  const statusMap: Record<string, string> = {
    "confirmed": "status-confirmed",
    "scheduled": "status-scheduled",
    "completed": "status-completed",
    "cancelled": "status-cancelled",
    "no_show": "status-cancelled",
    "pending": "status-pending"
  };
  
  return statusMap[status] || "status-pending";
}

export function getStatusText(status: string | null | undefined): string {
  if (!status) return "Pendente";
  
  const statusMap: Record<string, string> = {
    "confirmed": "Confirmado",
    "scheduled": "Agendado",
    "completed": "Finalizado",
    "cancelled": "Cancelado",
    "no_show": "Não Compareceu",
    "pending": "Pendente"
  };
  
  return statusMap[status] || "Pendente";
}

export function getProcedureText(procedureType: string): string {
  const procedureMap: Record<string, string> = {
    "psychology_aba": "Psicologia - ABA",
    "psychology_cbt": "Psicologia - TCC",
    "physiotherapy_psychomotor": "Fisioterapia - Psicomotricidade",
    "physiotherapy_conventional": "Fisioterapia - Convencional",
    "speech_therapy": "Fonoaudiologia",
    "occupational_therapy": "Terapia Ocupacional",
    "planning": "Planejamento",
    "free_time": "Horário Livre",
    "other": "Outro"
  };
  
  return procedureMap[procedureType] || "Não especificado";
}

export function calculateAge(dateOfBirth: Date | string | null | undefined): number {
  if (!dateOfBirth) return 0;
  
  try {
    const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
    const today = new Date();
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error("Error calculating age:", error);
    return 0;
  }
}

export function getCurrentLocation(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.split("/")[1].replace("_", " ");
  } catch (error) {
    return "Brasil";
  }
}
