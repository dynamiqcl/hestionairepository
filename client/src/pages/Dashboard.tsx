import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReceipts } from "@/hooks/use-receipts";
import { BarChart, Calendar, DollarSign, Receipt, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const { data: receipts, isLoading } = useReceipts();
  const { user, logout } = useAuth();

  const totalAmount = receipts?.reduce((sum, receipt) => sum + Number(receipt.total), 0) || 0;
  const receiptCount = receipts?.length || 0;

  const chartData: ChartData<'bar'> = {
    labels: ['Alimentación', 'Transporte', 'Oficina', 'Otros'],
    datasets: [{
      label: 'Gastos por Categoría',
      data: [300, 450, 200, 150],
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

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">Panel de Rendiciones</h1>
          <p className="text-muted-foreground">Bienvenido, {user?.nombreCompleto || user?.username}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button>Subir Boleta</Button>
          </Link>
          <Button variant="outline" onClick={() => logout()}>
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
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
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

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card className="col-span-full md:col-span-1">
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={chartData} options={chartOptions} />
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
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Proveedor</th>
                  <th className="p-4 text-left">Categoría</th>
                  <th className="p-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {receipts?.map((receipt) => (
                  <tr key={receipt.id} className="border-b">
                    <td className="p-4">{new Date(receipt.date).toLocaleDateString('es-ES')}</td>
                    <td className="p-4">{receipt.vendor}</td>
                    <td className="p-4">{receipt.category}</td>
                    <td className="p-4 text-right">${Number(receipt.total).toFixed(2)}</td>
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