import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRole } from "@db/schema";

import { Navbar } from "@/components/ui/navbar";

export default function TablesViewer() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({ 
    username: "", 
    password: "", 
    nombreCompleto: "", 
    email: "",
    nombreEmpresa: "",
    rutEmpresa: "",
    direccion: "", 
    telefono: "", 
    role: UserRole.CLIENTE 
  });
  const [selectedReceipts, setSelectedReceipts] = useState<number[]>([]);

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

  const handleDownloadMultiple = () => {
    selectedReceipts.forEach((receiptId) => {
      const receipt = receipts?.find((r) => r.id === receiptId);
      if (receipt?.imageUrl) {
        const a = document.createElement('a');
        a.href = receipt.imageUrl;
        a.download = `boleta-${receipt.receiptId}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
    setSelectedReceipts([]);
    toast({
      title: "Descarga iniciada",
      description: `Se están descargando ${selectedReceipts.length} boletas`,
    });
  };

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

  const validateEmail = (email: string) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email);
  };

  const createUserMutation = useMutation({
    mutationFn: async (newUser: any) => {
      if (!newUser.username || !validateEmail(newUser.username)) {
        throw new Error('Por favor ingrese un correo electrónico válido');
      }
      if (!newUser.password || newUser.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      if (!newUser.nombreCompleto) {
        throw new Error('El nombre completo es requerido');
      }
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear usuario');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Usuario creado exitosamente" });
      setNewUser({ 
        username: "", 
        password: "", 
        nombreCompleto: "", 
        email: "",
        nombreEmpresa: "",
        rutEmpresa: "",
        direccion: "", 
        telefono: "", 
        role: UserRole.CLIENTE 
      });
      setIsCreatingUser(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });


  if (!isAdmin) {
    return <div className="container mx-auto p-4">No tienes acceso a esta página.</div>;
  }

  return (
    <div>
      <Navbar />
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
                      <TableHead>Empresa</TableHead>
                      <TableHead>Contacto</TableHead>
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
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.nombreEmpresa}</div>
                            <div className="text-sm text-muted-foreground">{user.rutEmpresa}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{user.email}</div>
                            <div className="text-sm text-muted-foreground">{user.telefono}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog onOpenChange={(open) => {
                                if (open) setEditingItem(user);
                              }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Editar Usuario</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  updateMutation.mutate({ type: 'users', item: editingItem });
                                }} className="space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="username">Username / Email</Label>
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
                                    <div className="space-y-2">
                                      <Label htmlFor="password">Contraseña (dejar en blanco para mantener)</Label>
                                      <Input
                                        id="password"
                                        type="password"
                                        placeholder="Nueva contraseña"
                                        value={editingItem?.newPassword || ""}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          newPassword: e.target.value
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="email">Correo electrónico</Label>
                                      <Input
                                        id="email"
                                        type="email"
                                        value={editingItem?.email || ""}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          email: e.target.value
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="nombreEmpresa">Nombre de Empresa</Label>
                                      <Input
                                        id="nombreEmpresa"
                                        value={editingItem?.nombreEmpresa || ""}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          nombreEmpresa: e.target.value
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="rutEmpresa">RUT Empresa</Label>
                                      <Input
                                        id="rutEmpresa"
                                        value={editingItem?.rutEmpresa || ""}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          rutEmpresa: e.target.value
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="direccion">Dirección</Label>
                                      <Input
                                        id="direccion"
                                        value={editingItem?.direccion || ""}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          direccion: e.target.value
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="telefono">Teléfono</Label>
                                      <Input
                                        id="telefono"
                                        value={editingItem?.telefono || ""}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          telefono: e.target.value
                                        })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="role">Rol</Label>
                                      <select
                                        id="role"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={editingItem?.role || UserRole.CLIENTE}
                                        onChange={(e) => setEditingItem({
                                          ...editingItem,
                                          role: e.target.value
                                        })}
                                      >
                                        <option value={UserRole.CLIENTE}>Cliente</option>
                                        <option value={UserRole.ADMINISTRADOR}>Administrador</option>
                                        <option value={UserRole.EMPLEADO}>Empleado</option>
                                      </select>
                                    </div>
                                  </div>
                                  <Button type="submit" className="w-full">Guardar Cambios</Button>
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

                <Button
                  className="mt-4"
                  onClick={() => setIsCreatingUser(true)}
                >
                  Agregar Usuario
                </Button>

                <Dialog open={isCreatingUser} onOpenChange={setIsCreatingUser}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Correo Electrónico</Label>
                          <Input
                            value={newUser.username}
                            onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                            type="email"
                          />
                        </div>
                        <div>
                          <Label>Contraseña</Label>
                          <Input
                            value={newUser.password}
                            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            type="password"
                          />
                        </div>
                        <div>
                          <Label>Nombre Completo</Label>
                          <Input
                            value={newUser.nombreCompleto}
                            onChange={(e) => setNewUser({...newUser, nombreCompleto: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={newUser.email}
                            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            type="email"
                          />
                        </div>
                        <div>
                          <Label>Nombre Empresa</Label>
                          <Input
                            value={newUser.nombreEmpresa}
                            onChange={(e) => setNewUser({...newUser, nombreEmpresa: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>RUT Empresa</Label>
                          <Input
                            value={newUser.rutEmpresa}
                            onChange={(e) => setNewUser({...newUser, rutEmpresa: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Dirección</Label>
                          <Input
                            value={newUser.direccion}
                            onChange={(e) => setNewUser({...newUser, direccion: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Teléfono</Label>
                          <Input
                            value={newUser.telefono}
                            onChange={(e) => setNewUser({...newUser, telefono: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Rol</Label>
                          <select 
                            className="w-full rounded-md border border-input bg-background px-3 py-2"
                            value={newUser.role}
                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                          >
                            <option value={UserRole.CLIENTE}>Cliente</option>
                            <option value={UserRole.EMPLEADO}>Empleado</option>
                            <option value={UserRole.ADMINISTRADOR}>Administrador</option>
                          </select>
                        </div>
                      </div>
                      <Button onClick={() => createUserMutation.mutate(newUser)} className="w-full">
                        Crear Usuario
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="categories">
                <div className="mb-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Agregar Categoría</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nueva Categoría</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newCategory = {
                          name: formData.get('name'),
                          description: formData.get('description')
                        };
                        fetch('/api/categories', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(newCategory)
                        })
                        .then(response => {
                          if (!response.ok) throw new Error('Error al crear categoría');
                          return response.json();
                        })
                        .then(() => {
                          queryClient.invalidateQueries({ queryKey: ['categories'] });
                          toast({ title: "Categoría creada exitosamente" });
                        })
                        .catch(error => {
                          toast({ 
                            title: "Error", 
                            description: error.message,
                            variant: "destructive"
                          });
                        });
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nombre</Label>
                          <Input id="name" name="name" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Descripción</Label>
                          <Input id="description" name="description" required />
                        </div>
                        <Button type="submit">Crear Categoría</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
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
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedReceipts.length > 0 && selectedReceipts.length === receipts?.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedReceipts(receipts?.map(r => r.id) || []);
                            } else {
                              setSelectedReceipts([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Receipt ID</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts?.map((receipt: any) => (
                      <TableRow key={receipt.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReceipts.includes(receipt.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedReceipts([...selectedReceipts, receipt.id]);
                              } else {
                                setSelectedReceipts(selectedReceipts.filter(id => id !== receipt.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{receipt.id}</TableCell>
                        <TableCell>{receipt.receiptId}</TableCell>
                        <TableCell>{receipt.username}</TableCell>
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
                {selectedReceipts.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleDownloadMultiple}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Descargar {selectedReceipts.length} boletas seleccionadas
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}