import { useState } from "react";
import { Link } from "wouter";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useReceipts } from "@/hooks/use-receipts";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { BarChart, Calendar, DollarSign, Receipt, LogOut, Download, Pencil, Trash2, Bell, Plus, Settings, Eye, FileText } from "lucide-react";
import { UserMessage } from "@/components/ui/user-message";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface Document {
  id: number;
  name: string;
  description: string;
  fileUrl: string;
  createdAt: string;
  targetUsers: number[];
  category?: string;
}

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
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    company: '',
    vendor: '',
    category: '',
    total: ''
  });
  const [selectedDocCategory, setSelectedDocCategory] = useState("");
  const [selectedReceipts, setSelectedReceipts] = useState<number[]>([]);

  const filteredReceipts = receipts?.filter(receipt => {
    const receiptDate = new Date(receipt.date);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    const isWithinDateRange =
      (!startDate || receiptDate >= startDate) &&
      (!endDate || receiptDate <= endDate);

    return isWithinDateRange &&
      (!filters.company || (receipt.companyName?.toLowerCase() || '').includes(filters.company.toLowerCase())) &&
      (!filters.vendor || (receipt.vendor?.toLowerCase() || '').includes(filters.vendor.toLowerCase())) &&
      (!filters.category || receipt.category?.toLowerCase().includes(filters.category.toLowerCase()));
  });

  const { data: companies } = useQuery({
    queryKey: ['/api/companies'],
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Calcular totales y datos para el gráfico usando los recibos filtrados
  const userFilteredReceipts = filteredReceipts?.filter(receipt => receipt.userId === user?.id) || [];
  const totalAmount = userFilteredReceipts.reduce((sum, receipt) => sum + Number(receipt.total), 0);
  const receiptCount = userFilteredReceipts.length;
  
  // Calcular los gastos del año anterior a la misma fecha
  const today = new Date();
  const currentYear = today.getFullYear();
  const lastYearReceipts = receipts?.filter(receipt => {
    const receiptDate = new Date(receipt.date);
    // Misma fecha pero un año menos
    return receipt.userId === user?.id && 
           receiptDate.getFullYear() === currentYear - 1 && 
           receiptDate.getMonth() <= today.getMonth() &&
           (receiptDate.getMonth() < today.getMonth() || receiptDate.getDate() <= today.getDate());
  }) || [];
  const lastYearTotalAmount = lastYearReceipts.reduce((sum, receipt) => sum + Number(receipt.total), 0);

  // Preparar datos para el gráfico de torta
  const pieChartData = userFilteredReceipts.reduce((acc: any[], receipt) => {
    const category = receipt.category || 'Sin categoría';
    const existingCategory = acc.find(item => item.name === category);
    if (existingCategory) {
      existingCategory.value += Number(receipt.total);
    } else {
      acc.push({ name: category, value: Number(receipt.total) });
    }
    return acc;
  }, []);

  // Colores para el gráfico
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await fetch("/api/documents");
      if (!response.ok) throw new Error("Error al obtener documentos");
      return response.json();
    },
  });

  const handleDownloadMultiple = () => {
    const selectedReceiptData = filteredReceipts?.filter(receipt => selectedReceipts.includes(receipt.id));

    if (selectedReceiptData && selectedReceiptData.length > 0) {
      import('xlsx').then(XLSX => {
        const worksheet = XLSX.utils.json_to_sheet(selectedReceiptData.map(receipt => ({
          ID: receipt.receiptId,
          Fecha: new Date(receipt.date).toLocaleDateString('es-ES'),
          Empresa: receipt.companyName || 'Sin empresa',
          Categoría: receipt.category || 'Sin categoría',
          Total: receipt.total,
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Boletas");

        XLSX.writeFile(workbook, `boletas-${new Date().toISOString().split('T')[0]}.xlsx`);
      });

      toast({
        title: "Excel generado",
        description: `Se ha generado un Excel con ${selectedReceipts.length} boletas`,
      });
      setSelectedReceipts([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center w-full justify-between md:w-auto">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Bienvenido, {user?.nombreCompleto || user?.username}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Los botones principales se han movido a la barra de accesos rápidos visible en todos los dispositivos */}

        {/* Mobile menu */}
        <div className={`${isMenuOpen ? 'flex' : 'hidden'} md:hidden flex-col w-full space-y-2`}>
          <a href="https://zeus.sii.cl/dii_cgi/carpeta_tributaria/cte_para_creditos_00.cgi" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Carpeta Tributaria SII
            </Button>
          </a>
          <Link href="/upload">
            <Button variant="ghost" className="w-full justify-start">
              <Receipt className="w-4 h-4 mr-2" />
              Subir Boleta
            </Button>
          </Link>
          {isAdmin && (
            <>
              <Link href="/companies">
                <Button variant="ghost" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Ir a Empresas
                </Button>
              </Link>
              <Link href="/tables">
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Mantenedores
                </Button>
              </Link>
            </>
          )}
          <Button variant="ghost" className="w-full justify-start" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
        
        {/* Barra de accesos rápidos visible en todos los dispositivos (escondida en móviles) */}
        <div className="w-full bg-gray-100 py-2 px-4 mt-4 hidden md:flex justify-center items-center gap-2 overflow-x-auto">
          <a href="https://zeus.sii.cl/dii_cgi/carpeta_tributaria/cte_para_creditos_00.cgi" target="_blank" rel="noopener noreferrer" className="min-w-fit">
            <Button variant="ghost" size="sm" className="h-9">
              <FileText className="w-4 h-4 mr-2" />
              Carpeta Tributaria SII
            </Button>
          </a>
          <Link href="/upload" className="min-w-fit">
            <Button variant="ghost" size="sm" className="h-9">
              <Receipt className="w-4 h-4 mr-2" />
              Subir Boleta
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/companies" className="min-w-fit">
              <Button variant="ghost" size="sm" className="h-9">
                <Plus className="w-4 h-4 mr-2" />
                Ir a Empresas
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" className="h-9 min-w-fit" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
        
        {/* Barra fija de accesos rápidos para móviles (estilo dock en la parte inferior) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden shadow-lg">
          <div className="flex justify-around items-center py-3">
            <a href="https://zeus.sii.cl/dii_cgi/carpeta_tributaria/cte_para_creditos_00.cgi" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs mt-1 font-medium">Carpeta SII</span>
            </a>
            <Link href="/upload" className="flex flex-col items-center p-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs mt-1 font-medium">Subir Boleta</span>
            </Link>
            {!isAdmin ? (
              <Button variant="ghost" className="flex flex-col items-center p-2 h-auto bg-transparent hover:bg-transparent" onClick={() => logout()}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                  <LogOut className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs mt-1 font-medium">Salir</span>
              </Button>
            ) : (
              <>
                <Link href="/companies" className="flex flex-col items-center p-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs mt-1 font-medium">Empresas</span>
                </Link>
                <Button variant="ghost" className="flex flex-col items-center p-2 h-auto bg-transparent hover:bg-transparent" onClick={() => logout()}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                    <LogOut className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs mt-1 font-medium">Salir</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos Rendidos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos Rendidos Año Anterior</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(lastYearTotalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAmount > lastYearTotalAmount 
                ? `${(((totalAmount / lastYearTotalAmount) - 1) * 100).toFixed(1)}% más que el año pasado` 
                : `${(((lastYearTotalAmount / totalAmount) - 1) * 100).toFixed(1)}% menos que el año pasado`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Boletas Subidas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receiptCount}</div>
          </CardContent>
        </Card>
        <UserMessage className="lg:col-span-1 md:col-span-2" />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Distribución de Gastos por Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[400px] flex justify-center items-center">
            <ResponsiveContainer width="100%" height={400}>
              <ChartContainer config={{}}>
                <PieChart>
                  {pieChartData && pieChartData.length > 0 ? (
                    <>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${formatCLP(value)}`}
                      >
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                    </>
                  ) : (
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                      No hay datos para mostrar
                    </text>
                  )}
                </PieChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Ultimas Boletas Rendidas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Mostrando las 5 boletas más recientes</p>
          </div>
          <Link href="/receipts">
            <Button variant="outline" size="sm" className="gap-1">
              <Eye className="w-4 h-4" />
              Ver todas
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Label>Desde:</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label>Hasta:</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-auto"
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
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedReceipts.length > 0 && selectedReceipts.length === filteredReceipts?.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedReceipts(filteredReceipts?.map(r => r.id) || []);
                            } else {
                              setSelectedReceipts([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts?.filter(receipt => receipt.userId === user?.id).slice(0, 5).map((receipt) => (
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
                        <TableCell>{receipt.category || 'Sin categoría'}</TableCell>
                        <TableCell className="text-right">{formatCLP(Number(receipt.total))}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Ver imagen">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </table>
              </div>
              {selectedReceipts.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleDownloadMultiple}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar boletas seleccionadas como Excel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Últimos Documentos Cargados</CardTitle>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDocCategory("")}
              className={!selectedDocCategory ? "bg-primary text-primary-foreground" : ""}
            >
              Todos
            </Button>
            {/* Categorías específicas para documentos */}
            {["Documentos Generales", "Impuestos Mensuales (F-29)", "Impuestos Anuales (F-22)", "Reportes Financieros", "Liquidaciones de Sueldo"].map((categoryName) => (
              <Button
                key={categoryName}
                variant="outline"
                size="sm"
                onClick={() => setSelectedDocCategory(categoryName)}
                className={selectedDocCategory === categoryName ? "bg-primary text-primary-foreground" : ""}
              >
                {categoryName}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {documents?.filter(doc => 
              doc.targetUsers.includes(user?.id) && 
              (!selectedDocCategory || doc.category === selectedDocCategory || (selectedDocCategory === "Documentos Generales" && !doc.category))
            )?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay documentos asignados
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left">Nombre</th>
                    <th className="p-4 text-left">Descripción</th>
                    <th className="p-4 text-left">Fecha</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documents?.filter(doc => 
                    doc.targetUsers.includes(user?.id) && 
                    (!selectedDocCategory || doc.category === selectedDocCategory || (selectedDocCategory === "Documentos Generales" && !doc.category))
                  )?.slice(0, 5)?.map((doc) => (
                    <tr key={doc.id} className="border-b">
                      <td className="p-4">{doc.name}</td>
                      <td className="p-4">{doc.description}</td>
                      <td className="p-4">
                        {new Date(doc.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}