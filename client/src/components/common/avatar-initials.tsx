import { cn } from "@/lib/utils";

interface AvatarInitialsProps {
  name: string;
  className?: string;
}

export function AvatarInitials({ name, className }: AvatarInitialsProps) {
  // Get initials from name
  const getInitials = (name: string): string => {
    if (!name) return "";
    
    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Get color based on name
  const getColorClass = (name: string): string => {
    if (!name) return "bg-gray-100 text-gray-500";
    
    // Create a hash of the name to determine color
    const hash = Array.from(name).reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Use hash to pick from predefined color classes
    const colorClasses = [
      "bg-blue-100 text-blue-600",
      "bg-purple-100 text-purple-600",
      "bg-green-100 text-green-600",
      "bg-amber-100 text-amber-600",
      "bg-red-100 text-red-600",
      "bg-indigo-100 text-indigo-600",
      "bg-pink-100 text-pink-600",
      "bg-teal-100 text-teal-600",
    ];
    
    const index = Math.abs(hash) % colorClasses.length;
    return colorClasses[index];
  };
  
  return (
    <div className={cn(
      "flex items-center justify-center font-medium",
      getColorClass(name),
      className
    )}>
      {getInitials(name)}
    </div>
  );
}
