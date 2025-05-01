import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

export interface UserMessage {
  id: number;
  userId: number;
  message: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userName?: string; // Campo adicional para mostrar en la UI
}

interface CreateUserMessageParams {
  userId: number;
  message: string;
}

interface UpdateUserMessageParams {
  id: number;
  userId: number;
  message: string;
}

interface UpdateUserMessageStatusParams {
  id: number;
  userId: number;
  isActive: boolean;
}

interface DeleteUserMessageParams {
  id: number;
  userId: number;
}

export function useUserMessages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMessageMutation = useMutation({
    mutationFn: async ({ userId, message }: CreateUserMessageParams) => {
      const response = await fetch(`/api/user-messages/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Error al crear el mensaje");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Mensaje creado",
        description: "El mensaje se ha creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user-messages/${variables.userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages/all"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, userId, message }: UpdateUserMessageParams) => {
      const response = await fetch(`/api/user-messages/${userId}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Error al actualizar el mensaje");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Mensaje actualizado",
        description: "El contenido del mensaje ha sido actualizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user-messages/${variables.userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages/all"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMessageStatusMutation = useMutation({
    mutationFn: async ({ id, userId, isActive }: UpdateUserMessageStatusParams) => {
      const response = await fetch(`/api/user-messages/${userId}/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Error al actualizar el estado del mensaje");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Estado actualizado",
        description: `El mensaje ahora está ${variables.isActive ? "activo" : "inactivo"}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user-messages/${variables.userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages/all"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async ({ id, userId }: DeleteUserMessageParams) => {
      const response = await fetch(`/api/user-messages/${userId}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Error al eliminar el mensaje");
      }

      return true;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Mensaje eliminado",
        description: "El mensaje ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/user-messages/${variables.userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-messages/all"] });
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
    createMessageMutation,
    updateMessageMutation,
    updateMessageStatusMutation,
    deleteMessageMutation,
  };
}