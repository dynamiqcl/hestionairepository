import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Receipt, InsertReceipt } from '@db/schema';

export function useReceipts() {
  const queryClient = useQueryClient();

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
    });

    if (!response.ok) {
      throw new Error('Failed to add receipt');
    }

    return response.json();
  };

  const mutation = useMutation({
    mutationFn: addReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
    },
  });

  return {
    ...query,
    addReceipt: mutation.mutateAsync,
  };
}
