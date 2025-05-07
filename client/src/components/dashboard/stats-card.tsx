import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconClassName?: string;
}

export function StatsCard({ title, value, icon, iconClassName = "bg-primary/10 text-primary" }: StatsCardProps) {
  return (
    <Card className="p-5 shadow-md hover:shadow-lg transition-shadow border-2 border-border overflow-hidden relative group">
      {/* Linha decorativa */}
      <div className={`absolute top-0 left-0 w-full h-1 ${iconClassName.replace('text-', 'bg-')}`}></div>
      
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3.5 rounded-lg ${iconClassName}`}>
          {icon}
        </div>
        <div className="ml-4 flex flex-col">
          <h2 className="text-xl font-bold text-foreground">{value}</h2>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      </div>
      
      {/* Efeito hover */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </Card>
  );
}
