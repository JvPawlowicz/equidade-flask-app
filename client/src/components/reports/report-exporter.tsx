import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileDown, FileText, BarChart2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import * as XLSX from 'xlsx';

interface ReportExporterProps {
  data: any[];
  type: 'pdf' | 'excel' | 'csv';
  filename: string;
  title: string;
  columns?: string[];
  columnsLabels?: Record<string, string>;
  extraInfo?: { label: string; value: string }[];
  variant?: 'outline' | 'default';
  size?: 'sm' | 'default';
  showIcon?: boolean;
  orientation?: 'portrait' | 'landscape';
  customClass?: string;
  chartRef?: React.RefObject<HTMLDivElement>;
  includeChart?: boolean;
  buttonText?: string;
}

export function ReportExporter({
  data,
  type,
  filename,
  title,
  columns,
  columnsLabels,
  extraInfo,
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  orientation = 'portrait',
  customClass = '',
  chartRef,
  includeChart = false,
  buttonText,
}: ReportExporterProps) {
  // Export to CSV
  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Get columns to export
    const keysToExport = columns || Object.keys(data[0]);
    
    // Get headers from the first object and format with provided labels
    const headers = keysToExport.map(key => {
      if (columnsLabels && columnsLabels[key]) {
        return columnsLabels[key];
      }
      
      // Format camelCase or snake_case keys
      return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    });
    
    csvContent += headers.join(",") + "\n";
    
    // Add data rows
    data.forEach((item) => {
      const row = keysToExport.map((key) => {
        let cell = item[key] === null || item[key] === undefined ? "" : item[key];
        
        // Format dates if needed
        if (typeof cell === 'string' && cell.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          cell = formatDate(cell);
        }
        
        // Handle nested objects
        if (typeof cell === "object" && cell !== null) {
          cell = JSON.stringify(cell).replace(/"/g, '""');
        }
        
        // Escape quotes and wrap in quotes if string
        if (typeof cell === "string") {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        
        return cell;
      }).join(",");
      
      csvContent += row + "\n";
    });
    
    // Create and download the file
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!data || data.length === 0) return;
    
    // Get columns to export
    const keysToExport = columns || Object.keys(data[0]);
    
    // Format data for Excel
    const excelData = data.map(item => {
      const row: Record<string, any> = {};
      
      keysToExport.forEach(key => {
        const headerName = columnsLabels?.[key] || 
          key.replace(/_/g, ' ')
             .replace(/([A-Z])/g, ' $1')
             .replace(/^./, str => str.toUpperCase())
             .trim();
        
        let value = item[key];
        
        // Format dates if needed
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          value = formatDate(value);
        }
        
        // Handle nested objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        
        row[headerName] = value === null || value === undefined ? '' : value;
      });
      
      return row;
    });
    
    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
    
    // Write and download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!data || data.length === 0) return;
    
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
    });
    
    // Page dimensions
    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;
    const margin = 10;
    
    // Add title and header
    doc.setFontSize(18);
    doc.setTextColor(41, 98, 255); // Primary blue
    doc.text("Clínica Equidade", pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80); // Dark text
    doc.text(title, pageWidth / 2, 25, { align: 'center' });
    
    // Add report info
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100); // Gray text
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 32, { align: 'center' });
    
    // Add filter information if available
    let startY = 40;
    if (extraInfo && extraInfo.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      extraInfo.forEach((info) => {
        doc.text(`${info.label}: ${info.value}`, pageWidth / 2, startY, { align: 'center' });
        startY += 5;
      });
      
      startY += 5; // Add extra space after filters
    }
    
    // Add chart if requested
    if (includeChart && chartRef && chartRef.current) {
      try {
        // Get the chart element and convert to image
        const canvas = await html2canvas(chartRef.current);
        const chartImg = canvas.toDataURL('image/png');
        
        // Calculate chart dimensions - 80% of page width
        const chartWidth = (pageWidth - 2 * margin) * 0.8;
        const chartHeight = (chartWidth / canvas.width) * canvas.height;
        
        // Add chart centered
        const chartX = (pageWidth - chartWidth) / 2;
        doc.addImage(chartImg, 'PNG', chartX, startY, chartWidth, chartHeight);
        
        startY += chartHeight + 15; // Add space after chart
      } catch (err) {
        console.error('Error adding chart to PDF:', err);
        // Proceed without the chart
      }
    }
    
    // Determine columns to show
    const keysToExport = columns || Object.keys(data[0]);
    
    // Create header row with formatted column names
    const tableHeaders = keysToExport.map(key => {
      if (columnsLabels && columnsLabels[key]) {
        return columnsLabels[key];
      }
      
      // Format camelCase or snake_case keys
      return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    });
    
    // Map data for the table
    const tableData = data.map(item => {
      return keysToExport.map(key => {
        let value = item[key];
        
        // Format dates
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          value = formatDate(value);
        }
        
        // Handle nested objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        
        return value === null || value === undefined ? '' : String(value);
      });
    });
    
    // Generate table
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: startY,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 98, 255],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      margin: { top: startY, right: margin, bottom: margin, left: margin },
    });
    
    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    doc.save(`${filename}.pdf`);
  };

  // Get icon based on export type
  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 mr-1" />;
      case 'excel':
      case 'csv':
        return <FileDown className="h-4 w-4 mr-1" />;
      default:
        return <BarChart2 className="h-4 w-4 mr-1" />;
    }
  };

  // Get export handler based on type
  const handleExport = () => {
    switch (type) {
      case 'pdf':
        return exportToPDF();
      case 'excel':
        return exportToExcel();
      case 'csv':
        return exportToCSV();
      default:
        return exportToPDF();
    }
  };

  // Get button text
  const getButtonText = () => {
    if (buttonText) return buttonText;
    
    switch (type) {
      case 'pdf':
        return 'Exportar PDF';
      case 'excel':
        return 'Exportar Excel';
      case 'csv':
        return 'Exportar CSV';
      default:
        return 'Exportar';
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant={variant}
      size={size}
      className={`flex items-center ${customClass}`}
    >
      {getIcon()}
      {getButtonText()}
    </Button>
  );
}

// Helper async function to convert chart div to canvas
const html2canvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  // Dynamically import html2canvas when needed
  const html2canvasModule = await import('html2canvas');
  return await html2canvasModule.default(element);
};