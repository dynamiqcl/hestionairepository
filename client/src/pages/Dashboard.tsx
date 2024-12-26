import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReceipts } from "@/hooks/use-receipts";
import { BarChart, Calendar, DollarSign, Receipt } from "lucide-react";
import { DataTable } from "@/components/ui/table";
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

  const totalAmount = receipts?.reduce((sum, receipt) => sum + Number(receipt.total), 0) || 0;
  const receiptCount = receipts?.length || 0;

  const chartData: ChartData<'bar'> = {
    labels: ['Food', 'Transport', 'Office', 'Other'],
    datasets: [{
      label: 'Expenses by Category',
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
        text: 'Expenses by Category'
      },
    },
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Receipt Dashboard</h1>
        <Link href="/upload">
          <Button>Upload Receipt</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts Processed</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receiptCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={chartData} options={chartOptions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">Vendor</th>
                  <th className="p-4 text-left">Category</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts?.map((receipt) => (
                  <tr key={receipt.id} className="border-b">
                    <td className="p-4">{new Date(receipt.date).toLocaleDateString()}</td>
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