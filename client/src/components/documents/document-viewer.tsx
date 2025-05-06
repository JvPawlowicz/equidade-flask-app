import React, { useState } from "react";
import { Document as PdfDocument } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  PenTool, 
  History, 
  Eye, 
  Tag, 
  CalendarClock, 
  User
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DocumentViewerProps {
  document: PdfDocument;
  showActions?: boolean;
  onDocumentSigned?: (document: PdfDocument) => void;
}

export function DocumentViewer({ 
  document, 
  showActions = true,
  onDocumentSigned
}: DocumentViewerProps) {
  const { toast } = useToast();
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const handleSignDocument = async () => {
    if (!document.id) return;
    
    try {
      setIsSigning(true);
      
      const signatureInfo = {
        userInfo: "Assinado eletronicamente"
      };
      
      const response = await apiRequest(
        "PUT", 
        `/api/documents/${document.id}/sign`, 
        { signatureInfo }
      );
      
      if (response.ok) {
        const signedDocument = await response.json();
        
        toast({
          title: "Documento assinado",
          description: "O documento foi assinado com sucesso",
        });
        
        setIsSignDialogOpen(false);
        
        if (onDocumentSigned) {
          onDocumentSigned(signedDocument);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Erro ao assinar documento");
      }
    } catch (error) {
      toast({
        title: "Erro ao assinar documento",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
    }
  };
  
  const renderStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    
    switch (status) {
      case "draft":
        variant = "outline";
        break;
      case "pending_signature":
        variant = "secondary";
        break;
      case "signed":
        variant = "default";
        break;
      case "archived":
        variant = "destructive";
        break;
      default:
        variant = "default";
    }
    
    return (
      <Badge variant={variant}>
        {status === "draft" && "Rascunho"}
        {status === "pending_signature" && "Aguardando Assinatura"}
        {status === "signed" && "Assinado"}
        {status === "archived" && "Arquivado"}
        {status === "active" && "Ativo"}
      </Badge>
    );
  };
  
  const renderCategoryBadge = (category: string) => {
    return (
      <Badge variant="outline" className="bg-primary/10">
        {category === "medical_report" && "Laudo Médico"}
        {category === "exam_result" && "Resultado de Exame"}
        {category === "treatment_plan" && "Plano de Tratamento"}
        {category === "referral" && "Encaminhamento"}
        {category === "legal_document" && "Documento Legal"}
        {category === "consent_form" && "Termo de Consentimento"}
        {category === "evolution_note" && "Nota de Evolução"}
        {category === "administrative" && "Administrativo"}
        {category === "other" && "Outro"}
      </Badge>
    );
  };
  
  return (
    <>
      <Card className="mb-4 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {document.name}
              </CardTitle>
              <CardDescription>
                {document.description || "Sem descrição"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {renderStatusBadge(document.status)}
              {renderCategoryBadge(document.category)}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Criado em: {formatDate(document.createdAt)}
            </div>
            
            {document.uploader && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-4 w-4" />
                Por: {document.uploader.name}
              </div>
            )}
            
            {document.version > 1 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <History className="h-4 w-4" />
                Versão: {document.version}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 flex justify-between">
          <div className="flex gap-2">
            <a 
              href={document.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Visualizar
              </Button>
            </a>
            
            <a 
              href={document.fileUrl} 
              download={document.name}
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </a>
          </div>
          
          {showActions && (
            <div className="flex gap-2">
              <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Tag className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Detalhes do Documento</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="info">
                    <TabsList>
                      <TabsTrigger value="info">Informações</TabsTrigger>
                      <TabsTrigger value="preview">Visualizar</TabsTrigger>
                      {document.versions && document.versions.length > 0 && (
                        <TabsTrigger value="versions">Versões</TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="info">
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div>
                          <h4 className="text-sm font-semibold">Nome:</h4>
                          <p>{document.name}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Status:</h4>
                          <p>{renderStatusBadge(document.status)}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Categoria:</h4>
                          <p>{renderCategoryBadge(document.category)}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Tipo de Arquivo:</h4>
                          <p>{document.fileType}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Tamanho:</h4>
                          <p>{(document.fileSize / 1024).toFixed(2)} KB</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Criado em:</h4>
                          <p>{formatDate(document.createdAt)}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Última atualização:</h4>
                          <p>{formatDate(document.updatedAt)}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">Versão:</h4>
                          <p>{document.version}</p>
                        </div>
                        {document.uploader && (
                          <div>
                            <h4 className="text-sm font-semibold">Enviado por:</h4>
                            <p>{document.uploader.name}</p>
                          </div>
                        )}
                        {document.needsSignature && (
                          <div>
                            <h4 className="text-sm font-semibold">Requer Assinatura:</h4>
                            <p>{document.status === 'signed' ? 'Assinado' : 'Sim, aguardando assinatura'}</p>
                          </div>
                        )}
                        {document.description && (
                          <div className="col-span-2">
                            <h4 className="text-sm font-semibold">Descrição:</h4>
                            <p>{document.description}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="preview">
                      <div className="py-4">
                        <iframe 
                          src={document.fileUrl} 
                          className="w-full h-[60vh] border rounded"
                          title={document.name}
                        />
                      </div>
                    </TabsContent>
                    {document.versions && document.versions.length > 0 && (
                      <TabsContent value="versions">
                        <div className="py-4">
                          <h3 className="text-lg font-semibold mb-2">Histórico de Versões</h3>
                          <div className="space-y-2">
                            {document.versions.map((version) => (
                              <Card key={version.id}>
                                <CardHeader className="py-2">
                                  <CardTitle className="text-sm font-medium">
                                    Versão {version.version} - {formatDate(version.createdAt)}
                                  </CardTitle>
                                </CardHeader>
                                <CardFooter className="py-2">
                                  <div className="flex gap-2">
                                    <a 
                                      href={version.fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                    >
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-3 w-3 mr-1" />
                                        Visualizar
                                      </Button>
                                    </a>
                                  </div>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </DialogContent>
              </Dialog>
              
              {document.needsSignature && document.status !== 'signed' && (
                <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      <PenTool className="h-4 w-4 mr-1" />
                      Assinar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assinar Documento</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="mb-4">
                        Você está prestes a assinar digitalmente o documento "{document.name}".
                        Esta ação não pode ser desfeita.
                      </p>
                      <iframe 
                        src={document.fileUrl} 
                        className="w-full h-[300px] border rounded mb-4"
                        title={document.name}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsSignDialogOpen(false)}
                          disabled={isSigning}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleSignDocument}
                          disabled={isSigning}
                        >
                          {isSigning ? "Assinando..." : "Confirmar Assinatura"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </>
  );
}