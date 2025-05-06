import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Download, FileBarChart } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getProcedureText } from "@/lib/utils";

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("professionals-hours");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.toISOString().split('T')[0];
  });
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");

  // Check if user can access reports
  const canAccessReports = ["admin", "coordinator"].includes(user?.role || "");

  // Fetch facilities for filters
  const { data: facilities } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
  });

  // Fetch professionals hours report
  const { data: professionalsHoursData, isLoading: isLoadingProfessionalsHours } = useQuery<any[]>({
    queryKey: [
      `/api/reports/professionals-hours?startDate=${startDate}&endDate=${endDate}${
        selectedFacilityId ? `&facilityId=${selectedFacilityId}` : ""
      }`,
    ],
    enabled: canAccessReports && activeTab === "professionals-hours",
  });

  // Fetch appointments by procedure report
  const { data: appointmentsByProcedureData, isLoading: isLoadingAppointmentsByProcedure } = useQuery<
    any[]
  >({
    queryKey: [
      `/api/reports/appointments-by-procedure?startDate=${startDate}&endDate=${endDate}${
        selectedFacilityId ? `&facilityId=${selectedFacilityId}` : ""
      }`,
    ],
    enabled: canAccessReports && activeTab === "appointments-by-procedure",
  });

  // Fetch patients by facility report
  const { data: patientsByFacilityData, isLoading: isLoadingPatientsByFacility } = useQuery<any[]>({
    queryKey: ["/api/reports/patients-by-facility"],
    enabled: canAccessReports && activeTab === "patients-by-facility",
  });

  // Format data for charts
  const procedureChartData = appointmentsByProcedureData?.map((item) => ({
    name: getProcedureText(item.procedureType),
    count: parseInt(item.count),
  }));

  const patientsByFacilityChartData = patientsByFacilityData?.map((item) => ({
    name: item.facility?.name || "Desconhecido",
    value: parseInt(item.count),
  }));

  // Colors for the pie chart
  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  // Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    let csvContent = "";
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    csvContent += headers.join(",") + "\n";
    
    // Add data rows
    data.forEach((item) => {
      const row = headers.map((header) => {
        let cell = item[header] === null || item[header] === undefined ? "" : item[header];
        
        // Handle nested objects
        if (typeof cell === "object") {
          cell = JSON.stringify(cell).replace(/"/g, '""');
        }
        
        // Escape quotes and wrap value in quotes
        if (typeof cell === "string") {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        
        return cell;
      }).join(",");
      
      csvContent += row + "\n";
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!canAccessReports) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <FileBarChart className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Acesso Restrito</h2>
          <p className="text-gray-500 mt-2 text-center max-w-md">
            Você não tem permissão para acessar os relatórios. Apenas administradores e coordenadores podem visualizar esta página.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Relatórios</h1>
        <p className="text-gray-600">Análise de dados e estatísticas da clínica</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="professionals-hours">Horas dos Profissionais</TabsTrigger>
          <TabsTrigger value="appointments-by-procedure">Atendimentos por Procedimento</TabsTrigger>
          <TabsTrigger value="patients-by-facility">Pacientes por Unidade</TabsTrigger>
        </TabsList>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Data de Início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Data de Término</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Unidade</label>
                <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as unidades</SelectItem>
                    {facilities?.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id.toString()}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professionals Hours Report */}
        <TabsContent value="professionals-hours">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Horas Trabalhadas por Profissional</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV(professionalsHoursData || [], 'horas_profissionais.csv')}
                disabled={!professionalsHoursData || professionalsHoursData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingProfessionalsHours ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !professionalsHoursData || professionalsHoursData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum dado encontrado para o período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Total de Horas</TableHead>
                        <TableHead className="text-right">Horas de Planejamento</TableHead>
                        <TableHead className="text-right">Horas Livres</TableHead>
                        <TableHead className="text-right">Horas de Atendimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {professionalsHoursData.map((item, index) => {
                        const totalHours = parseFloat(item.totalHours) || 0;
                        const planningHours = parseFloat(item.planningHours) || 0;
                        const freeTimeHours = parseFloat(item.freeTimeHours) || 0;
                        const appointmentHours = totalHours - planningHours - freeTimeHours;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>{item.professional?.user?.fullName || "—"}</TableCell>
                            <TableCell>
                              {item.professional
                                ? (() => {
                                    const typeMap: Record<string, string> = {
                                      psychologist: "Psicólogo(a)",
                                      physiotherapist: "Fisioterapeuta",
                                      speech_therapist: "Fonoaudiólogo(a)",
                                      occupational_therapist: "Terapeuta Ocupacional",
                                      other: "Outro",
                                    };
                                    return typeMap[item.professional.professionalType] || item.professional.professionalType;
                                  })()
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {totalHours.toFixed(1)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {planningHours.toFixed(1)}h
                              <span className="text-xs text-gray-500 ml-1">
                                ({((planningHours / totalHours) * 100 || 0).toFixed(0)}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {freeTimeHours.toFixed(1)}h
                              <span className="text-xs text-gray-500 ml-1">
                                ({((freeTimeHours / totalHours) * 100 || 0).toFixed(0)}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {appointmentHours.toFixed(1)}h
                              <span className="text-xs text-gray-500 ml-1">
                                ({((appointmentHours / totalHours) * 100 || 0).toFixed(0)}%)
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments by Procedure Report */}
        <TabsContent value="appointments-by-procedure">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Atendimentos por Tipo de Procedimento</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV(appointmentsByProcedureData || [], 'atendimentos_por_procedimento.csv')}
                disabled={!appointmentsByProcedureData || appointmentsByProcedureData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingAppointmentsByProcedure ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !procedureChartData || procedureChartData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum dado encontrado para o período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={procedureChartData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Quantidade" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Procedimento</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Percentual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {procedureChartData.map((item, index) => {
                          const total = procedureChartData.reduce(
                            (sum, current) => sum + current.count,
                            0
                          );
                          const percentage = (item.count / total) * 100;
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right font-medium">
                                {item.count}
                              </TableCell>
                              <TableCell className="text-right">
                                {percentage.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patients by Facility Report */}
        <TabsContent value="patients-by-facility">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pacientes por Unidade</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV(patientsByFacilityData || [], 'pacientes_por_unidade.csv')}
                disabled={!patientsByFacilityData || patientsByFacilityData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingPatientsByFacility ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !patientsByFacilityChartData || patientsByFacilityChartData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum dado encontrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={patientsByFacilityChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {patientsByFacilityChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [value, "Pacientes"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unidade</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Percentual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientsByFacilityChartData.map((item, index) => {
                          const total = patientsByFacilityChartData.reduce(
                            (sum, current) => sum + current.value,
                            0
                          );
                          const percentage = (item.value / total) * 100;
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right font-medium">
                                {item.value}
                              </TableCell>
                              <TableCell className="text-right">
                                {percentage.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
