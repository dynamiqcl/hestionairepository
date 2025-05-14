import React, { useState } from 'react';
import { useReceipts, ReceiptWithDetails } from '@/hooks/use-receipts';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription 
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Download, 
  Eye, 
  FileText, 
  MoreVertical, 
  Search, 
  Trash2, 
  Filter, 
  ChevronDown
} from 'lucide-react';

// Función para formatear montos en CLP
const formatCLP = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function ReceiptsManager() {
  const { data: receipts, isLoading, deleteReceipt } = useReceipts();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedReceipts, setSelectedReceipts] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    company: '',
    category: '',
    minAmount: '',
    maxAmount: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
  });

  // Filtrar recibos por usuario actual
  const userReceipts = receipts?.filter(receipt => receipt.userId === user?.id) || [];

  // Aplicar filtros
  const filteredReceipts = userReceipts.filter(receipt => {
    const receiptDate = new Date(receipt.date);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    const isWithinDateRange =
      (!startDate || receiptDate >= startDate) &&
      (!endDate || receiptDate <= endDate);
    
    const matchesSearch = searchTerm === '' || 
      receipt.receiptId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.vendor?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (receipt.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (receipt.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesCompany = filters.company === '' || 
      (receipt.companyName?.toLowerCase() || '').includes(filters.company.toLowerCase());
    
    const matchesCategory = filters.category === '' || 
      (receipt.category?.toLowerCase() || '').includes(filters.category.toLowerCase());
    
    const amount = Number(receipt.total);
    const matchesMinAmount = filters.minAmount === '' || amount >= Number(filters.minAmount);
    const matchesMaxAmount = filters.maxAmount === '' || amount <= Number(filters.maxAmount);
    
    return isWithinDateRange && matchesSearch && matchesCompany && 
           matchesCategory && matchesMinAmount && matchesMaxAmount;
  });

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      company: '',
      category: '',
      minAmount: '',
      maxAmount: ''
    });
    setSearchTerm('');
  };

  const handleDeleteReceipt = async (id: number) => {
    try {
      await deleteReceipt(id);
      toast({
        title: "Boleta eliminada",
        description: "La boleta se ha eliminado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la boleta. Inténtelo nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadMultiple = () => {
    if (selectedReceipts.length === 0) {
      toast({
        title: "Seleccione boletas",
        description: "Debe seleccionar al menos una boleta para descargar.",
        variant: "destructive",
      });
      return;
    }

    import('xlsx').then(XLSX => {
      const selectedReceiptsData = filteredReceipts.filter(receipt => selectedReceipts.includes(receipt.id));
      
      // Preparar datos para Excel
      const worksheetData = selectedReceiptsData.map(receipt => ({
        ID: receipt.receiptId,
        Fecha: new Date(receipt.date).toLocaleDateString('es-ES'),
        Empresa: receipt.companyName || 'Sin empresa',
        Proveedor: receipt.vendor || 'Sin proveedor',
        Categoría: receipt.category || 'Sin categoría',
        Monto: Number(receipt.total),
        'Monto formateado': formatCLP(Number(receipt.total)),
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Boletas");
      
      // Generar el archivo y descargarlo
      XLSX.writeFile(workbook, "boletas_seleccionadas.xlsx");
      
      toast({
        title: "Descarga exitosa",
        description: `Se han exportado ${selectedReceiptsData.length} boletas a Excel.`,
        variant: "default",
      });
    }).catch(error => {
      console.error('Error al descargar boletas:', error);
      toast({
        title: "Error",
        description: "No se pudieron descargar las boletas. Inténtelo nuevamente.",
        variant: "destructive",
      });
    });
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
        <h1 className="text-2xl md:text-4xl font-bold">Gestión de Boletas</h1>
        
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar boletas..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filtros
            <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
          
          {selectedReceipts.length > 0 && (
            <Button
              onClick={handleDownloadMultiple}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar ({selectedReceipts.length})
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Filtros avanzados</CardTitle>
              <Button variant="ghost" onClick={resetFilters} className="text-sm">Limpiar filtros</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rango de fechas</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="date"
                    placeholder="Desde"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                  <Input
                    type="date"
                    placeholder="Hasta"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={filters.category} 
                  onValueChange={(value) => setFilters({...filters, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
                    {(Array.isArray(categories) ? categories : []).map((category: any) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select 
                  value={filters.company} 
                  onValueChange={(value) => setFilters({...filters, company: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las empresas</SelectItem>
                    {(Array.isArray(companies) ? companies : []).map((company: any) => (
                      <SelectItem key={company.id} value={company.name}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rango de montos</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="number"
                    placeholder="Monto mínimo"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Monto máximo"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {filteredReceipts.length} {filteredReceipts.length === 1 ? 'boleta' : 'boletas'} encontradas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                  <TableHead>Categoría</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron boletas
                      {searchTerm !== '' || Object.values(filters).some(value => value !== '') ? (
                        <div className="mt-2">
                          <Button variant="outline" size="sm" onClick={resetFilters}>
                            Limpiar filtros
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((receipt) => (
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
                      <TableCell>{receipt.vendor || 'Sin proveedor'}</TableCell>
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
                                <DialogDescription>
                                  {receipt.description || 'Sin descripción'}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="relative w-full aspect-[3/4]">
                                <img
                                  src={receipt.imageUrl || ''}
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
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                  <p className="text-sm font-medium">Fecha:</p>
                                  <p className="text-sm">{new Date(receipt.date).toLocaleDateString('es-ES')}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Proveedor:</p>
                                  <p className="text-sm">{receipt.vendor || 'Sin proveedor'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Categoría:</p>
                                  <p className="text-sm">{receipt.category || 'Sin categoría'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Monto:</p>
                                  <p className="text-sm">{formatCLP(Number(receipt.total))}</p>
                                </div>
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
                                  Esta acción no se puede deshacer. Se eliminará permanentemente la boleta {receipt.receiptId}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteReceipt(receipt.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => navigator.clipboard.writeText(receipt.receiptId)}
                                className="cursor-pointer"
                              >
                                Copiar ID
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => window.open(receipt.imageUrl || '', '_blank')}
                                className="cursor-pointer"
                              >
                                Abrir imagen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}