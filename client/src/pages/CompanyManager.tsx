
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function CompanyManager() {
  const [newCompany, setNewCompany] = useState({ name: "", rut: "" });
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      setNewCompany({ name: "", rut: "" });
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
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Empresas</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Empresa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    value={newCompany.rut}
                    onChange={(e) => setNewCompany({...newCompany, rut: e.target.value})}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Crear Empresa</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left">Nombre</th>
                  <th className="p-4 text-left">RUT</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies?.map((company: any) => (
                  <tr key={company.id} className="border-b">
                    <td className="p-4">{company.name}</td>
                    <td className="p-4">{company.rut}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Empresa</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUpdateCompany} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">Nombre</Label>
                                <Input
                                  id="edit-name"
                                  value={editingCompany?.name}
                                  onChange={(e) => setEditingCompany({
                                    ...editingCompany,
                                    name: e.target.value
                                  })}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-rut">RUT</Label>
                                <Input
                                  id="edit-rut"
                                  value={editingCompany?.rut}
                                  onChange={(e) => setEditingCompany({
                                    ...editingCompany,
                                    rut: e.target.value
                                  })}
                                  required
                                />
                              </div>
                              <div className="flex justify-end">
                                <Button type="submit">Guardar Cambios</Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
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
    </div>
  );
}
