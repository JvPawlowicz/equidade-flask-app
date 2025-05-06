import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { 
  Loader2, 
  Download, 
  FileBarChart, 
  FileText, 
  TrendingUp, 
  User, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  BarChart2,
  ArrowUpRight
} from "lucide-react";
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
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { getProcedureText, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("professionals-hours");
  const [periodType, setPeriodType] = useState<string>("month");
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
  
  // Fetch appointments by period report
  const { data: appointmentsByPeriodData, isLoading: isLoadingAppointmentsByPeriod } = useQuery<any[]>({
    queryKey: [
      `/api/reports/appointments-by-period?startDate=${startDate}&endDate=${endDate}&period=${periodType}${
        selectedFacilityId ? `&facilityId=${selectedFacilityId}` : ""
      }`,
    ],
    enabled: canAccessReports && activeTab === "appointments-by-period",
  });
  
  // State for patient evolution report
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  
  // Fetch patients list for filter
  const { data: patientsList } = useQuery<any[]>({
    queryKey: ["/api/patients"],
    enabled: canAccessReports && activeTab === "patient-evolution",
  });
  
  // Fetch professionals list for filter
  const { data: professionalsList } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
    enabled: canAccessReports && activeTab === "patient-evolution",
  });
  
  // Fetch patient evolution report
  const { data: patientEvolutionData, isLoading: isLoadingPatientEvolution } = useQuery<any>({
    queryKey: [
      `/api/reports/patient-evolution-over-time?patientId=${selectedPatientId}${
        startDate ? `&startDate=${startDate}` : ""
      }${
        endDate ? `&endDate=${endDate}` : ""
      }${
        selectedProfessionalId ? `&professionalId=${selectedProfessionalId}` : ""
      }`,
    ],
    enabled: canAccessReports && activeTab === "patient-evolution" && !!selectedPatientId,
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
          <TabsTrigger value="appointments-by-period">Atendimentos por Período</TabsTrigger>
          <TabsTrigger value="patients-by-facility">Pacientes por Unidade</TabsTrigger>
          <TabsTrigger value="patient-evolution">Evolução de Pacientes</TabsTrigger>
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
              
              {/* Filtros específicos para Atendimentos por Período */}
              {activeTab === 'appointments-by-period' && (
                <div>
                  <label className="text-sm font-medium block mb-2">Agrupar por</label>
                  <Select value={periodType} onValueChange={setPeriodType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Dia</SelectItem>
                      <SelectItem value="week">Semana</SelectItem>
                      <SelectItem value="month">Mês</SelectItem>
                      <SelectItem value="quarter">Trimestre</SelectItem>
                      <SelectItem value="year">Ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Filtros específicos para Evolução de Pacientes */}
              {activeTab === 'patient-evolution' && (
                <>
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium block mb-2">Paciente</label>
                    <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Selecione um paciente</SelectItem>
                        {patientsList?.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Profissional</label>
                    <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os profissionais" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os profissionais</SelectItem>
                        {professionalsList?.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id.toString()}>
                            {professional.user?.fullName || `Profissional #${professional.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
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

        {/* Appointments by Period Report */}
        <TabsContent value="appointments-by-period">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Atendimentos por Período</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV(appointmentsByPeriodData || [], `atendimentos_por_${periodType}.csv`)}
                disabled={!appointmentsByPeriodData || appointmentsByPeriodData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingAppointmentsByPeriod ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !appointmentsByPeriodData || appointmentsByPeriodData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum dado encontrado para o período selecionado.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-blue-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center text-blue-700">
                          <Calendar className="h-4 w-4 mr-2" />
                          Total de Atendimentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-700">
                          {appointmentsByPeriodData.reduce((total, item) => total + item.totalAppointments, 0)}
                        </div>
                        <p className="text-sm text-blue-600 mt-1">No período selecionado</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-green-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center text-green-700">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Realizados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-700">
                          {appointmentsByPeriodData.reduce((total, item) => total + item.completedAppointments, 0)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          {Math.round((appointmentsByPeriodData.reduce((total, item) => total + item.completedAppointments, 0) / 
                          appointmentsByPeriodData.reduce((total, item) => total + item.totalAppointments, 0)) * 100)}% do total
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-red-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center text-red-700">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Cancelados / Faltas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-700">
                          {appointmentsByPeriodData.reduce((total, item) => total + item.cancelledAppointments, 0)}
                        </div>
                        <p className="text-sm text-red-600 mt-1">
                          {Math.round((appointmentsByPeriodData.reduce((total, item) => total + item.cancelledAppointments, 0) / 
                          appointmentsByPeriodData.reduce((total, item) => total + item.totalAppointments, 0)) * 100)}% do total
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={appointmentsByPeriodData}
                          margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => {
                              const formattedNames = {
                                totalAppointments: "Total",
                                completedAppointments: "Realizados",
                                cancelledAppointments: "Cancelados"
                              };
                              return [value, formattedNames[name as keyof typeof formattedNames] || name];
                            }}
                          />
                          <Legend 
                            formatter={(value) => {
                              const formattedNames = {
                                totalAppointments: "Total",
                                completedAppointments: "Realizados",
                                cancelledAppointments: "Cancelados"
                              };
                              return formattedNames[value as keyof typeof formattedNames] || value;
                            }}
                          />
                          <Area type="monotone" dataKey="totalAppointments" stackId="1" stroke="#3B82F6" fill="#93C5FD" />
                          <Area type="monotone" dataKey="completedAppointments" stackId="2" stroke="#10B981" fill="#A7F3D0" />
                          <Area type="monotone" dataKey="cancelledAppointments" stackId="3" stroke="#EF4444" fill="#FCA5A5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Período</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Realizados</TableHead>
                            <TableHead className="text-right">Cancelados</TableHead>
                            <TableHead className="text-right">Taxa de Comparecimento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointmentsByPeriodData.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.period}</TableCell>
                              <TableCell className="text-right font-medium">
                                {item.totalAppointments}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {item.completedAppointments}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {item.cancelledAppointments}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.completionRate}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
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
        
        {/* Patient Evolution Report */}
        <TabsContent value="patient-evolution">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Evolução de Paciente</CardTitle>
                {patientEvolutionData?.patient && (
                  <CardDescription>
                    Análise de progresso do paciente: {patientEvolutionData.patient.name}
                  </CardDescription>
                )}
              </div>
              {patientEvolutionData?.evolutions && patientEvolutionData.evolutions.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportToCSV(patientEvolutionData.evolutions, `evolucao_${selectedPatientId}.csv`)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedPatientId ? (
                <div className="text-center py-12 text-gray-500">
                  <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione um Paciente</h3>
                  <p>Escolha um paciente no filtro acima para visualizar sua evolução.</p>
                </div>
              ) : isLoadingPatientEvolution ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !patientEvolutionData || !patientEvolutionData.evolutions || patientEvolutionData.evolutions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum Registro Encontrado</h3>
                  <p>Não há evoluções registradas para este paciente no período selecionado.</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">Progresso ao Longo do Tempo</h3>
                    
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={patientEvolutionData.monthlyStats}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" orientation="left" domain={[0, 10]} />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 5']} />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'averageProgress') return [`${value}/10`, 'Nível de Progresso'];
                              return [value, 'Quantidade de Evoluções'];
                            }}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="averageProgress" 
                            name="Nível de Progresso" 
                            stroke="#10B981" 
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="count" 
                            name="Quantidade de Evoluções" 
                            stroke="#3B82F6" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                          Estatísticas de Progresso
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Total de Evoluções</dt>
                            <dd className="mt-1 text-2xl font-semibold">
                              {patientEvolutionData.evolutions.length}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Progresso Médio</dt>
                            <dd className="mt-1 text-2xl font-semibold text-green-600">
                              {patientEvolutionData.evolutions.reduce((acc, ev) => acc + (ev.progressLevel || 0), 0) / 
                               patientEvolutionData.evolutions.filter(ev => ev.progressLevel !== null).length || 0}/10
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Primeira Evolução</dt>
                            <dd className="mt-1 text-md">
                              {patientEvolutionData.evolutions.length > 0 ? 
                                formatDate(patientEvolutionData.evolutions[0].date) : '-'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Última Evolução</dt>
                            <dd className="mt-1 text-md">
                              {patientEvolutionData.evolutions.length > 0 ? 
                                formatDate(patientEvolutionData.evolutions[patientEvolutionData.evolutions.length - 1].date) : '-'}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <BarChart2 className="h-4 w-4 mr-2 text-blue-600" />
                          Distribuição por Tipo de Atendimento
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {patientEvolutionData.monthlyStats.length > 0 && patientEvolutionData.monthlyStats.some(m => m.procedureTypes && m.procedureTypes.length > 0) ? (
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={patientEvolutionData.monthlyStats.reduce((acc, month) => {
                                    month.procedureTypes?.forEach(pt => {
                                      const existing = acc.find(a => a.name === pt.name);
                                      if (existing) {
                                        existing.value += pt.count;
                                      } else {
                                        acc.push({ name: pt.name, value: pt.count });
                                      }
                                    });
                                    return acc;
                                  }, [] as {name: string, value: number}[])}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={30}
                                  outerRadius={60}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {COLORS.map((color, index) => (
                                    <Cell key={`cell-${index}`} fill={color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-36 text-gray-500">
                            Sem dados suficientes para análise
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <h3 className="text-lg font-medium mb-4">Histórico de Evoluções</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Procedimento</TableHead>
                          <TableHead>Progresso</TableHead>
                          <TableHead>Conteúdo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientEvolutionData.evolutions.map((evolution, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(evolution.date)}</TableCell>
                            <TableCell>{evolution.professionalName}</TableCell>
                            <TableCell>{getProcedureText(evolution.procedureType || '')}</TableCell>
                            <TableCell>
                              {evolution.progressLevel !== null ? (
                                <div className="flex items-center">
                                  <span className="mr-2">{evolution.progressLevel}/10</span>
                                  {evolution.progressLevel >= 7 ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                                  ) : evolution.progressLevel >= 4 ? (
                                    <ArrowUpRight className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {evolution.content}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
