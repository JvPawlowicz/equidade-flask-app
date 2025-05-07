import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportExporter } from "./report-exporter";
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
  Area,
} from "recharts";
import { AlertCircle, HelpCircle, FileDown } from "lucide-react";

// Tipo de visualização do gráfico
type ChartType = "bar" | "line" | "pie" | "area" | "table";

// Cores para os gráficos
const CHART_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#22D3EE", // teal
  "#F97316", // orange
  "#14B8A6", // emerald
];

interface StatisticsExportProps {
  data: any[];
  title: string;
  description?: string;
  xAxisKey?: string;
  yAxisKeys?: string[];
  valueFormatter?: (value: number) => string;
  labelFormatter?: (value: string) => string;
  isLoading?: boolean;
  error?: any;
  defaultChartType?: ChartType;
  availableChartTypes?: ChartType[];
  exportFilename?: string;
  extraInfo?: { label: string; value: string }[];
  pieDataKey?: string;
  pieNameKey?: string;
  customColumns?: string[];
  columnLabels?: Record<string, string>;
}

export function StatisticsExport({
  data,
  title,
  description,
  xAxisKey = "name",
  yAxisKeys = ["value"],
  valueFormatter = (value) => `${value}`,
  labelFormatter = (value) => value,
  isLoading = false,
  error = null,
  defaultChartType = "bar",
  availableChartTypes = ["bar", "line", "pie", "area", "table"],
  exportFilename,
  extraInfo,
  pieDataKey = "value",
  pieNameKey = "name",
  customColumns,
  columnLabels,
}: StatisticsExportProps) {
  // Estado para o tipo de gráfico selecionado
  const [chartType, setChartType] = useState<ChartType>(defaultChartType);
  
  // Referência para o elemento do gráfico (usado na exportação)
  const chartRef = useRef<HTMLDivElement>(null);

  // Verifica se o gráfico está disponível
  const isChartTypeAvailable = (type: ChartType) => availableChartTypes.includes(type);

  // Handles de formatação para tooltips
  const tooltipFormatter = (value: number) => [valueFormatter(value), ""];
  const nameFormatter = (name: string) => labelFormatter(name);

  // Nome para arquivo de exportação
  const filename = exportFilename || title.toLowerCase().replace(/\s+/g, '_');

  // Renderizar esqueleto durante o carregamento
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="pt-4">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderizar mensagem de erro
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold">Erro ao carregar dados</h3>
            <p className="text-gray-500 mt-2">
              Não foi possível carregar as estatísticas. Por favor, tente novamente mais tarde.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderizar mensagem se não houver dados
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <HelpCircle className="h-10 w-10 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">Nenhum dado disponível</h3>
            <p className="text-gray-500 mt-2">
              Não foram encontrados dados para o período selecionado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex gap-2">
          <ReportExporter
            data={data}
            type="csv"
            filename={`${filename}_csv`}
            title={title}
            columns={customColumns}
            columnsLabels={columnLabels}
            extraInfo={extraInfo}
            buttonText="CSV"
            showIcon={false}
            size="sm"
          />
          <ReportExporter
            data={data}
            type="excel"
            filename={`${filename}_excel`}
            title={title}
            columns={customColumns}
            columnsLabels={columnLabels}
            extraInfo={extraInfo}
            buttonText="Excel"
            showIcon={false}
            size="sm"
          />
          <ReportExporter
            data={data}
            type="pdf"
            filename={`${filename}_pdf`}
            title={title}
            columns={customColumns}
            columnsLabels={columnLabels}
            extraInfo={extraInfo}
            chartRef={chartRef}
            includeChart={chartType !== "table"}
            buttonText="PDF"
            showIcon={false}
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-4">
          <Tabs defaultValue={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
            <TabsList className="mb-2">
              {isChartTypeAvailable("bar") && <TabsTrigger value="bar">Barras</TabsTrigger>}
              {isChartTypeAvailable("line") && <TabsTrigger value="line">Linha</TabsTrigger>}
              {isChartTypeAvailable("area") && <TabsTrigger value="area">Área</TabsTrigger>}
              {isChartTypeAvailable("pie") && <TabsTrigger value="pie">Pizza</TabsTrigger>}
              {isChartTypeAvailable("table") && <TabsTrigger value="table">Tabela</TabsTrigger>}
            </TabsList>

            {/* Gráfico de Barras */}
            {isChartTypeAvailable("bar") && (
              <TabsContent value="bar">
                <div ref={chartRef} className="pt-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey={xAxisKey} 
                        tick={{ fill: "#666", fontSize: 12 }} 
                        tickFormatter={nameFormatter}
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} tickFormatter={valueFormatter} />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={nameFormatter}
                        contentStyle={{ border: "1px solid #f0f0f0", borderRadius: 4 }}
                      />
                      <Legend />
                      {yAxisKeys.map((key, index) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          name={labelFormatter(key)}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          animationDuration={500}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            )}

            {/* Gráfico de Linha */}
            {isChartTypeAvailable("line") && (
              <TabsContent value="line">
                <div ref={chartRef} className="pt-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey={xAxisKey} 
                        tick={{ fill: "#666", fontSize: 12 }} 
                        tickFormatter={nameFormatter}
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} tickFormatter={valueFormatter} />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={nameFormatter}
                        contentStyle={{ border: "1px solid #f0f0f0", borderRadius: 4 }}
                      />
                      <Legend />
                      {yAxisKeys.map((key, index) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={labelFormatter(key)}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          activeDot={{ r: 6 }}
                          animationDuration={500}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            )}

            {/* Gráfico de Área */}
            {isChartTypeAvailable("area") && (
              <TabsContent value="area">
                <div ref={chartRef} className="pt-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey={xAxisKey} 
                        tick={{ fill: "#666", fontSize: 12 }} 
                        tickFormatter={nameFormatter}
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} tickFormatter={valueFormatter} />
                      <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={nameFormatter}
                        contentStyle={{ border: "1px solid #f0f0f0", borderRadius: 4 }}
                      />
                      <Legend />
                      {yAxisKeys.map((key, index) => (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={labelFormatter(key)}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          fillOpacity={0.3}
                          animationDuration={500}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            )}

            {/* Gráfico de Pizza */}
            {isChartTypeAvailable("pie") && (
              <TabsContent value="pie">
                <div ref={chartRef} className="pt-4">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={data}
                        dataKey={pieDataKey}
                        nameKey={pieNameKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        innerRadius={60}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                        animationDuration={500}
                      >
                        {data.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={tooltipFormatter}
                        contentStyle={{ border: "1px solid #f0f0f0", borderRadius: 4 }}
                      />
                      <Legend 
                        formatter={(value) => labelFormatter(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            )}

            {/* Tabela */}
            {isChartTypeAvailable("table") && (
              <TabsContent value="table">
                <div className="rounded border overflow-hidden mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-blue-50">
                          <th className="py-2 px-4 text-left font-medium text-gray-600 border-b">
                            {labelFormatter(xAxisKey)}
                          </th>
                          {yAxisKeys.map((key) => (
                            <th key={key} className="py-2 px-4 text-left font-medium text-gray-600 border-b">
                              {labelFormatter(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="py-2 px-4 border-b text-gray-800">
                              {nameFormatter(item[xAxisKey])}
                            </td>
                            {yAxisKeys.map((key) => (
                              <td key={key} className="py-2 px-4 border-b text-gray-800">
                                {valueFormatter(item[key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}