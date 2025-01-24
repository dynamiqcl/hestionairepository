
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function TablesViewer() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Error al obtener usuarios');
      return response.json();
    },
    enabled: isAdmin
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Error al obtener categorías');
      return response.json();
    }
  });

  const { data: receipts } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const response = await fetch('/api/receipts');
      if (!response.ok) throw new Error('Error al obtener boletas');
      return response.json();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ type, item }: { type: string; item: any }) => {
      const response = await fetch(`/api/${type}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error(`Error al actualizar ${type}`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.type] });
      toast({ title: "Actualización exitosa" });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      const response = await fetch(`/api/${type}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`Error al eliminar ${type}`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.type] });
      toast({ title: "Eliminación exitosa" });
    },
  });

  if (!isAdmin) {
    return <div className="container mx-auto p-4">No tienes acceso a esta página.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Mantenedor de Tablas</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="categories">Categorías</TabsTrigger>
              <TabsTrigger value="receipts">Boletas</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.nombreCompleto}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Usuario</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={(e) => {
                                e.preventDefault();
                                updateMutation.mutate({ type: 'users', item: editingItem });
                              }} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="username">Username</Label>
                                  <Input
                                    id="username"
                                    value={editingItem?.username}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      username: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                                  <Input
                                    id="nombreCompleto"
                                    value={editingItem?.nombreCompleto}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      nombreCompleto: e.target.value
                                    })}
                                  />
                                </div>
                                <Button type="submit">Guardar Cambios</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('¿Estás seguro de eliminar este usuario?')) {
                                deleteMutation.mutate({ type: 'users', id: user.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="categories">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((category: any) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.id}</TableCell>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Categoría</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={(e) => {
                                e.preventDefault();
                                updateMutation.mutate({ type: 'categories', item: editingItem });
                              }} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="name">Nombre</Label>
                                  <Input
                                    id="name"
                                    value={editingItem?.name}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      name: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="description">Descripción</Label>
                                  <Input
                                    id="description"
                                    value={editingItem?.description}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      description: e.target.value
                                    })}
                                  />
                                </div>
                                <Button type="submit">Guardar Cambios</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('¿Estás seguro de eliminar esta categoría?')) {
                                deleteMutation.mutate({ type: 'categories', id: category.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="receipts">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts?.map((receipt: any) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{receipt.id}</TableCell>
                      <TableCell>{receipt.receiptId}</TableCell>
                      <TableCell>{new Date(receipt.date).toLocaleDateString()}</TableCell>
                      <TableCell>${receipt.total}</TableCell>
                      <TableCell>{receipt.vendor}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Boleta</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={(e) => {
                                e.preventDefault();
                                updateMutation.mutate({ type: 'receipts', item: editingItem });
                              }} className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="vendor">Vendedor</Label>
                                  <Input
                                    id="vendor"
                                    value={editingItem?.vendor}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      vendor: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="total">Total</Label>
                                  <Input
                                    id="total"
                                    type="number"
                                    value={editingItem?.total}
                                    onChange={(e) => setEditingItem({
                                      ...editingItem,
                                      total: parseFloat(e.target.value)
                                    })}
                                  />
                                </div>
                                <Button type="submit">Guardar Cambios</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('¿Estás seguro de eliminar esta boleta?')) {
                                deleteMutation.mutate({ type: 'receipts', id: receipt.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
