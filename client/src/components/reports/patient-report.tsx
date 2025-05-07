import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ReportExporter } from "./report-exporter";
import { StatisticsExport } from "./statistics-export";
import { Loader2, BarChart2, UserCheck, Calendar, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime, calculateAge } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface PatientReportProps {
  patientId: number;
}

export function PatientReport({ patientId }: PatientReportProps) {
  const [reportType, setReportType] = useState<string>("summary");
  const [timeRange, setTimeRange] = useState<string>("last_3_months");
  
  // Calcular datas com base no período selecionado
  const getDateRange = (): { startDate: string; endDate: string } => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case "last_month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "last_3_months":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "last_6_months":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "last_year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "all_time":
        startDate = new Date(0); // Início do tempo Unix
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 3);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };
  
  const { startDate, endDate } = getDateRange();
  
  // Buscar dados do paciente
  const { data: patient, isLoading: isLoadingPatient } = useQuery<any>({
    queryKey: [`/api/patients/${patientId}`],
  });
  
  // Buscar agendamentos do paciente
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<any[]>({
    queryKey: [`/api/appointments?patientId=${patientId}&startDate=${startDate}&endDate=${endDate}`],
  });
  
  // Buscar evoluções do paciente
  const { data: evolutions, isLoading: isLoadingEvolutions } = useQuery<any[]>({
    queryKey: [`/api/evolutions?patientId=${patientId}&startDate=${startDate}&endDate=${endDate}`],
  });
  
  // Buscar documentos do paciente
  const { data: documents, isLoading: isLoadingDocuments } = useQuery<any[]>({
    queryKey: [`/api/documents?patientId=${patientId}`],
  });
  
  // Calcular estatísticas
  const calculateStatistics = () => {
    if (!appointments || !evolutions) return null;
    
    // Agendamentos por status
    const appointmentsByStatus: Record<string, number> = {};
    appointments.forEach(appointment => {
      const status = appointment.status || "pending";
      appointmentsByStatus[status] = (appointmentsByStatus[status] || 0) + 1;
    });
    
    // Agendamentos por procedimento
    const appointmentsByProcedure: Record<string, number> = {};
    appointments.forEach(appointment => {
      const procedure = appointment.procedureType || "other";
      appointmentsByProcedure[procedure] = (appointmentsByProcedure[procedure] || 0) + 1;
    });
    
    // Agendamentos por profissional
    const appointmentsByProfessional: Record<string, number> = {};
    appointments.forEach(appointment => {
      if (appointment.professional?.user?.fullName) {
        const professional = appointment.professional.user.fullName;
        appointmentsByProfessional[professional] = (appointmentsByProfessional[professional] || 0) + 1;
      }
    });
    
    // Evoluções por mês
    const evolutionsByMonth: Record<string, number> = {};
    evolutions.forEach(evolution => {
      const date = new Date(evolution.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      evolutionsByMonth[monthYear] = (evolutionsByMonth[monthYear] || 0) + 1;
    });
    
    return {
      appointmentsByStatus: Object.entries(appointmentsByStatus).map(([status, count]) => ({
        name: getStatusName(status),
        value: count
      })),
      appointmentsByProcedure: Object.entries(appointmentsByProcedure).map(([procedure, count]) => ({
        name: getProcedureName(procedure),
        value: count
      })),
      appointmentsByProfessional: Object.entries(appointmentsByProfessional).map(([professional, count]) => ({
        name: professional,
        value: count
      })),
      evolutionsByMonth: Object.entries(evolutionsByMonth).map(([month, count]) => ({
        name: formatMonthYear(month),
        value: count
      })).sort((a, b) => {
        const [monthA, yearA] = a.name.split('/');
        const [monthB, yearB] = b.name.split('/');
        return new Date(Number(yearA), Number(monthA) - 1).getTime() - 
               new Date(Number(yearB), Number(monthB) - 1).getTime();
      }),
    };
  };
  
  const statistics = calculateStatistics();
  
  // Exportar relatório completo do paciente
  const exportFullReport = () => {
    if (!patient || !appointments || !evolutions || !documents) return;
    
    const doc = new jsPDF();
    let yPos = 15;
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255);
    doc.text("Relatório Completo do Paciente", 105, yPos, { align: 'center' });
    yPos += 10;
    
    // Informações do paciente
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("Dados do Paciente", 14, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(`Nome: ${patient.fullName}`, 14, yPos);
    yPos += 5;
    
    doc.text(`Data de Nascimento: ${formatDate(patient.dateOfBirth)} (${calculateAge(patient.dateOfBirth)} anos)`, 14, yPos);
    yPos += 5;
    
    doc.text(`CPF: ${patient.documentNumber || 'Não informado'}`, 14, yPos);
    yPos += 5;
    
    doc.text(`Telefone: ${patient.phone || 'Não informado'}`, 14, yPos);
    yPos += 5;
    
    doc.text(`Email: ${patient.email || 'Não informado'}`, 14, yPos);
    yPos += 5;
    
    doc.text(`Endereço: ${patient.address || 'Não informado'}`, 14, yPos);
    yPos += 5;
    
    doc.text(`Plano de Saúde: ${patient.insurancePlan?.name || 'Não informado'}`, 14, yPos);
    yPos += 5;
    
    doc.text(`Número da Carteirinha: ${patient.insuranceNumber || 'Não informado'}`, 14, yPos);
    yPos += 10;
    
    // Adicionar estatísticas de agendamentos
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text(`Histórico de Agendamentos (${appointments.length})`, 14, yPos);
    yPos += 10;
    
    // Tabela de agendamentos
    if (appointments.length > 0) {
      const appointmentData = appointments.map(appointment => [
        formatDate(appointment.startTime),
        `${formatDate(appointment.startTime, "HH:mm")} - ${formatDate(appointment.endTime, "HH:mm")}`,
        appointment.professional?.user?.fullName || "N/A",
        getProcedureName(appointment.procedureType),
        getStatusName(appointment.status)
      ]);
      
      autoTable(doc, {
        head: [['Data', 'Horário', 'Profissional', 'Procedimento', 'Status']],
        body: appointmentData,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 98, 255], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
      
      // Atualizar posição Y após a tabela
      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.text("Nenhum agendamento encontrado no período.", 14, yPos);
      yPos += 10;
    }
    
    // Verificar se precisa adicionar nova página
    if (yPos > 250) {
      doc.addPage();
      yPos = 15;
    }
    
    // Adicionar evoluções
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text(`Evoluções (${evolutions.length})`, 14, yPos);
    yPos += 10;
    
    if (evolutions.length > 0) {
      // Limitando o número de evoluções para não sobrecarregar o relatório
      const evolutionsToShow = evolutions.slice(0, 10);
      
      evolutionsToShow.forEach((evolution, index) => {
        // Verificar se precisa adicionar nova página
        if (yPos > 250) {
          doc.addPage();
          yPos = 15;
        }
        
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Evolução #${index + 1} - ${formatDateTime(evolution.date)}`, 14, yPos);
        yPos += 5;
        
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(`Profissional: ${evolution.professional?.user?.fullName || 'N/A'}`, 14, yPos);
        yPos += 4;
        
        // Limitar o conteúdo da evolução
        const content = evolution.content || 'Sem conteúdo';
        const maxLength = 200;
        const truncatedContent = content.length > maxLength 
          ? content.substring(0, maxLength) + '...' 
          : content;
        
        doc.text(`Conteúdo: ${truncatedContent}`, 14, yPos);
        yPos += 8;
      });
      
      if (evolutions.length > 10) {
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(`* Mostrando 10 de ${evolutions.length} evoluções. Veja o relatório completo de evoluções para mais detalhes.`, 14, yPos);
        yPos += 8;
      }
    } else {
      doc.setFontSize(10);
      doc.text("Nenhuma evolução encontrada no período.", 14, yPos);
      yPos += 10;
    }
    
    // Adicionar numeração de páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      // Adicionar rodapé
      doc.text(
        `Relatório gerado em: ${formatDateTime(new Date())} - Clínica Equidade`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }
    
    // Salvar o PDF
    doc.save(`relatorio_${patient.fullName.replace(/\s+/g, '_')}.pdf`);
  };
  
  // Loading state
  if (isLoadingPatient) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Carregando dados do paciente...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Se não encontrou o paciente
  if (!patient) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-500">Paciente não encontrado.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{patient.fullName}</h2>
          <p className="text-gray-500">
            {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)} anos) • {patient.insurancePlan?.name || "Sem plano"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Último mês</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
              <SelectItem value="last_year">Último ano</SelectItem>
              <SelectItem value="all_time">Todo o histórico</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportFullReport} variant="outline" className="gap-2" size="sm">
            <FileText className="h-4 w-4" />
            Relatório Completo
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                Agendamentos
              </CardTitle>
              <p className="text-2xl font-bold">{appointments?.length || 0}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {isLoadingAppointments 
                ? "Carregando..."
                : `Total no período selecionado (${formatDate(startDate)} - ${formatDate(endDate)})`
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-500" />
                Evoluções
              </CardTitle>
              <p className="text-2xl font-bold">{evolutions?.length || 0}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {isLoadingEvolutions 
                ? "Carregando..."
                : `Total no período selecionado (${formatDate(startDate)} - ${formatDate(endDate)})`
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-purple-500" />
                Taxa de Presença
              </CardTitle>
              <p className="text-2xl font-bold">
                {isLoadingAppointments
                  ? "-"
                  : calculateAttendanceRate(appointments || [])
                }
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {isLoadingAppointments 
                ? "Carregando..."
                : "Percentual de comparecimento aos agendamentos"
              }
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="mb-4">
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="evolutions">Evoluções</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {statistics && (
              <>
                <StatisticsExport
                  data={statistics.appointmentsByStatus}
                  title="Agendamentos por Status"
                  description="Distribuição dos agendamentos por status"
                  defaultChartType="pie"
                  availableChartTypes={["pie", "bar", "table"]}
                  pieDataKey="value"
                  pieNameKey="name"
                  isLoading={isLoadingAppointments}
                  exportFilename={`paciente_${patientId}_agendamentos_status`}
                  extraInfo={[
                    { label: "Paciente", value: patient.fullName },
                    { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                  ]}
                />
                
                <StatisticsExport
                  data={statistics.appointmentsByProcedure}
                  title="Agendamentos por Procedimento"
                  description="Distribuição dos agendamentos por tipo de procedimento"
                  defaultChartType="pie"
                  availableChartTypes={["pie", "bar", "table"]}
                  pieDataKey="value"
                  pieNameKey="name"
                  isLoading={isLoadingAppointments}
                  exportFilename={`paciente_${patientId}_agendamentos_procedimento`}
                  extraInfo={[
                    { label: "Paciente", value: patient.fullName },
                    { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                  ]}
                />
                
                <StatisticsExport
                  data={statistics.appointmentsByProfessional}
                  title="Agendamentos por Profissional"
                  description="Distribuição dos agendamentos por profissional"
                  defaultChartType="bar"
                  availableChartTypes={["bar", "pie", "table"]}
                  pieDataKey="value"
                  pieNameKey="name"
                  isLoading={isLoadingAppointments}
                  exportFilename={`paciente_${patientId}_agendamentos_profissional`}
                  extraInfo={[
                    { label: "Paciente", value: patient.fullName },
                    { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                  ]}
                />
                
                <StatisticsExport
                  data={statistics.evolutionsByMonth}
                  title="Evoluções por Mês"
                  description="Quantidade de evoluções registradas por mês"
                  defaultChartType="line"
                  availableChartTypes={["line", "bar", "area", "table"]}
                  isLoading={isLoadingEvolutions}
                  exportFilename={`paciente_${patientId}_evolucoes_mes`}
                  extraInfo={[
                    { label: "Paciente", value: patient.fullName },
                    { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                  ]}
                />
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Histórico de Agendamentos</CardTitle>
                <div className="flex gap-2">
                  <ReportExporter
                    data={appointments || []}
                    type="csv"
                    filename={`agendamentos_${patient.fullName.replace(/\s+/g, '_')}`}
                    title="Histórico de Agendamentos"
                    columns={["date", "time", "professionalName", "procedureType", "status", "notes"]}
                    columnsLabels={{
                      date: "Data",
                      time: "Horário",
                      professionalName: "Profissional",
                      procedureType: "Procedimento",
                      status: "Status",
                      notes: "Observações"
                    }}
                    extraInfo={[
                      { label: "Paciente", value: patient.fullName },
                      { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                    ]}
                    buttonText="CSV"
                    showIcon={false}
                    size="sm"
                  />
                  <ReportExporter
                    data={appointments || []}
                    type="excel"
                    filename={`agendamentos_${patient.fullName.replace(/\s+/g, '_')}`}
                    title="Histórico de Agendamentos"
                    columns={["date", "time", "professionalName", "procedureType", "status", "notes"]}
                    columnsLabels={{
                      date: "Data",
                      time: "Horário",
                      professionalName: "Profissional",
                      procedureType: "Procedimento",
                      status: "Status",
                      notes: "Observações"
                    }}
                    extraInfo={[
                      { label: "Paciente", value: patient.fullName },
                      { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                    ]}
                    buttonText="Excel"
                    showIcon={false}
                    size="sm"
                  />
                  <ReportExporter
                    data={appointments || []}
                    type="pdf"
                    filename={`agendamentos_${patient.fullName.replace(/\s+/g, '_')}`}
                    title="Histórico de Agendamentos"
                    columns={["date", "time", "professionalName", "procedureType", "status", "notes"]}
                    columnsLabels={{
                      date: "Data",
                      time: "Horário",
                      professionalName: "Profissional",
                      procedureType: "Procedimento",
                      status: "Status",
                      notes: "Observações"
                    }}
                    extraInfo={[
                      { label: "Paciente", value: patient.fullName },
                      { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                    ]}
                    buttonText="PDF"
                    showIcon={false}
                    size="sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAppointments ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : appointments && appointments.length > 0 ? (
                <div className="rounded border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-blue-50">
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Data</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Horário</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Profissional</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Procedimento</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border-b text-gray-800">
                              {formatDate(appointment.startTime)}
                            </td>
                            <td className="py-2 px-4 border-b text-gray-800">
                              {`${formatDate(appointment.startTime, "HH:mm")} - ${formatDate(appointment.endTime, "HH:mm")}`}
                            </td>
                            <td className="py-2 px-4 border-b text-gray-800">
                              {appointment.professional?.user?.fullName || "N/A"}
                            </td>
                            <td className="py-2 px-4 border-b text-gray-800">
                              {getProcedureName(appointment.procedureType)}
                            </td>
                            <td className="py-2 px-4 border-b">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(appointment.status)}`}>
                                {getStatusName(appointment.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Nenhum agendamento encontrado no período selecionado.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="evolutions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Evoluções</CardTitle>
                <div className="flex gap-2">
                  <ReportExporter
                    data={evolutions || []}
                    type="pdf"
                    filename={`evolucoes_${patient.fullName.replace(/\s+/g, '_')}`}
                    title="Relatório de Evoluções"
                    extraInfo={[
                      { label: "Paciente", value: patient.fullName },
                      { label: "Período", value: `${formatDate(startDate)} - ${formatDate(endDate)}` }
                    ]}
                    buttonText="PDF"
                    showIcon={false}
                    size="sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingEvolutions ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : evolutions && evolutions.length > 0 ? (
                <div className="space-y-4">
                  {evolutions.map((evolution) => (
                    <Card key={evolution.id} className="overflow-hidden">
                      <CardHeader className="py-3 px-4 bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-sm font-medium">
                              {formatDateTime(evolution.date)}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Profissional: {evolution.professional?.user?.fullName || "N/A"}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEvolutionStatusClass(evolution.status)}`}>
                            {getEvolutionStatusName(evolution.status)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4">
                        <p className="text-sm whitespace-pre-line">{evolution.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Nenhuma evolução encontrada no período selecionado.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Documentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="rounded border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-blue-50">
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Nome</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Categoria</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Data</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Status</th>
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((document) => (
                          <tr key={document.id} className="hover:bg-gray-50">
                            <td className="py-2 px-4 border-b text-gray-800">
                              {document.name}
                            </td>
                            <td className="py-2 px-4 border-b text-gray-800">
                              {getDocumentCategoryName(document.category)}
                            </td>
                            <td className="py-2 px-4 border-b text-gray-800">
                              {formatDate(document.createdAt)}
                            </td>
                            <td className="py-2 px-4 border-b">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDocumentStatusClass(document.status)}`}>
                                {getDocumentStatusName(document.status)}
                              </span>
                            </td>
                            <td className="py-2 px-4 border-b">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                                  Visualizar
                                </a>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Nenhum documento encontrado para este paciente.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Funções auxiliares para formatação e conversão

// Formatar mês/ano
function formatMonthYear(monthYear: string): string {
  const [month, year] = monthYear.split('/');
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  
  return `${monthNames[parseInt(month) - 1]}/${year}`;
}

// Calcular taxa de presença
function calculateAttendanceRate(appointments: any[]): string {
  if (!appointments.length) return "0%";
  
  const completed = appointments.filter(
    app => app.status === "completed" || app.status === "confirmed"
  ).length;
  
  return `${Math.round((completed / appointments.length) * 100)}%`;
}

// Obter nome do status
function getStatusName(status: string): string {
  const statusMap: Record<string, string> = {
    "scheduled": "Agendado",
    "confirmed": "Confirmado",
    "completed": "Finalizado",
    "cancelled": "Cancelado",
    "no_show": "Não Compareceu",
    "pending": "Pendente",
    "attended": "Atendido"
  };
  
  return statusMap[status] || status;
}

// Obter classe CSS para status
function getStatusClass(status: string): string {
  const statusClassMap: Record<string, string> = {
    "scheduled": "bg-blue-100 text-blue-800",
    "confirmed": "bg-green-100 text-green-800",
    "completed": "bg-teal-100 text-teal-800",
    "cancelled": "bg-red-100 text-red-800",
    "no_show": "bg-orange-100 text-orange-800",
    "pending": "bg-gray-100 text-gray-800",
    "attended": "bg-emerald-100 text-emerald-800"
  };
  
  return statusClassMap[status] || "bg-gray-100 text-gray-800";
}

// Obter nome do procedimento
function getProcedureName(procedureType: string): string {
  const procedureMap: Record<string, string> = {
    "psychology_aba": "Psicologia - ABA",
    "psychology_cbt": "Psicologia - TCC",
    "physiotherapy_psychomotor": "Fisioterapia - Psicomotricidade",
    "physiotherapy_conventional": "Fisioterapia - Convencional",
    "speech_therapy": "Fonoaudiologia",
    "occupational_therapy": "Terapia Ocupacional",
    "planning": "Planejamento",
    "free_time": "Horário Livre",
    "other": "Outro"
  };
  
  return procedureMap[procedureType] || procedureType;
}

// Obter nome do status da evolução
function getEvolutionStatusName(status: string): string {
  const statusMap: Record<string, string> = {
    "pending": "Pendente",
    "completed": "Concluída",
    "approved": "Aprovada",
    "rejected": "Rejeitada"
  };
  
  return statusMap[status] || status;
}

// Obter classe CSS para status da evolução
function getEvolutionStatusClass(status: string): string {
  const statusClassMap: Record<string, string> = {
    "pending": "bg-yellow-100 text-yellow-800",
    "completed": "bg-blue-100 text-blue-800",
    "approved": "bg-green-100 text-green-800",
    "rejected": "bg-red-100 text-red-800"
  };
  
  return statusClassMap[status] || "bg-gray-100 text-gray-800";
}

// Obter nome da categoria do documento
function getDocumentCategoryName(category: string): string {
  const categoryMap: Record<string, string> = {
    "medical_report": "Relatório Médico",
    "exam_result": "Resultado de Exame",
    "treatment_plan": "Plano de Tratamento",
    "referral": "Encaminhamento",
    "legal_document": "Documento Legal",
    "consent_form": "Termo de Consentimento",
    "evolution_note": "Nota de Evolução",
    "administrative": "Administrativo",
    "other": "Outro"
  };
  
  return categoryMap[category] || category;
}

// Obter classe CSS para status do documento
function getDocumentStatusClass(status: string): string {
  const statusClassMap: Record<string, string> = {
    "draft": "bg-gray-100 text-gray-800",
    "pending_signature": "bg-yellow-100 text-yellow-800",
    "signed": "bg-green-100 text-green-800",
    "archived": "bg-blue-100 text-blue-800",
    "active": "bg-indigo-100 text-indigo-800"
  };
  
  return statusClassMap[status] || "bg-gray-100 text-gray-800";
}

// Obter nome do status do documento
function getDocumentStatusName(status: string): string {
  const statusMap: Record<string, string> = {
    "draft": "Rascunho",
    "pending_signature": "Aguardando Assinatura",
    "signed": "Assinado",
    "archived": "Arquivado",
    "active": "Ativo"
  };
  
  return statusMap[status] || status;
}