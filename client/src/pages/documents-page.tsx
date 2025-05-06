import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUpload } from "@/components/documents/document-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Building, 
  Calendar, 
  User,
  FileArchive,
  FileCheck,
  FilePenLine,
} from "lucide-react";

export default function DocumentsPage() {
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  
  // Buscar pacientes
  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
  });
  
  // Buscar unidades
  const { data: facilities } = useQuery({
    queryKey: ['/api/facilities'],
  });
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os documentos da clínica
          </p>
        </div>
        <DocumentUpload buttonLabel="Novo Documento" />
      </div>
      
      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros Rápidos</CardTitle>
          <CardDescription>
            Filtre documentos por paciente ou unidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-select" className="block text-sm font-medium mb-1">
                Paciente
              </label>
              <Select
                value={selectedPatient}
                onValueChange={setSelectedPatient}
              >
                <SelectTrigger id="patient-select">
                  <SelectValue placeholder="Selecionar Paciente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pacientes</SelectItem>
                  {patients?.map((patient) => (
                    <SelectItem key={patient.id} value={String(patient.id)}>
                      {patient.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="facility-select" className="block text-sm font-medium mb-1">
                Unidade
              </label>
              <Select
                value={selectedFacility}
                onValueChange={setSelectedFacility}
              >
                <SelectTrigger id="facility-select">
                  <SelectValue placeholder="Selecionar Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {facilities?.map((facility) => (
                    <SelectItem key={facility.id} value={String(facility.id)}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="all">
        <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="need-signature">Aguardando Assinatura</TabsTrigger>
          <TabsTrigger value="signed">Assinados</TabsTrigger>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <DocumentList
            patientId={selectedPatient !== "all" ? parseInt(selectedPatient) : undefined}
            facilityId={selectedFacility !== "all" ? parseInt(selectedFacility) : undefined}
            showAddButton={false}
            title="Todos os Documentos"
          />
        </TabsContent>
        
        <TabsContent value="need-signature">
          <DocumentList
            patientId={selectedPatient !== "all" ? parseInt(selectedPatient) : undefined}
            facilityId={selectedFacility !== "all" ? parseInt(selectedFacility) : undefined}
            showAddButton={false}
            title="Documentos Aguardando Assinatura"
            statusFilter="pending_signature"
          />
        </TabsContent>
        
        <TabsContent value="signed">
          <DocumentList
            patientId={selectedPatient !== "all" ? parseInt(selectedPatient) : undefined}
            facilityId={selectedFacility !== "all" ? parseInt(selectedFacility) : undefined}
            showAddButton={false}
            title="Documentos Assinados"
            statusFilter="signed"
          />
        </TabsContent>
        
        <TabsContent value="recent">
          <DocumentList
            patientId={selectedPatient !== "all" ? parseInt(selectedPatient) : undefined}
            facilityId={selectedFacility !== "all" ? parseInt(selectedFacility) : undefined}
            showAddButton={false}
            title="Documentos Recentes"
            maxItems={10}
          />
        </TabsContent>
      </Tabs>
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Por Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Visualize documentos de pacientes específicos
            </p>
            <Button variant="outline" className="w-full">
              Gerenciar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5" />
              Por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Visualize documentos por unidade
            </p>
            <Button variant="outline" className="w-full">
              Gerenciar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Por Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Documentos relacionados a consultas
            </p>
            <Button variant="outline" className="w-full">
              Gerenciar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Por Evolução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Documentos relacionados a evoluções
            </p>
            <Button variant="outline" className="w-full">
              Gerenciar
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FilePenLine className="w-5 h-5" />
              Aguardando Assinatura
            </CardTitle>
            <CardDescription>
              Documentos que requerem sua assinatura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentList
              statusFilter="pending_signature"
              showFilters={false}
              maxItems={3}
              className="border-0 shadow-none"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Recentemente Assinados
            </CardTitle>
            <CardDescription>
              Últimos documentos assinados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentList
              statusFilter="signed"
              showFilters={false}
              maxItems={3}
              className="border-0 shadow-none"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileArchive className="w-5 h-5" />
              Arquivados
            </CardTitle>
            <CardDescription>
              Documentos arquivados recentemente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentList
              statusFilter="archived"
              showFilters={false}
              maxItems={3}
              className="border-0 shadow-none"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}