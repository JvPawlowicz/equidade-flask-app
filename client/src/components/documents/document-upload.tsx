import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileUpIcon, Loader2 } from "lucide-react";

// Define o esquema de validação do formulário
const uploadSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  description: z.string().optional(),
  category: z.string(),
  status: z.string().optional(),
  patientId: z.string().optional(),
  facilityId: z.string().optional(),
  evolutionId: z.string().optional(),
  appointmentId: z.string().optional(),
  needsSignature: z.boolean().optional(),
  parentDocumentId: z.string().optional()
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface DocumentUploadProps {
  patientId?: number;
  facilityId?: number;
  evolutionId?: number;
  appointmentId?: number;
  parentDocumentId?: number;
  onUploadSuccess?: (document: any) => void;
  buttonLabel?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function DocumentUpload({
  patientId,
  facilityId,
  evolutionId,
  appointmentId,
  parentDocumentId,
  onUploadSuccess,
  buttonLabel = "Novo Documento",
  buttonVariant = "default"
}: DocumentUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Inicializa o formulário com os valores padrão
  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "other",
      status: "active",
      patientId: patientId ? String(patientId) : undefined,
      facilityId: facilityId ? String(facilityId) : undefined,
      evolutionId: evolutionId ? String(evolutionId) : undefined,
      appointmentId: appointmentId ? String(appointmentId) : undefined,
      needsSignature: false,
      parentDocumentId: parentDocumentId ? String(parentDocumentId) : undefined
    },
  });
  
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Se o nome do documento estiver vazio, preenche com o nome do arquivo
      if (!form.getValues().name) {
        // Remove a extensão do arquivo
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, "");
        form.setValue("name", fileName);
      }
    }
  };
  
  const onSubmit = async (values: UploadFormValues) => {
    if (!file) {
      toast({
        title: "Arquivo necessário",
        description: "Por favor, selecione um arquivo para upload",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Criar um FormData para enviar o arquivo
      const formData = new FormData();
      formData.append("file", file);
      
      // Adicionar todos os valores do formulário
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          formData.append(key, String(value));
        }
      });
      
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao fazer upload do documento");
      }
      
      const document = await response.json();
      
      toast({
        title: "Upload bem-sucedido",
        description: "Documento enviado com sucesso",
      });
      
      // Limpa o formulário e fecha o diálogo
      form.reset();
      setFile(null);
      setOpen(false);
      
      // Invalida a query de documentos para recarregar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      // Notifica o componente pai sobre o upload bem-sucedido
      if (onUploadSuccess) {
        onUploadSuccess(document);
      }
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>
          <FileUpIcon className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload de Documento</DialogTitle>
          <DialogDescription>
            Faça upload de um novo documento para o sistema.
            {parentDocumentId && " Este documento será registrado como uma nova versão."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo para seleção de arquivo */}
            <div className="grid w-full max-w-md items-center gap-1.5">
              <Label htmlFor="file" className="text-left">Arquivo</Label>
              <Input 
                id="file" 
                type="file" 
                accept=".pdf,.doc,.docx" 
                onChange={onFileChange}
                disabled={isUploading}
                required
              />
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: PDF, DOC, DOCX. Tamanho máximo: 10MB.
              </p>
            </div>
            
            {/* Campo para nome do documento */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nome do Documento</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do documento" {...field} disabled={isUploading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Campo para descrição do documento */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o documento" 
                      className="resize-none" 
                      {...field} 
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Campo para categoria do documento */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isUploading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="medical_report">Laudo Médico</SelectItem>
                      <SelectItem value="exam_result">Resultado de Exame</SelectItem>
                      <SelectItem value="treatment_plan">Plano de Tratamento</SelectItem>
                      <SelectItem value="referral">Encaminhamento</SelectItem>
                      <SelectItem value="legal_document">Documento Legal</SelectItem>
                      <SelectItem value="consent_form">Termo de Consentimento</SelectItem>
                      <SelectItem value="evolution_note">Nota de Evolução</SelectItem>
                      <SelectItem value="administrative">Administrativo</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Opção de assinatura */}
            <FormField
              control={form.control}
              name="needsSignature"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Requer Assinatura</FormLabel>
                    <FormDescription>
                      Selecione se este documento necessita de uma assinatura eletrônica
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isUploading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* Campos ocultos para IDs relacionados */}
            {patientId && (
              <input type="hidden" name="patientId" value={patientId} />
            )}
            {facilityId && (
              <input type="hidden" name="facilityId" value={facilityId} />
            )}
            {evolutionId && (
              <input type="hidden" name="evolutionId" value={evolutionId} />
            )}
            {appointmentId && (
              <input type="hidden" name="appointmentId" value={appointmentId} />
            )}
            {parentDocumentId && (
              <input type="hidden" name="parentDocumentId" value={parentDocumentId} />
            )}
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading || !file}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Documento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}