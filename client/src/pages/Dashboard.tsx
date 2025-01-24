import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReceipts } from "@/hooks/use-receipts";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { BarChart, Calendar, DollarSign, Receipt, LogOut, Download, Pencil, Trash2, Bell, Plus, Settings, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Menu, X } from "lucide-react";
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
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// Función para formatear montos en CLP
const formatCLP = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function Dashboard() {
  const { data: receipts, isLoading, deleteReceipt } = useReceipts();
  const { user, logout, isAdmin } = useAuth();
  const [newCompany, setNewCompany] = useState({ name: "", rut: "" });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  const { data: companies } = useQuery({
    queryKey: ['/api/companies'],
  });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCompany),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast({
        title: "¡Éxito!",
        description: "Empresa creada correctamente",
      });

      // Invalidar la cache para recargar las empresas
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setNewCompany({ name: "", rut: "" });
    } catch (error) {
      console.error('Error al crear empresa:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear empresa",
        variant: "destructive",
      });
    }
  };

  // Calcular totales y datos para el gráfico
  const totalAmount = receipts?.reduce((sum, receipt) => sum + Number(receipt.total), 0) || 0;
  const receiptCount = receipts?.length || 0;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center w-full justify-between md:w-auto">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">Panel de Rendiciones</h1>
            <p className="text-muted-foreground">Bienvenido, {user?.nombreCompleto || user?.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="hidden md:flex md:items-center md:space-x-4">
          <Link href="/upload">
            <Button variant="ghost">
              <Receipt className="w-4 h-4 mr-2" />
              Subir Boleta
            </Button>
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Empresa</DialogTitle>
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
                <div className="flex justify-end gap-2">
                  <Button type="submit">Crear Empresa</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          {isAdmin && (
            <Link href="/tables">
              <Button variant="ghost">
                <Settings className="w-4 h-4 mr-2" />
                Mantenedores
              </Button>
            </Link>
          )}
          <Button variant="ghost" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
        
        {/* Mobile menu */}
        <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:hidden flex-col w-full space-y-2`}>
          <Link href="/upload">
            <Button variant="ghost" className="w-full justify-start">
              <Receipt className="w-4 h-4 mr-2" />
              Subir Boleta
            </Button>
          </Link>
          <Link href="/tables">
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Mantenedores
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Boletas Procesadas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receiptCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Boletas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left">ID</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Empresa</th>
                  <th className="p-4 text-left">Proveedor</th>
                  <th className="p-4 text-left">Categoría</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {receipts?.map((receipt) => (
                  <tr key={receipt.id} className="border-b">
                    <td className="p-4">{receipt.receiptId}</td>
                    <td className="p-4">{new Date(receipt.date).toLocaleDateString('es-ES')}</td>
                    <td className="p-4">{receipt.companyName || 'Sin empresa'}</td>
                    <td className="p-4">{receipt.vendor}</td>
                    <td className="p-4">{receipt.category || 'Sin categoría'}</td>
                    <td className="p-4 text-right">{formatCLP(Number(receipt.total))}</td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {receipt.imageUrl && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Ver imagen"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>Boleta {receipt.receiptId}</DialogTitle>
                                </DialogHeader>
                                <div className="relative w-full aspect-[3/4]">
                                  <img
                                    src={receipt.imageUrl}
                                    alt={`Boleta ${receipt.receiptId}`}
                                    className="object-contain w-full h-full max-h-[80vh]"
                                    style={{ 
                                      maxWidth: '100%',
                                      margin: '0 auto',
                                      display: 'block'
                                    }}
                                    onError={(e) => {
                                      console.error('Error loading image:', receipt.imageUrl);
                                      e.currentTarget.src = 'https://via.placeholder.com/400x600?text=Error+al+cargar+imagen';
                                    }}
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = receipt.imageUrl!;
                                a.download = `boleta-${receipt.receiptId}.jpg`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              title="Descargar imagen"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la boleta.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteReceipt(receipt.id)}
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