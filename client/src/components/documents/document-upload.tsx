import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpIcon, XIcon, AlertTriangleIcon, FileIcon } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Schema de validação do formulário
const uploadSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Selecione uma categoria"),
  status: z.string().min(1, "Selecione um status"),
  needsSignature: z.boolean().optional(),
  file: z.instanceof(File, { message: "Arquivo é obrigatório" }),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface DocumentUploadProps {
  patientId?: number;
  facilityId?: number;
  evolutionId?: number;
  appointmentId?: number;
  // parentDocumentId removido pois não existe no banco
  onUploadSuccess?: (document: any) => void;
  buttonLabel?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function DocumentUpload({
  patientId,
  facilityId,
  evolutionId,
  appointmentId,
  onUploadSuccess,
  buttonLabel = "Upload de Documento",
  buttonVariant = "default"
}: DocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "other",
      status: "active",
      needsSignature: false,
      file: undefined,
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      const formData = new FormData();
      
      // Adicionar campos ao FormData
      formData.append("name", values.name);
      if (values.description) formData.append("description", values.description);
      formData.append("category", values.category);
      formData.append("status", values.status);
      formData.append("needsSignature", String(values.needsSignature));
      formData.append("file", values.file);
      
      if (patientId) formData.append("patientId", patientId.toString());
      if (facilityId) formData.append("facilityId", facilityId.toString());
      if (evolutionId) formData.append("evolutionId", evolutionId.toString());
      if (appointmentId) formData.append("appointmentId", appointmentId.toString());
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        // Não definimos o Content-Type pois o navegador vai definir automaticamente para multipart/form-data
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao enviar o documento");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Documento enviado com sucesso",
        description: "O documento foi adicionado ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      if (onUploadSuccess) onUploadSuccess(data);
      setIsOpen(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: error.message,
      });
    },
  });

  const onSubmit = async (values: UploadFormValues) => {
    uploadMutation.mutate(values);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      form.setValue("file", file);
      
      // Se o nome estiver vazio, usar o nome do arquivo
      if (!form.getValues("name")) {
        form.setValue("name", file.name.split('.')[0]);
      }
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    form.setValue("file", undefined as any);
    form.setError("file", { message: "Arquivo é obrigatório" });
  };

  // Renderizar o conteúdo do modal
  const renderModalContent = () => (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Upload de Documento</DialogTitle>
        <DialogDescription>
          Faça upload de um novo documento no sistema.
        </DialogDescription>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Arquivo</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    {selectedFile ? (
                      <div className="flex items-center p-2 rounded border gap-2 bg-muted/30">
                        <FileIcon className="h-5 w-5 text-primary" />
                        <div className="flex-1 truncate">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={clearSelectedFile}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-4 relative">
                        <label htmlFor="file-upload" className="flex flex-col items-center gap-2 text-center w-full h-full cursor-pointer">
                          <FileUpIcon className="h-8 w-8 text-muted-foreground" />
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium">
                              Clique para selecionar ou arraste e solte
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Formatos suportados: PDF, DOC, DOCX, JPG, PNG
                            </p>
                          </div>
                          <Button type="button" variant="secondary" size="sm" className="mt-2">
                            Escolher arquivo
                          </Button>
                        </label>
                        <Input
                          id="file-upload"
                          type="file"
                          className="sr-only" // Oculto mais ainda acessível
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do documento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Laudo médico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Adicione uma descrição do documento"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="medical_report">Relatório Médico</SelectItem>
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
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="pending_signature">Aguardando Assinatura</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Campo needsSignature não existe no banco mas é usado para criar notificações */}
          <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
            <Checkbox
              id="needsSignature"
              checked={form.watch('needsSignature')}
              onCheckedChange={(checked) => {
                // Convertendo o tipo CheckedState para boolean de forma explícita
                form.setValue('needsSignature', checked ? true : false);
              }}
            />
            <div className="space-y-1 leading-none">
              <Label htmlFor="needsSignature">Requer assinatura</Label>
              <p className="text-sm text-muted-foreground">
                Marque se este documento precisa ser assinado por um supervisor ou coordenador
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? (
                <>Enviando...</>
              ) : (
                <>Enviar documento</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className="flex items-center gap-1">
          <FileUpIcon className="h-4 w-4" />
          <span>{buttonLabel}</span>
        </Button>
      </DialogTrigger>
      {renderModalContent()}
    </Dialog>
  );
}