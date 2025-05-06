import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { appointmentStatusEnum, procedureTypeEnum } from "@shared/schema";
import { useEffect } from "react";

// Define form schema
const appointmentFormSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  professionalId: z.string().min(1, "Profissional é obrigatório"),
  roomId: z.string().min(1, "Sala é obrigatória"),
  facilityId: z.string().min(1, "Unidade é obrigatória"),
  startTime: z.string().min(1, "Data e hora de início são obrigatórias"),
  endTime: z.string().min(1, "Data e hora de término são obrigatórias"),
  procedureType: z.string().min(1, "Procedimento é obrigatório"),
  status: z.string().min(1, "Status é obrigatório"),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: number;
  facilityId?: number;
  date?: Date;
  time?: string;
}

export function AppointmentForm({ 
  isOpen, 
  onClose, 
  appointmentId, 
  facilityId: initialFacilityId,
  date,
  time
}: AppointmentFormProps) {
  const { toast } = useToast();
  const isEditing = !!appointmentId;
  
  // Fetch appointment data if editing
  const { data: appointmentData, isLoading: isLoadingAppointment } = useQuery<any>({
    queryKey: [`/api/appointments/${appointmentId}`],
    enabled: isEditing && isOpen,
  });
  
  // Fetch facilities
  const { data: facilities } = useQuery<any[]>({
    queryKey: ["/api/facilities"],
    enabled: isOpen,
  });
  
  // Fetch patients
  const { data: patients } = useQuery<any[]>({
    queryKey: ["/api/patients"],
    enabled: isOpen,
  });
  
  // Fetch professionals
  const { data: professionals } = useQuery<any[]>({
    queryKey: ["/api/professionals"],
    enabled: isOpen,
  });
  
  // Create form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      professionalId: "",
      roomId: "",
      facilityId: initialFacilityId?.toString() || "",
      startTime: date ? `${date.toISOString().split('T')[0]}T${time || '08:00'}` : "",
      endTime: date ? `${date.toISOString().split('T')[0]}T${time ? (parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0') + ':00' : '09:00'}` : "",
      procedureType: "",
      status: "scheduled",
      notes: "",
    },
  });
  
  // Handle form submission
  const createAppointmentMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      // Convert form string values to appropriate types
      const formattedValues = {
        ...values,
        patientId: parseInt(values.patientId),
        professionalId: parseInt(values.professionalId),
        roomId: parseInt(values.roomId),
        facilityId: parseInt(values.facilityId),
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
      };
      
      const res = await apiRequest(
        isEditing ? "PUT" : "POST",
        isEditing ? `/api/appointments/${appointmentId}` : "/api/appointments",
        formattedValues
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Agendamento atualizado" : "Agendamento criado",
        description: isEditing ? "O agendamento foi atualizado com sucesso." : "O agendamento foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: isEditing ? "Erro ao atualizar agendamento" : "Erro ao criar agendamento",
        description: error.message || "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Fetch rooms based on selected facility
  const selectedFacilityId = form.watch("facilityId");
  const { data: rooms } = useQuery<any[]>({
    queryKey: [`/api/facilities/${selectedFacilityId}/rooms`],
    enabled: isOpen && !!selectedFacilityId && selectedFacilityId !== "",
  });
  
  // Set form values when editing an existing appointment
  useEffect(() => {
    if (appointmentData && isEditing) {
      const startDate = new Date(appointmentData.startTime);
      const endDate = new Date(appointmentData.endTime);
      
      form.reset({
        patientId: appointmentData.patientId.toString(),
        professionalId: appointmentData.professionalId.toString(),
        roomId: appointmentData.roomId.toString(),
        facilityId: appointmentData.facilityId.toString(),
        startTime: startDate.toISOString().slice(0, 16), // Format: "YYYY-MM-DDTHH:MM"
        endTime: endDate.toISOString().slice(0, 16), // Format: "YYYY-MM-DDTHH:MM"
        procedureType: appointmentData.procedureType,
        status: appointmentData.status,
        notes: appointmentData.notes || "",
      });
    }
  }, [appointmentData, isEditing, form]);
  
  // Handle form submission
  const onSubmit = (values: AppointmentFormValues) => {
    createAppointmentMutation.mutate(values);
  };
  
  // Special patient for free time/planning
  const getSpecialPatients = () => {
    const specialPatients = [];
    
    // Check if "Horário Livre/Planejamento" already exists in patients
    const existingSpecialPatient = patients?.find(p => p.fullName === "Horário Livre e Planejamento");
    
    if (!existingSpecialPatient) {
      specialPatients.push({
        id: "special_patient",
        fullName: "Horário Livre e Planejamento"
      });
    }
    
    return [...(patients || []), ...specialPatients];
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Agendamento" : "Agendar Atendimento"}</DialogTitle>
        </DialogHeader>
        
        {isEditing && isLoadingAppointment ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={createAppointmentMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getSpecialPatients()?.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="professionalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={createAppointmentMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um profissional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professionals?.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id.toString()}>
                            {professional.user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="facilityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createAppointmentMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma unidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {facilities?.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id.toString()}>
                              {facility.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="roomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sala</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!selectedFacilityId || createAppointmentMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma sala" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms?.map((room) => (
                            <SelectItem key={room.id} value={room.id.toString()}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora de Início</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          disabled={createAppointmentMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora de Término</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          disabled={createAppointmentMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="procedureType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procedimento</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createAppointmentMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um procedimento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="psychology_aba">Psicologia - ABA</SelectItem>
                          <SelectItem value="psychology_cbt">Psicologia - TCC</SelectItem>
                          <SelectItem value="physiotherapy_psychomotor">Fisioterapia - Psicomotricidade</SelectItem>
                          <SelectItem value="physiotherapy_conventional">Fisioterapia - Convencional</SelectItem>
                          <SelectItem value="speech_therapy">Fonoaudiologia</SelectItem>
                          <SelectItem value="occupational_therapy">Terapia Ocupacional</SelectItem>
                          <SelectItem value="planning">Planejamento</SelectItem>
                          <SelectItem value="free_time">Horário Livre</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createAppointmentMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Agendado</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="completed">Finalizado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                          <SelectItem value="no_show">Não Compareceu</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações sobre o agendamento"
                        {...field}
                        disabled={createAppointmentMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={createAppointmentMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Atualizar" : "Agendar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
