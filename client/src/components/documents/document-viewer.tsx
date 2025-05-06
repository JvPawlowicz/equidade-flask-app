import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DownloadIcon, FileIcon, PenIcon, FileTextIcon, UserIcon, CalendarIcon, HistoryIcon, InfoIcon } from "lucide-react";
import { Document } from "@shared/schema";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [tab, setTab] = useState("preview");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para lidar com o fechamento do modal
  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  // Obter extensão do arquivo para determinar o tipo de visualização
  const fileExtension = document.fileUrl.split('.').pop()?.toLowerCase() || '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
  const isPDF = fileExtension === 'pdf';

  // Mutação para assinar documentos
  const signMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${document.id}/sign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao assinar documento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Documento assinado com sucesso",
        description: "O documento foi assinado corretamente."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao assinar documento",
        description: error.message
      });
    }
  });

  const handleDownload = () => {
    window.open(document.fileUrl, '_blank');
  };

  const handleSignDocument = () => {
    signMutation.mutate();
  };

  function getCategoryLabel(category: string): string {
    const categories: Record<string, string> = {
      'medical_report': 'Relatório Médico',
      'exam_result': 'Resultado de Exame',
      'treatment_plan': 'Plano de Tratamento',
      'referral': 'Encaminhamento',
      'legal_document': 'Documento Legal',
      'consent_form': 'Termo de Consentimento',
      'evolution_note': 'Nota de Evolução',
      'administrative': 'Administrativo',
      'other': 'Outro'
    };
    
    return categories[category] || category;
  }
  
  function getStatusLabel(status: string): string {
    const statuses: Record<string, string> = {
      'draft': 'Rascunho',
      'pending_signature': 'Aguardando Assinatura',
      'signed': 'Assinado',
      'archived': 'Arquivado',
      'active': 'Ativo'
    };
    
    return statuses[status] || status;
  }
  
  function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case 'draft':
        return "outline";
      case 'pending_signature':
        return "secondary";
      case 'signed':
        return "default";
      case 'archived':
        return "destructive";
      case 'active':
        return "default";
      default:
        return "outline";
    }
  }

  // Renderizar o conteúdo do documento com base no tipo
  const renderDocumentContent = () => {
    if (isImage) {
      return (
        <div className="flex justify-center p-4 bg-muted/20 rounded-md">
          <img 
            src={document.fileUrl} 
            alt={document.name} 
            className="max-h-[60vh] object-contain"
          />
        </div>
      );
    } else if (isPDF) {
      return (
        <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-md h-[60vh]">
          <iframe 
            src={`${document.fileUrl}#view=FitH`} 
            title={document.name}
            className="w-full h-full border-0"
          />
        </div>
      );
    } else {
      // Para outros tipos de documentos que não podem ser exibidos diretamente
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-md h-[300px]">
          <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground mb-2">
            Não é possível visualizar este tipo de documento diretamente.
          </p>
          <Button 
            variant="outline" 
            onClick={handleDownload}
            className="mt-4"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Fazer download
          </Button>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                {document.name}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                {document.description || "Sem descrição disponível"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(document.status)}>
                {getStatusLabel(document.status)}
              </Badge>
              <Badge variant="outline">{getCategoryLabel(document.category)}</Badge>
            </div>
          </div>
        </DialogHeader>
        
        <Separator />
        
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
          <div className="px-6">
            <TabsList className="mt-2">
              <TabsTrigger value="preview" className="flex items-center gap-1.5">
                <FileTextIcon className="h-4 w-4" />
                <span>Visualizar</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-1.5">
                <InfoIcon className="h-4 w-4" />
                <span>Detalhes</span>
              </TabsTrigger>
              {document.versions && document.versions.length > 0 && (
                <TabsTrigger value="history" className="flex items-center gap-1.5">
                  <HistoryIcon className="h-4 w-4" />
                  <span>Histórico</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="preview" className="flex-1 px-6 pb-6 pt-4 m-0">
            <ScrollArea className="h-full">
              {renderDocumentContent()}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="details" className="flex-1 px-6 pb-6 pt-4 m-0">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-sm font-medium flex items-center gap-1.5 mb-3">
                        <FileTextIcon className="h-4 w-4" />
                        <span>Informações do Documento</span>
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nome:</span>
                          <span className="font-medium">{document.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tipo de arquivo:</span>
                          <span className="font-medium">{document.fileType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tamanho:</span>
                          <span className="font-medium">
                            {document.fileSize 
                              ? (document.fileSize / 1024).toFixed(1) + ' KB' 
                              : 'Desconhecido'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Categoria:</span>
                          <span className="font-medium">{getCategoryLabel(document.category)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={getStatusBadgeVariant(document.status)}>
                            {getStatusLabel(document.status)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requer assinatura:</span>
                          <span className="font-medium">{document.needsSignature ? 'Sim' : 'Não'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Versão:</span>
                          <span className="font-medium">{document.version || 1}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-sm font-medium flex items-center gap-1.5 mb-3">
                        <UserIcon className="h-4 w-4" />
                        <span>Informações de Criação</span>
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Adicionado por:</span>
                          <span className="font-medium">
                            {document.uploader?.name || 'Desconhecido'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data de criação:</span>
                          <span className="font-medium">{formatDate(document.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Última atualização:</span>
                          <span className="font-medium">{formatDate(document.updatedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paciente:</span>
                          <span className="font-medium">
                            {document.patient?.fullName || 'Nenhum'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Unidade:</span>
                          <span className="font-medium">
                            {document.facility?.name || 'Nenhuma'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Evolução:</span>
                          <span className="font-medium">
                            {document.evolution?.title || 'Nenhuma'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Consulta:</span>
                          <span className="font-medium">
                            {document.appointment ? formatDate(document.appointment.startTime) : 'Nenhuma'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {document.description && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-sm font-medium mb-2">Descrição</h3>
                      <p className="text-sm text-muted-foreground">
                        {document.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {document.versions && document.versions.length > 0 && (
            <TabsContent value="history" className="flex-1 px-6 pb-6 pt-4 m-0">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-1.5">
                    <HistoryIcon className="h-4 w-4" />
                    <span>Histórico de Versões</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {document.versions.map((version, index) => (
                      <Card key={version.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-medium">
                                Versão {version.version || index + 1}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(version.createdAt)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(version.fileUrl, '_blank')}
                              >
                                <DownloadIcon className="h-3.5 w-3.5 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
        
        <Separator />
        
        <DialogFooter className="p-6 pt-4">
          <div className="flex gap-3 w-full justify-between">
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Download
              </Button>
              
              {document.status === 'pending_signature' && document.needsSignature && (
                <Button 
                  onClick={handleSignDocument}
                  disabled={signMutation.isPending}
                >
                  <PenIcon className="mr-2 h-4 w-4" />
                  {signMutation.isPending ? 'Assinando...' : 'Assinar'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}