import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export interface UserMessage {
  id: number;
  userId: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useUserMessages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener mensaje para un usuario específico
  const getUserMessage = (userId: number) => {
    return useQuery<UserMessage | null>({
      queryKey: ['/api/user-messages', userId],
      queryFn: async () => {
        const response = await fetch(`/api/user-messages/${userId}`);
        if (!response.ok) {
          throw new Error('Error al obtener el mensaje del usuario');
        }
        const data = await response.json();
        return data;
      },
      enabled: !!userId
    });
  };

  // Crear o actualizar mensaje
  const createMessageMutation = useMutation({
    mutationFn: async (data: { userId: number; message: string }) => {
      const response = await fetch('/api/user-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear mensaje');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mensaje creado",
        description: "El mensaje ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-messages', data.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actualizar estado de un mensaje
  const updateMessageStatusMutation = useMutation({
    mutationFn: async ({ id, isActive, userId }: { id: number; isActive: boolean; userId: number }) => {
      const response = await fetch(`/api/user-messages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar mensaje');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mensaje actualizado",
        description: `El mensaje ha sido ${data.isActive ? 'activado' : 'desactivado'} correctamente`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-messages', data.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Eliminar mensaje
  const deleteMessageMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: number; userId: number }) => {
      const response = await fetch(`/api/user-messages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar mensaje');
      }

      return { id, userId };
    },
    onSuccess: (data) => {
      toast({
        title: "Mensaje eliminado",
        description: "El mensaje ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-messages', data.userId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    getUserMessage,
    createMessageMutation,
    updateMessageStatusMutation,
    deleteMessageMutation,
  };
}