import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, FileText, MessageCircle, Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect, useRef } from "react";

interface NotificationsDropdownProps {
  onClose: () => void;
}

export function NotificationsDropdown({ onClose }: NotificationsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: notifications, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });
  
  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
  
  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });
  
  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });
  
  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    markAsReadMutation.mutate(notification.id);
    
    // Navigate based on notification type
    if (notification.type === "appointment") {
      window.location.href = `/agenda?appointment=${notification.referenceId}`;
    } else if (notification.type === "evolution_required" || notification.type === "evolution_approval") {
      window.location.href = `/evolucoes?id=${notification.referenceId}`;
    } else if (notification.type === "message" || notification.type === "group_message") {
      window.location.href = `/chat`;
    }
    
    onClose();
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return <Calendar className="text-blue-500" />;
      case "evolution_required":
      case "evolution_approval":
      case "evolution_status":
        return <FileText className="text-amber-500" />;
      case "message":
      case "group_message":
      case "group_added":
        return <MessageCircle className="text-green-500" />;
      default:
        return <Bell className="text-gray-500" />;
    }
  };
  
  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 bg-white rounded-md shadow-lg border border-gray-200 w-80 z-50"
    >
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Erro ao carregar notificações
          </div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                !notification.isRead ? "bg-blue-50" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-500">{notification.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">
            Nenhuma notificação
          </div>
        )}
      </div>
      
      {notifications && notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 flex justify-between items-center">
          <Button
            variant="link"
            className="text-xs text-primary hover:underline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Marcando...
              </>
            ) : (
              "Marcar todas como lidas"
            )}
          </Button>
          <Button
            variant="link"
            className="text-xs text-primary hover:underline"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}
