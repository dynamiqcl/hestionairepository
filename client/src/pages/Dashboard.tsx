import { useState } from "react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BarChart, Calendar, DollarSign, Receipt, LogOut, Download, Plus, Settings, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Función para formatear montos en CLP
const formatCLP = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

interface Receipt {
  id: number;
  receiptId: string;
  date: string;
  total: number;
  vendor: string;
  imageUrl: string;
  companyName?: string;
  category?: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [selectedReceipts, setSelectedReceipts] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vendor: '',
    category: '',
  });

  // Queries
  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: ['/api/receipts'],
  });

  const { data: categories = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ['/api/categories'],
  });

  // Filtered receipts
  const filteredReceipts = receipts.filter(receipt => {
    const receiptDate = new Date(receipt.date);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    return (!startDate || receiptDate >= startDate) &&
           (!endDate || receiptDate <= endDate) &&
           (!filters.vendor || receipt.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) &&
           (!filters.category || (receipt.category || '').toLowerCase().includes(filters.category.toLowerCase()));
  });

  const userReceipts = filteredReceipts.filter(receipt => receipt.id);
  const totalAmount = userReceipts.reduce((sum, receipt) => sum + receipt.total, 0);

  // Chart data
  const pieChartData = userReceipts.reduce((acc: any[], receipt) => {
    const category = receipt.category || 'Sin categoría';
    const existingCategory = acc.find(item => item.name === category);
    if (existingCategory) {
      existingCategory.value += receipt.total;
    } else {
      acc.push({ name: category, value: receipt.total });
    }
    return acc;
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const handleDownloadMultiple = () => {
    if (selectedReceipts.length === 0) return;

    import('xlsx').then(XLSX => {
      const selectedData = filteredReceipts
        .filter(receipt => selectedReceipts.includes(receipt.id))
        .map(receipt => ({
          ID: receipt.receiptId,
          Fecha: new Date(receipt.date).toLocaleDateString('es-ES'),
          Empresa: receipt.companyName || 'Sin empresa',
          Proveedor: receipt.vendor,
          Categoría: receipt.category || 'Sin categoría',
          Total: formatCLP(receipt.total),
        }));

      const worksheet = XLSX.utils.json_to_sheet(selectedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Boletas");
      XLSX.writeFile(workbook, `boletas-${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Excel generado",
        description: `Se ha generado un Excel con ${selectedReceipts.length} boletas`,
      });
      setSelectedReceipts([]);
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Panel de Control</h1>
          <p className="text-muted-foreground">Bienvenido, {user?.nombreCompleto || user?.username}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Boleta
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => logout()}>
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
            <div className="text-2xl font-bold">{userReceipts.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Distribución por Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatCLP(value)}`}
                >
                  {pieChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Boletas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Label>Desde:</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label>Hasta:</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label>Categoría:</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedReceipts.length > 0 && selectedReceipts.length === filteredReceipts.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedReceipts(filteredReceipts.map(r => r.id));
                        } else {
                          setSelectedReceipts([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userReceipts.map((receipt) => (
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
                    <TableCell>{receipt.receiptId}</TableCell>
                    <TableCell>{new Date(receipt.date).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>{receipt.companyName || 'Sin empresa'}</TableCell>
                    <TableCell>{receipt.vendor}</TableCell>
                    <TableCell>{receipt.category || 'Sin categoría'}</TableCell>
                    <TableCell>{formatCLP(receipt.total)}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <Button variant="ghost" size="sm" asChild>
                          <DialogTitle>
                            <Eye className="h-4 w-4" />
                          </DialogTitle>
                        </Button>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Boleta {receipt.receiptId}</DialogTitle>
                          </DialogHeader>
                          <div className="relative w-full aspect-[3/4]">
                            <img
                              src={receipt.imageUrl}
                              alt={`Boleta ${receipt.receiptId}`}
                              className="object-contain w-full h-full"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {selectedReceipts.length > 0 && (
              <div className="flex justify-end mt-4">
                <Button onClick={handleDownloadMultiple}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar {selectedReceipts.length} boletas
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}