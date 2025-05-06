import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Document as DocumentType } from "@shared/schema";
import { DocumentViewer } from "./document-viewer";
import { DocumentUpload } from "./document-upload";
import { Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DocumentListProps {
  patientId?: number;
  facilityId?: number;
  evolutionId?: number;
  appointmentId?: number;
  showFilters?: boolean;
  maxItems?: number;
  showAddButton?: boolean;
  title?: string;
  className?: string;
  statusFilter?: string;
}

export function DocumentList({
  patientId,
  facilityId,
  evolutionId,
  appointmentId,
  showFilters = true,
  maxItems,
  showAddButton = true,
  title = "Documentos",
  className = "",
  statusFilter: initialStatusFilter,
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || "all");
  const [onlyLatestVersions, setOnlyLatestVersions] = useState(true);
  
  // Parâmetros para a consulta
  const queryParams = new URLSearchParams();
  if (patientId) queryParams.append("patientId", String(patientId));
  if (facilityId) queryParams.append("facilityId", String(facilityId));
  if (evolutionId) queryParams.append("evolutionId", String(evolutionId));
  if (appointmentId) queryParams.append("appointmentId", String(appointmentId));
  if (categoryFilter !== "all") queryParams.append("category", categoryFilter);
  if (statusFilter !== "all") queryParams.append("status", statusFilter);
  if (onlyLatestVersions) queryParams.append("onlyLatestVersions", "true");
  queryParams.append("includeUploaderInfo", "true");
  
  // Consulta para buscar documentos
  const {
    data: documents,
    isLoading,
    isError,
    refetch
  } = useQuery<DocumentType[]>({
    queryKey: [`/api/documents?${queryParams.toString()}`],
  });
  
  // Filtra documentos pelo termo de busca
  const filteredDocuments = documents
    ? documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];
  
  // Limita o número de documentos exibidos se necessário
  const displayDocuments = maxItems 
    ? filteredDocuments.slice(0, maxItems) 
    : filteredDocuments;
  
  // Manipula a atualização de um documento (após assinatura, por exemplo)
  const handleDocumentUpdated = () => {
    refetch();
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {documents?.length ?? 0} documentos encontrados
            </CardDescription>
          </div>
          {showAddButton && (
            <DocumentUpload
              patientId={patientId}
              facilityId={facilityId}
              evolutionId={evolutionId}
              appointmentId={appointmentId}
              onUploadSuccess={handleDocumentUpdated}
            />
          )}
        </div>
      </CardHeader>
      
      {showFilters && (
        <CardContent className="pb-0">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Campo de busca */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtros */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filtros</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="p-0 focus:bg-transparent">
                    <div className="px-2 py-1.5 w-full">
                      <Label htmlFor="category-filter">Categoria</Label>
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger id="category-filter" className="mt-1">
                          <SelectValue placeholder="Todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as categorias</SelectItem>
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
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-0 focus:bg-transparent">
                    <div className="px-2 py-1.5 w-full">
                      <Label htmlFor="status-filter">Status</Label>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger id="status-filter" className="mt-1">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="pending_signature">Aguardando Assinatura</SelectItem>
                          <SelectItem value="signed">Assinado</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="p-0 focus:bg-transparent">
                    <div className="px-2 py-1.5 w-full">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="only-latest"
                          checked={onlyLatestVersions}
                          onCheckedChange={setOnlyLatestVersions}
                        />
                        <Label htmlFor="only-latest">Apenas versões mais recentes</Label>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      )}
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-destructive">
            Ocorreu um erro ao carregar os documentos.
          </div>
        ) : displayDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "Nenhum documento encontrado para esta busca."
              : "Nenhum documento disponível."}
          </div>
        ) : (
          <div className="space-y-4">
            {displayDocuments.map((document) => (
              <DocumentViewer
                key={document.id}
                document={document}
                onDocumentSigned={handleDocumentUpdated}
              />
            ))}
          </div>
        )}
      </CardContent>
      
      {maxItems && documents && documents.length > maxItems && (
        <CardFooter className="flex justify-center">
          <Button variant="outline">Ver todos os documentos</Button>
        </CardFooter>
      )}
    </Card>
  );
}