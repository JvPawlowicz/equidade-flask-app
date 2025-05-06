import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileIcon, MoreHorizontalIcon, DownloadIcon, PenIcon, EyeIcon, FileUpIcon, SearchIcon, TrashIcon } from "lucide-react";
import { DocumentUpload } from "./document-upload";
import { DocumentViewer } from "./document-viewer";
import { cn, formatDate, getStatusClass } from "@/lib/utils";
import { Document } from "@shared/schema";
import { Loader2 } from "lucide-react";

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
  categoryFilter?: string;
  searchQuery?: string;
}

export function DocumentList({
  patientId,
  facilityId,
  evolutionId,
  appointmentId,
  showFilters = false,
  maxItems,
  showAddButton = false,
  title,
  className,
  statusFilter,
  categoryFilter,
  searchQuery,
}: DocumentListProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Use the passed filters if provided, otherwise use local state
  const effectiveStatus = statusFilter !== undefined ? statusFilter : status;
  const effectiveCategory = categoryFilter !== undefined ? categoryFilter : category;
  const effectiveSearch = searchQuery !== undefined ? searchQuery : search;

  const queryParams = new URLSearchParams();
  
  if (patientId) queryParams.append('patientId', patientId.toString());
  if (facilityId) queryParams.append('facilityId', facilityId.toString());
  if (evolutionId) queryParams.append('evolutionId', evolutionId.toString());
  if (appointmentId) queryParams.append('appointmentId', appointmentId.toString());
  if (effectiveStatus && effectiveStatus !== 'all') queryParams.append('status', effectiveStatus);
  if (effectiveCategory && effectiveCategory !== 'all') queryParams.append('category', effectiveCategory);
  if (effectiveSearch) queryParams.append('search', effectiveSearch);
  queryParams.append('includeUploaderInfo', 'true');
  queryParams.append('onlyLatestVersions', 'true');
  
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/documents?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar documentos');
      }
      return response.json();
    },
  });

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

  const handleDownload = (document: Document) => {
    window.open(document.fileUrl, '_blank');
  };

  const handleView = (document: Document) => {
    setViewingDocument(document);
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
  };

  const filteredDocuments = maxItems && documents ? documents.slice(0, maxItems) : documents;

  return (
    <div className={cn("space-y-4", className)}>
      {showUploadModal && (
        <DocumentUpload
          patientId={patientId}
          facilityId={facilityId}
          evolutionId={evolutionId}
          appointmentId={appointmentId}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {viewingDocument && (
        <DocumentViewer 
          document={viewingDocument} 
          onClose={() => setViewingDocument(null)} 
        />
      )}

      <div className="flex items-center justify-between">
        {title && <h3 className="text-lg font-medium">{title}</h3>}
        
        {showAddButton && (
          <Button
            onClick={() => setShowUploadModal(true)}
            size="sm"
            className="flex items-center gap-1"
          >
            <FileUpIcon className="h-4 w-4" />
            <span>Upload</span>
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative w-full sm:w-auto flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select
            value={category}
            onValueChange={(value) => setCategory(value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
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
          
          <Select
            value={status}
            onValueChange={(value) => setStatus(value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
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
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
        </div>
      ) : documents && documents.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Adicionado por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.map((doc: Document) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">{doc.name}</span>
                </TableCell>
                <TableCell>{getCategoryLabel(doc.category)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(doc.status)}>
                    {getStatusLabel(doc.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {doc.uploader?.name || 'Desconhecido'}
                </TableCell>
                <TableCell>{formatDate(doc.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleView(doc)}>
                        <EyeIcon className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(doc)}>
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      {doc.status === 'draft' && (
                        <DropdownMenuItem>
                          <PenIcon className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center text-center h-32 border rounded-md bg-muted/10">
          <FileIcon className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            Nenhum documento encontrado
          </p>
          {showAddButton && (
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => setShowUploadModal(true)}
            >
              Adicionar documento
            </Button>
          )}
        </div>
      )}
    </div>
  );
}