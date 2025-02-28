import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function CompanyManager() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [newCompany, setNewCompany] = useState({ name: "", rut: "", direccion: "" }); // Added direccion
  const { user } = useAuth(); // Assuming useAuth provides user role

  const { data: companies } = useQuery({
    queryKey: ['/api/companies'],
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCompany),
        credentials: 'include',
      });

      if (!response.ok) throw new Error(await response.text());

      toast({ title: "¡Éxito!", description: "Empresa creada correctamente" });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setNewCompany({ name: "", rut: "", direccion: "" }); // Added direccion
      setIsCreating(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear empresa",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/companies/${editingCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCompany),
        credentials: 'include',
      });

      if (!response.ok) throw new Error(await response.text());

      toast({ title: "¡Éxito!", description: "Empresa actualizada correctamente" });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setEditingCompany(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar empresa",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCompany = async (id: number) => {
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error(await response.text());

      toast({ title: "¡Éxito!", description: "Empresa eliminada correctamente" });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar empresa",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4 space-y-6 mt-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Mis Empresas</h1>
          </div>
          {user?.role === 'ADMINISTRADOR' && ( //Conditional rendering for admin only
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Empresa
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">Nombre</th>
                    <th className="p-4 text-left">RUT</th>
                    <th className="p-4 text-left">Dirección</th> {/* Added Address column */}
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {companies?.map((company) => (
                    <tr key={company.id} className="border-b">
                      <td className="p-4">{company.name}</td>
                      <td className="p-4">{company.rut}</td>
                      <td className="p-4">{company.direccion}</td> {/* Added Address display */}
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCompany(company)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente la empresa.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCompany(company.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Empresa</DialogTitle>
              <DialogDescription>
                Ingresa los datos de la nueva empresa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <Input
                  id="rut"
                  value={newCompany.rut}
                  onChange={(e) => setNewCompany({ ...newCompany, rut: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2"> {/* Added address field */}
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={newCompany.direccion}
                  onChange={(e) => setNewCompany({ ...newCompany, direccion: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit">Crear Empresa</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
              <DialogDescription>
                Modifica los datos de la empresa
              </DialogDescription>
            </DialogHeader>
            {editingCompany && (
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre</Label>
                  <Input
                    id="edit-name"
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-rut">RUT</Label>
                  <Input
                    id="edit-rut"
                    value={editingCompany.rut}
                    onChange={(e) => setEditingCompany({ ...editingCompany, rut: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2"> {/* Added address field to edit dialog */}
                  <Label htmlFor="edit-direccion">Dirección</Label>
                  <Input
                    id="edit-direccion"
                    value={editingCompany.direccion}
                    onChange={(e) => setEditingCompany({ ...editingCompany, direccion: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit">Guardar Cambios</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}