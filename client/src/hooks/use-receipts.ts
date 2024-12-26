import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Receipt, InsertReceipt } from '@db/schema';
import { useToast } from './use-toast';

export function useReceipts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<Receipt[]>({
    queryKey: ['/api/receipts'],
  });

  const addReceipt = async (receipt: Partial<InsertReceipt>) => {
    const response = await fetch('/api/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receipt),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al agregar la boleta');
    }

    return response.json();
  };

  const updateReceipt = async ({ id, ...data }: Partial<InsertReceipt> & { id: number }) => {
    const response = await fetch(`/api/receipts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al actualizar la boleta');
    }

    return response.json();
  };

  const deleteReceipt = async (id: number) => {
    const response = await fetch(`/api/receipts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al eliminar la boleta');
    }

    return response.json();
  };

  const addMutation = useMutation({
    mutationFn: addReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      toast({
        title: "¡Éxito!",
        description: "Boleta agregada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al agregar la boleta",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      toast({
        title: "¡Éxito!",
        description: "Boleta actualizada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la boleta",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
      toast({
        title: "¡Éxito!",
        description: "Boleta eliminada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar la boleta",
        variant: "destructive",
      });
    },
  });

  return {
    ...query,
    addReceipt: addMutation.mutateAsync,
    updateReceipt: updateMutation.mutateAsync,
    deleteReceipt: deleteMutation.mutateAsync,
  };
}