import { AppLayout } from "@/components/layout/app-layout";
import { ChatInterface } from "@/components/chat/chat-interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Chat</h1>
        <p className="text-gray-600">Comunique-se com outros profissionais e equipes</p>
      </div>

      <Card className="h-[calc(100vh-12rem)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <MessageSquare className="mr-2 h-5 w-5" />
            Mensagens
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-0 h-[calc(100%-4rem)]">
          <ChatInterface />
        </CardContent>
      </Card>
    </AppLayout>
  );
}
