import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AlertRule, InsertAlertRule, AlertNotification } from '@db/schema';
import { useToast } from './use-toast';

export function useAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener reglas de alertas
  const rulesQuery = useQuery<AlertRule[]>({
    queryKey: ['/api/alerts/rules'],
  });

  // Obtener notificaciones
  const notificationsQuery = useQuery<AlertNotification[]>({
    queryKey: ['/api/alerts/notifications'],
  });

  // Crear nueva regla de alerta
  const addRule = async (rule: Partial<InsertAlertRule>) => {
    const response = await fetch('/api/alerts/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rule),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al crear la regla de alerta');
    }

    return response.json();
  };

  // Activar/desactivar regla
  const toggleRule = async (id: number, isActive: boolean) => {
    const response = await fetch(`/api/alerts/rules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al actualizar la regla');
    }

    return response.json();
  };

  // Marcar notificación como leída
  const markAsRead = async (id: number) => {
    const response = await fetch(`/api/alerts/notifications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isRead: true }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al marcar la notificación');
    }

    return response.json();
  };

  const addRuleMutation = useMutation({
    mutationFn: addRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/rules'] });
      toast({
        title: "¡Éxito!",
        description: "Regla de alerta creada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la regla",
        variant: "destructive",
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      toggleRule(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/rules'] });
      toast({
        title: "¡Éxito!",
        description: "Regla actualizada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la regla",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/notifications'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al marcar la notificación",
        variant: "destructive",
      });
    },
  });

  return {
    rules: rulesQuery.data || [],
    notifications: notificationsQuery.data || [],
    isLoading: rulesQuery.isLoading || notificationsQuery.isLoading,
    addRule: addRuleMutation.mutateAsync,
    toggleRule: toggleRuleMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
  };
}
