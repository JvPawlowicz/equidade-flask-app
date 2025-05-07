import { useAuth } from "@/hooks/use-auth";
import { Navigate, useLocation } from "wouter";
import { CalendarIcon, FilterIcon, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const filterSchema = z.object({
  userId: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
});

type FilterValues = z.infer<typeof filterSchema>;

export default function HistoricoPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const pageSize = 10;

  // Verificar se usuário tem permissão para visualizar a página
  if (!user || !["admin", "coordinator"].includes(user.role)) {
    return <Navigate to="/" />;
  }

  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      userId: "",
      resource: "",
      action: "",
      startDate: null,
      endDate: null,
    },
  });

  // Obter metadados para os filtros (usuários, recursos e ações)
  const { data: metadata, isLoading: isLoadingMetadata } = useQuery({
    queryKey: ["/api/audit-logs/metadata"],
  });

  // Obter logs de auditoria com filtros
  const {
    data: auditLogs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/audit-logs",
      {
        page,
        pageSize,
        ...form.getValues(),
      },
    ],
  });

  const onSubmit = (values: FilterValues) => {
    setPage(1);
    refetch();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", {
      locale: ptBR,
    });
  };

  // Formatar texto da ação para melhor legibilidade
  const getActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      create: "Criação",
      read: "Leitura",
      update: "Atualização",
      delete: "Exclusão",
      login: "Login",
      logout: "Logout",
      approve: "Aprovação",
      reject: "Rejeição",
      complete: "Conclusão",
      cancel: "Cancelamento",
      assign: "Atribuição",
    };
    return actionMap[action] || action;
  };

  // Formatar texto do recurso para melhor legibilidade
  const getResourceText = (resource: string) => {
    const resourceMap: Record<string, string> = {
      users: "Usuários",
      professionals: "Profissionais",
      patients: "Pacientes",
      appointments: "Agendamentos",
      evolutions: "Evoluções",
      documents: "Documentos",
      facilities: "Unidades",
      rooms: "Salas",
      auth: "Autenticação",
      reports: "Relatórios",
      chats: "Conversas",
      notifications: "Notificações",
    };
    return resourceMap[resource] || resource;
  };

  // Cor para os badges de ação
  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      read: "bg-blue-100 text-blue-800",
      update: "bg-amber-100 text-amber-800",
      delete: "bg-red-100 text-red-800",
      login: "bg-purple-100 text-purple-800",
      logout: "bg-gray-100 text-gray-800",
      approve: "bg-emerald-100 text-emerald-800",
      reject: "bg-rose-100 text-rose-800",
      complete: "bg-teal-100 text-teal-800",
      cancel: "bg-orange-100 text-orange-800",
      assign: "bg-indigo-100 text-indigo-800",
    };
    return colorMap[action] || "bg-gray-100 text-gray-800";
  };

  // Calcular total de páginas
  const totalPages = auditLogs?.totalPages || 1;

  // Filtrar logs pelo termo de busca
  const filteredLogs = auditLogs?.logs.filter((log: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      log.user?.fullName?.toLowerCase().includes(searchLower) ||
      log.resource?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      log.details?.toLowerCase().includes(searchLower) ||
      log.ipAddress?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Histórico</h1>
        <p className="text-gray-600">
          Histórico de ações realizadas no sistema
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Filtre o histórico por usuário, tipo de recurso, ação ou período
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Filtro por usuário */}
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os usuários" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Todos os usuários</SelectItem>
                        {metadata?.users?.map((user: any) => (
                          <SelectItem
                            key={user.id}
                            value={user.id.toString()}
                          >
                            {user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Filtro por recurso */}
              <FormField
                control={form.control}
                name="resource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurso</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os recursos" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Todos os recursos</SelectItem>
                        {metadata?.resources?.map((resource: any) => (
                          <SelectItem key={resource.key} value={resource.key}>
                            {resource.text}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Filtro por ação */}
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ação</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as ações" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Todas as ações</SelectItem>
                        {metadata?.actions?.map((action: any) => (
                          <SelectItem key={action.key} value={action.key}>
                            {action.text}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Filtro por data inicial */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data inicial</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              {/* Filtro por data final */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data final</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              {/* Botões de filtro */}
              <div className="flex items-end gap-2">
                <Button type="submit" className="flex-1">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filtrar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset({
                      userId: "",
                      resource: "",
                      action: "",
                      startDate: null,
                      endDate: null,
                    });
                    setPage(1);
                    refetch();
                  }}
                  className="flex-1"
                >
                  Limpar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-0">
          <div>
            <CardTitle className="text-lg">Logs de Auditoria</CardTitle>
            <CardDescription>
              Histórico detalhado das ações realizadas no sistema
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar log..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredLogs?.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhum registro encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs?.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            {log.user ? log.user.fullName : "Sistema"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getResourceText(log.resource)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "font-normal",
                              getActionColor(log.action)
                            )}
                          >
                            {getActionText(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          <span title={log.details}>
                            {log.details
                              ? log.details.length > 80
                                ? `${log.details.substring(0, 80)}...`
                                : log.details
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {auditLogs && auditLogs.totalPages > 1 && (
                <div className="p-4 border-t">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          className={
                            page === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {Array.from(
                        { length: Math.min(5, auditLogs.totalPages) },
                        (_, i) => {
                          let pageNum;
                          // Lógica para mostrar páginas adequadamente
                          if (auditLogs.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (
                            page >= auditLogs.totalPages - 2
                          ) {
                            pageNum =
                              auditLogs.totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <PaginationItem key={i}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(pageNum);
                                }}
                                isActive={page === pageNum}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                      )}

                      {auditLogs.totalPages > 5 &&
                        ((page <= 3 && auditLogs.totalPages > 5) ||
                          (page >= auditLogs.totalPages - 2 &&
                            auditLogs.totalPages - page > 3)) && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < auditLogs.totalPages)
                              setPage(page + 1);
                          }}
                          className={
                            page === auditLogs.totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}