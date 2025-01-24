import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Category, InsertCategory } from '@db/schema';
import { useToast } from './use-toast';

export function useCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener categorías
  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Crear nueva categoría
  const addCategory = async (category: Partial<InsertCategory>) => {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al crear la categoría');
    }

    return response.json();
  };

  // Actualizar categoría
  const updateCategory = async ({ id, ...category }: Partial<Category>) => {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(category),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al actualizar la categoría');
    }

    return response.json();
  };

  // Eliminar categoría
  const deleteCategory = async (id: number) => {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Error al eliminar la categoría');
    }

    return response.json();
  };

  const addCategoryMutation = useMutation({
    mutationFn: addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "¡Éxito!",
        description: "Categoría creada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear la categoría",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "¡Éxito!",
        description: "Categoría actualizada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la categoría",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "¡Éxito!",
        description: "Categoría eliminada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar la categoría",
        variant: "destructive",
      });
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    addCategory: addCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
  };
}
