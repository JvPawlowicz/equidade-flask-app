import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatTimeRange, getStatusText, getProcedureText } from "@/lib/utils";

interface ExportAgendaPdfProps {
  appointments: any[];
  dateRange?: { startDate: Date; endDate: Date } | null;
  professionalFilter?: number | null;
  patientFilter?: number | null;
  statusFilter?: string | null;
}

export function ExportAgendaPdf({
  appointments,
  dateRange,
  professionalFilter,
  patientFilter,
  statusFilter,
}: ExportAgendaPdfProps) {
  const handleExport = () => {
    // Criar novo documento PDF
    const doc = new jsPDF();
    
    // Adicionar título e informações do cabeçalho
    doc.setFontSize(16);
    doc.text("Relatório de Agenda - Clínica Equidade", 14, 15);
    
    doc.setFontSize(10);
    let yPos = 25;
    
    // Adicionar informações de filtro
    if (dateRange) {
      doc.text(`Período: ${formatDate(dateRange.startDate)} até ${formatDate(dateRange.endDate)}`, 14, yPos);
      yPos += 6;
    }
    
    if (professionalFilter) {
      const professionalName = appointments.find(a => a.professional?.id === professionalFilter)?.professional?.user?.fullName || "Todos";
      doc.text(`Profissional: ${professionalName}`, 14, yPos);
      yPos += 6;
    }
    
    if (patientFilter) {
      const patientName = appointments.find(a => a.patient?.id === patientFilter)?.patient?.fullName || "Todos";
      doc.text(`Paciente: ${patientName}`, 14, yPos);
      yPos += 6;
    }
    
    if (statusFilter && statusFilter !== "all") {
      doc.text(`Status: ${getStatusText(statusFilter)}`, 14, yPos);
      yPos += 6;
    }
    
    // Data de geração
    doc.text(`Gerado em: ${formatDate(new Date())} às ${new Date().toLocaleTimeString()}`, 14, yPos);
    yPos += 10;
    
    // Preparar dados para a tabela
    const tableData = appointments.map(appointment => [
      formatDate(appointment.startTime),
      formatTimeRange(appointment.startTime, appointment.endTime),
      appointment.patient?.fullName || "N/A",
      appointment.professional?.user?.fullName || "N/A",
      getProcedureText(appointment.procedureType),
      appointment.room?.name || "N/A",
      getStatusText(appointment.status),
    ]);
    
    // Adicionar a tabela
    autoTable(doc, {
      startY: yPos,
      head: [['Data', 'Horário', 'Paciente', 'Profissional', 'Procedimento', 'Sala', 'Status']],
      body: tableData,
      headStyles: {
        fillColor: [41, 98, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Data
        1: { cellWidth: 20 }, // Horário
        2: { cellWidth: 35 }, // Paciente
        3: { cellWidth: 35 }, // Profissional
        4: { cellWidth: 30 }, // Procedimento
        5: { cellWidth: 20 }, // Sala
        6: { cellWidth: 20 }, // Status
      },
    });
    
    // Adicionar numeração de páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      // Adicionar rodapé
      doc.text(
        'Clínica Equidade - Sistema de Gestão',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }
    
    // Salvar o PDF
    doc.save(`agenda-clinica-equidade-${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      className="flex items-center"
      title="Exportar agenda para PDF"
    >
      <FileDown className="h-4 w-4 mr-1" />
      Exportar PDF
    </Button>
  );
}