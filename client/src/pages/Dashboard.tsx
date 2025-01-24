import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReceipts } from "@/hooks/use-receipts";
import { BarChart, Calendar, DollarSign, Receipt, LogOut, Download, Pencil, Trash2, Bell, Plus } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Función para formatear montos en CLP
const formatCLP = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

const categories = ['Alimentación', 'Transporte', 'Oficina', 'Otros'];

export default function Dashboard() {
  const { data: receipts, isLoading, updateReceipt, deleteReceipt } = useReceipts();
  const { user, logout } = useAuth();
  const [editingReceipt, setEditingReceipt] = useState<any>(null);
  const [newCompany, setNewCompany] = useState({ name: "", rut: "" });

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCompany),
      });
      
      if (response.ok) {
        setNewCompany({ name: "", rut: "" });
        window.location.reload();
      }
    } catch (error) {
      console.error('Error al crear empresa:', error);
    }
  };

  // Calcular totales y datos para el gráfico
  const totalAmount = receipts?.reduce((sum, receipt) => sum + Number(receipt.total), 0) || 0;
  const receiptCount = receipts?.length || 0;

  // Calcular gastos por categoría
  const expensesByCategory = receipts?.reduce((acc: Record<string, number>, receipt) => {
    const category = receipt.category || 'Otros';
    acc[category] = (acc[category] || 0) + Number(receipt.total);
    return acc;
  }, {}) || {};

  const chartData: ChartData<'bar'> = {
    labels: categories,
    datasets: [{
      label: 'Gastos por Categoría',
      data: categories.map(category => expensesByCategory[category] || 0),
      backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#6b7280'],
    }]
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Gastos por Categoría'
      },
    },
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    try {
      await updateReceipt(editingReceipt);
      setEditingReceipt(null);
    } catch (error) {
      console.error('Error al actualizar:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-4 md:p-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <motion.h1
            initial={{ x: -20 }}
            animate={{ x: 0 }}
            className="text-2xl md:text-4xl font-bold"
          >
            Panel de Rendiciones
          </motion.h1>
          <p className="text-muted-foreground">Bienvenido, {user?.nombreCompleto || user?.username}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button>
              <Receipt className="w-4 h-4 mr-2" />
              Subir Boleta
            </Button>
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    value={newCompany.rut}
                    onChange={(e) => setNewCompany({...newCompany, rut: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit">Crear Empresa</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Link href="/alerts">
            <Button variant="outline">
              <Bell className="w-4 h-4 mr-2" />
              Alertas
            </Button>
          </Link>
          <Button variant="outline" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCLP(totalAmount)}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boletas Procesadas</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{receiptCount}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 md:grid-cols-2 mb-8"
      >
        <Card className="col-span-full md:col-span-1">
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={chartData} options={chartOptions} />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
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
                    <th className="p-4 text-left">Proveedor</th>
                    <th className="p-4 text-left">Categoría</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {receipts?.map((receipt) => (
                      <motion.tr
                        key={receipt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="border-b"
                      >
                        <td className="p-4">{receipt.receiptId}</td>
                        <td className="p-4">{new Date(receipt.date).toLocaleDateString('es-ES')}</td>
                        <td className="p-4">{receipt.vendor}</td>
                        <td className="p-4">{receipt.category}</td>
                        <td className="p-4 text-right">{formatCLP(Number(receipt.total))}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            {receipt.imageUrl && (
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
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Asegurarse de que todos los campos estén correctamente formateados
                                    const receiptToSet = {
                                      ...receipt,
                                      date: new Date(receipt.date),
                                      total: Number(receipt.total),
                                      taxAmount: receipt.taxAmount ? Number(receipt.taxAmount) : Math.round(Number(receipt.total) * 0.19)
                                    };
                                    setEditingReceipt(receiptToSet);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Boleta</DialogTitle>
                                  <DialogDescription>
                                    Modifica los detalles de la boleta
                                  </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleEditSubmit} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="date">Fecha</Label>
                                    <Input
                                      id="date"
                                      type="date"
                                      value={format(new Date(editingReceipt?.date || Date.now()), 'yyyy-MM-dd')}
                                      onChange={(e) => setEditingReceipt({
                                        ...editingReceipt,
                                        date: new Date(e.target.value)
                                      })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="total">Monto Total (CLP)</Label>
                                    <Input
                                      id="total"
                                      type="number"
                                      value={editingReceipt?.total}
                                      onChange={(e) => setEditingReceipt({
                                        ...editingReceipt,
                                        total: parseInt(e.target.value),
                                        taxAmount: Math.round(parseInt(e.target.value) * 0.19)
                                      })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="vendor">Proveedor</Label>
                                    <Input
                                      id="vendor"
                                      value={editingReceipt?.vendor}
                                      onChange={(e) => setEditingReceipt({
                                        ...editingReceipt,
                                        vendor: e.target.value
                                      })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="category">Categoría</Label>
                                    <Select
                                      value={editingReceipt?.category}
                                      onValueChange={(value) => setEditingReceipt({
                                        ...editingReceipt,
                                        category: value
                                      })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categories.map((category) => (
                                          <SelectItem key={category} value={category}>
                                            {category}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button type="submit">Guardar Cambios</Button>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>
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
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}