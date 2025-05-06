import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconClassName?: string;
}

export function StatsCard({ title, value, icon, iconClassName = "bg-blue-100 text-primary" }: StatsCardProps) {
  return (
    <Card className="p-5 shadow-sm border border-border">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-md ${iconClassName}`}>
          {icon}
        </div>
        <div className="ml-4">
          <h2 className="text-lg font-semibold text-gray-800">{value}</h2>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </div>
    </Card>
  );
}
