import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileUpIcon, FileTextIcon, FolderIcon, SearchIcon, FilterIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn, formatDate, getStatusClass } from "@/lib/utils";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUpload } from "@/components/documents/document-upload";
import { Document, documentCategoryEnum, documentStatusEnum } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

const searchSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

type SearchValues = z.infer<typeof searchSchema>;

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState("todos");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useState<SearchValues>({ 
    search: "", 
    category: "all", 
    status: "all" 
  });

  const form = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      search: "",
      category: "all",
      status: "all",
    },
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<any[]>({
    queryKey: ['/api/patients'],
    enabled: activeTab === "pacientes"
  });

  const { data: facilities = [], isLoading: isLoadingFacilities } = useQuery<any[]>({
    queryKey: ['/api/facilities'],
    enabled: activeTab === "unidades"
  });

  const onSubmit = (values: SearchValues) => {
    setSearchParams(values);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "todos":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Documentos</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os documentos do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentList 
                  showFilters 
                  showAddButton 
                  className="mt-4" 
                  statusFilter={searchParams.status !== "all" ? searchParams.status : undefined}
                  searchQuery={searchParams.search}
                  categoryFilter={searchParams.category !== "all" ? searchParams.category : undefined}
                />
              </CardContent>
            </Card>
          </div>
        );
      
      case "pacientes":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentos por Paciente</CardTitle>
                <CardDescription>
                  Selecione um paciente para visualizar seus documentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-8">
                  <div className="w-full">
                    <Select
                      value={selectedPatientId?.toString() || ""}
                      onValueChange={(value) => setSelectedPatientId(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingPatients ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          patients?.map((patient: any) => (
                            <SelectItem key={patient.id} value={patient.id.toString()}>
                              {patient.fullName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedPatientId && (
                  <DocumentList 
                    patientId={selectedPatientId} 
                    showFilters 
                    showAddButton 
                    statusFilter={searchParams.status !== "all" ? searchParams.status : undefined}
                    searchQuery={searchParams.search}
                    categoryFilter={searchParams.category !== "all" ? searchParams.category : undefined}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        );
      
      case "unidades":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentos por Unidade</CardTitle>
                <CardDescription>
                  Selecione uma unidade para visualizar seus documentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-8">
                  <div className="w-full">
                    <Select
                      value={selectedFacilityId?.toString() || ""}
                      onValueChange={(value) => setSelectedFacilityId(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingFacilities ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          facilities?.map((facility: any) => (
                            <SelectItem key={facility.id} value={facility.id.toString()}>
                              {facility.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedFacilityId && (
                  <DocumentList 
                    facilityId={selectedFacilityId} 
                    showFilters 
                    showAddButton 
                    statusFilter={searchParams.status !== "all" ? searchParams.status : undefined}
                    searchQuery={searchParams.search}
                    categoryFilter={searchParams.category !== "all" ? searchParams.category : undefined}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        );
      
      case "adicionar":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Novo Documento</CardTitle>
                <CardDescription>
                  Faça upload de um novo documento no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUpload 
                  onUploadSuccess={() => setActiveTab("todos")}
                />
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Conteúdo principal da página
  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">
            Gerencie documentos, visualize relatórios e arquivos dos pacientes
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex space-x-2">
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem className="w-40 md:w-60">
                  <FormControl>
                    <div className="relative">
                      <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Pesquisar..." className="pl-8" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="w-40 md:w-48">
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
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
                <FormItem className="w-36 md:w-44">
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="pending_signature">Aguardando Assinatura</SelectItem>
                      <SelectItem value="signed">Assinado</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" size="icon" variant="secondary">
              <FilterIcon className="h-4 w-4" />
            </Button>
          </form>
        </Form>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos" className="flex items-center space-x-2">
            <FileTextIcon className="h-4 w-4" />
            <span>Todos</span>
          </TabsTrigger>
          <TabsTrigger value="pacientes" className="flex items-center space-x-2">
            <FolderIcon className="h-4 w-4" />
            <span>Por Paciente</span>
          </TabsTrigger>
          <TabsTrigger value="unidades" className="flex items-center space-x-2">
            <FolderIcon className="h-4 w-4" />
            <span>Por Unidade</span>
          </TabsTrigger>
          <TabsTrigger value="adicionar" className="flex items-center space-x-2">
            <FileUpIcon className="h-4 w-4" />
            <span>Adicionar</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          {renderTabContent()}
        </TabsContent>
      </Tabs>
    </div>
  );

  // Envolver em AppLayout para ter acesso à barra lateral
  return (
    <AppLayout>
      {content}
    </AppLayout>
  );
}