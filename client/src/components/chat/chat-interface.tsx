import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { Loader2, Users, UserPlus, Send, PlusCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { webSocketManager } from "@/lib/websocket";

export function ChatInterface() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("direct");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery<any[]>({
    queryKey: ["/api/user"],
  });
  
  // Fetch chat groups
  const { data: groups, isLoading: isLoadingGroups } = useQuery<any[]>({
    queryKey: ["/api/chat/groups"],
  });
  
  // Fetch messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery<any[]>({
    queryKey: [
      selectedTab === "direct" && selectedUserId
        ? `/api/chat/messages?userId=${selectedUserId}`
        : selectedTab === "group" && selectedGroupId
        ? `/api/chat/messages?groupId=${selectedGroupId}`
        : null
    ],
    enabled: (selectedTab === "direct" && !!selectedUserId) || (selectedTab === "group" && !!selectedGroupId),
  });
  
  // Set up WebSocket connection
  useEffect(() => {
    if (!user) return;
    
    // Conectar ao WebSocket
    webSocketManager.connect(user);
    
    // Ouvir mensagens
    const handleNewMessage = (data: any) => {
      // Check if this is a message for the current conversation
      const isCurrentConversation = (
        (selectedTab === "direct" && data.message.senderId === selectedUserId && data.message.recipientId === user.id) ||
        (selectedTab === "group" && data.message.groupId === selectedGroupId)
      );
      
      if (isCurrentConversation) {
        // Add message to the current conversation
        queryClient.setQueryData(
          [
            selectedTab === "direct"
              ? `/api/chat/messages?userId=${selectedUserId}`
              : `/api/chat/messages?groupId=${selectedGroupId}`
          ],
          (oldData: any[] | undefined) => {
            if (!oldData) return [data.message];
            return [...oldData, data.message];
          }
        );
      }
      
      // Always invalidate to update unread counts, etc.
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    };
    
    // Registrar listeners
    webSocketManager.on('new_message', handleNewMessage);
    webSocketManager.on('new_group_message', handleNewMessage);
    
    return () => {
      // Remover listeners ao desmontar
      webSocketManager.off('new_message', handleNewMessage);
      webSocketManager.off('new_group_message', handleNewMessage);
    };
  }, [user, selectedTab, selectedUserId, selectedGroupId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle sending a message
  const sendMessage = () => {
    if (!message.trim() || !webSocketManager.isConnected()) return;
    
    if (selectedTab === "direct" && selectedUserId) {
      // Enviar mensagem direta
      webSocketManager.sendChatMessage(message, selectedUserId);
    } else if (selectedTab === "group" && selectedGroupId) {
      // Enviar mensagem para grupo
      webSocketManager.sendChatMessage(message, undefined, selectedGroupId);
    }
    
    // Adicionar a mensagem localmente antes da confirmação do servidor para UI mais responsiva
    queryClient.setQueryData(
      [
        selectedTab === "direct"
          ? `/api/chat/messages?userId=${selectedUserId}`
          : `/api/chat/messages?groupId=${selectedGroupId}`
      ],
      (oldData: any[] | undefined) => {
        const newMessage = {
          id: `temp-${Date.now()}`, // ID temporário
          senderId: user?.id,
          recipientId: selectedTab === "direct" ? selectedUserId : null,
          groupId: selectedTab === "group" ? selectedGroupId : null,
          content: message,
          createdAt: new Date().toISOString(),
          isRead: false
        };
        
        if (!oldData) return [newMessage];
        return [...oldData, newMessage];
      }
    );
    
    setMessage("");
  };
  
  // Handle creating a new group
  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    try {
      const response = await fetch("/api/chat/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          memberIds: selectedMembers,
        }),
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Falha ao criar grupo");
      
      const newGroup = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/chat/groups"] });
      setShowNewGroupDialog(false);
      setNewGroupName("");
      setSelectedMembers([]);
      setSelectedTab("group");
      setSelectedGroupId(newGroup.id);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };
  
  // Filter users (don't show current user)
  const filteredUsers = users?.filter(u => u.id !== user?.id) || [];
  
  return (
    <div className="h-full flex flex-col">
      <Tabs 
        defaultValue="direct" 
        value={selectedTab} 
        onValueChange={setSelectedTab}
        className="h-full flex flex-col"
      >
        <div className="border-b pb-2">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Direto
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Grupos
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 flex overflow-hidden mt-4">
          {/* Users/Groups List */}
          <Card className="w-1/3 mr-4 overflow-hidden">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium">
                  {selectedTab === "direct" ? "Contatos" : "Grupos"}
                </h3>
                {selectedTab === "group" && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setShowNewGroupDialog(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <TabsContent value="direct" className="m-0 h-full">
                  {isLoadingUsers ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Nenhum usuário encontrado
                    </div>
                  ) : (
                    <div>
                      {filteredUsers.map((contact) => (
                        <div
                          key={contact.id}
                          className={`p-4 border-b flex items-center hover:bg-gray-50 cursor-pointer ${
                            selectedUserId === contact.id ? "bg-blue-50" : ""
                          }`}
                          onClick={() => setSelectedUserId(contact.id)}
                        >
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={contact.profileImageUrl || undefined} alt={contact.fullName} />
                            <AvatarFallback>
                              <AvatarInitials name={contact.fullName} />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{contact.fullName}</div>
                            <div className="text-xs text-gray-500 capitalize">{contact.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="group" className="m-0 h-full">
                  {isLoadingGroups ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : !groups || groups.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Nenhum grupo encontrado
                    </div>
                  ) : (
                    <div>
                      {groups.map((group) => (
                        <div
                          key={group.id}
                          className={`p-4 border-b flex items-center hover:bg-gray-50 cursor-pointer ${
                            selectedGroupId === group.id ? "bg-blue-50" : ""
                          }`}
                          onClick={() => setSelectedGroupId(group.id)}
                        >
                          <div className="h-10 w-10 mr-3 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="font-medium">{group.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </CardContent>
          </Card>
          
          {/* Chat Area */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="p-0 flex flex-col h-full">
              {/* Chat Header */}
              <div className="p-4 border-b">
                {selectedTab === "direct" && selectedUserId ? (
                  filteredUsers.find(u => u.id === selectedUserId) ? (
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage 
                          src={filteredUsers.find(u => u.id === selectedUserId)?.profileImageUrl || undefined} 
                          alt={filteredUsers.find(u => u.id === selectedUserId)?.fullName} 
                        />
                        <AvatarFallback>
                          <AvatarInitials name={filteredUsers.find(u => u.id === selectedUserId)?.fullName || ""} />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {filteredUsers.find(u => u.id === selectedUserId)?.fullName}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {filteredUsers.find(u => u.id === selectedUserId)?.role}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 flex items-center text-gray-500">
                      Usuário não encontrado
                    </div>
                  )
                ) : selectedTab === "group" && selectedGroupId ? (
                  groups?.find(g => g.id === selectedGroupId) ? (
                    <div className="flex items-center">
                      <div className="h-10 w-10 mr-3 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="font-medium">
                        {groups.find(g => g.id === selectedGroupId)?.name}
                      </div>
                    </div>
                  ) : (
                    <div className="h-10 flex items-center text-gray-500">
                      Grupo não encontrado
                    </div>
                  )
                ) : (
                  <div className="h-10 flex items-center text-gray-500">
                    Selecione um contato ou grupo para iniciar uma conversa
                  </div>
                )}
              </div>
              
              {/* Messages */}
              <div 
                ref={messageContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    Nenhuma mensagem. Comece a conversa!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.senderId === user?.id
                            ? "bg-primary text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                        }`}
                      >
                        {msg.senderId !== user?.id && (
                          <div className="text-xs font-medium mb-1">
                            {filteredUsers.find(u => u.id === msg.senderId)?.fullName || "Usuário"}
                          </div>
                        )}
                        <div>{msg.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            msg.senderId === user?.id ? "text-primary-foreground/80" : "text-gray-500"
                          }`}
                        >
                          {formatRelativeTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t">
                {(selectedTab === "direct" && selectedUserId) ||
                 (selectedTab === "group" && selectedGroupId) ? (
                  <div className="flex">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="resize-none mr-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button
                      className="h-full"
                      disabled={!message.trim()}
                      onClick={sendMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500">
                    Selecione um contato ou grupo para enviar mensagens
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
      
      {/* New Group Dialog */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Grupo</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Digite o nome do grupo"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Membros</label>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 border-b flex items-center last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => {
                        if (selectedMembers.includes(user.id)) {
                          setSelectedMembers(selectedMembers.filter(id => id !== user.id));
                        } else {
                          setSelectedMembers([...selectedMembers, user.id]);
                        }
                      }}
                      className="mr-3"
                    />
                    <label
                      htmlFor={`user-${user.id}`}
                      className="flex items-center flex-1 cursor-pointer"
                    >
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.fullName} />
                        <AvatarFallback>
                          <AvatarInitials name={user.fullName} />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{user.fullName}</div>
                        <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewGroupDialog(false);
                setNewGroupName("");
                setSelectedMembers([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={createGroup}
              disabled={!newGroupName.trim() || selectedMembers.length === 0}
            >
              Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
