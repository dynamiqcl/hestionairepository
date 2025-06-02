import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Company {
  id: number;
  name: string;
  rut: string;
}

interface Category {
  id: number;
  name: string;
}

interface ReceiptForm {
  file: File | null;
  date: string;
  total: string;
  vendor: string;
  category: string;
  description: string;
  companyId: string;
  taxAmount: string;
}

export default function ReceiptUploadNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState<ReceiptForm>({
    file: null,
    date: new Date().toISOString().split('T')[0],
    total: '',
    vendor: '',
    category: '',
    description: '',
    companyId: '',
    taxAmount: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Obtener empresas
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const res = await fetch('/api/companies', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar empresas');
      return res.json();
    }
  });

  // Obtener categorías
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar categorías');
      return res.json();
    }
  });

  // Mutación para procesar imagen y extraer datos
  const processImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch('/api/receipts/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Error al procesar la imagen');
      return res.json();
    },
    onSuccess: (data) => {
      // Actualizar el formulario con los datos extraídos
      setForm(prev => ({
        ...prev,
        vendor: data.vendor || prev.vendor,
        total: data.total ? data.total.toString() : prev.total,
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : prev.date,
        category: data.category || prev.category,
        taxAmount: data.taxAmount ? data.taxAmount.toString() : prev.taxAmount
      }));
      
      toast({
        title: "Imagen procesada",
        description: "Los datos han sido extraídos automáticamente. Revísalos antes de guardar."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo procesar la imagen: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Mutación para guardar boleta
  const saveReceiptMutation = useMutation({
    mutationFn: async (receiptData: ReceiptForm) => {
      const formData = new FormData();
      
      if (receiptData.file) {
        formData.append('image', receiptData.file);
      }
      
      formData.append('date', receiptData.date);
      formData.append('total', receiptData.total);
      formData.append('vendor', receiptData.vendor);
      formData.append('category', receiptData.category);
      formData.append('description', receiptData.description);
      formData.append('companyId', receiptData.companyId);
      formData.append('taxAmount', receiptData.taxAmount);
      
      const res = await fetch('/api/receipts/create', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Éxito!",
        description: "La boleta ha sido guardada correctamente"
      });
      
      // Limpiar formulario
      setForm({
        file: null,
        date: new Date().toISOString().split('T')[0],
        total: '',
        vendor: '',
        category: '',
        description: '',
        companyId: '',
        taxAmount: ''
      });
      setPreview(null);
      
      // Invalidar caché
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo guardar la boleta: " + error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten imágenes y archivos PDF",
        variant: "destructive"
      });
      return;
    }

    setForm(prev => ({ ...prev, file }));

    // Crear preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleProcessImage = () => {
    if (!form.file) {
      toast({
        title: "Error",
        description: "Primero selecciona un archivo",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    processImageMutation.mutate(form.file, {
      onSettled: () => setIsProcessing(false)
    });
  };

  const handleSave = () => {
    // Validaciones
    const errors: string[] = [];
    
    if (!form.companyId) errors.push('Empresa');
    if (!form.category) errors.push('Categoría');
    if (!form.description) errors.push('Descripción');
    if (!form.date) errors.push('Fecha');
    if (!form.total || parseFloat(form.total) <= 0) errors.push('Monto total válido');

    if (errors.length > 0) {
      toast({
        title: "Campos obligatorios",
        description: `Completa: ${errors.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    saveReceiptMutation.mutate(form);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Subir Nueva Boleta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload de archivo */}
          <div className="space-y-2">
            <Label htmlFor="file">Archivo de la boleta</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button 
                onClick={handleProcessImage}
                disabled={!form.file || isProcessing}
                variant="outline"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Procesar
              </Button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <img 
                src={preview} 
                alt="Preview" 
                className="max-w-md h-auto rounded border"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Empresa */}
            <div className="space-y-2">
              <Label htmlFor="company">Empresa *</Label>
              <Select value={form.companyId} onValueChange={(value) => setForm(prev => ({ ...prev, companyId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name} - {company.rut}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={form.category} onValueChange={(value) => setForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Proveedor */}
            <div className="space-y-2">
              <Label htmlFor="vendor">Proveedor</Label>
              <Input
                id="vendor"
                value={form.vendor}
                onChange={(e) => setForm(prev => ({ ...prev, vendor: e.target.value }))}
                placeholder="Nombre del proveedor"
              />
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label htmlFor="date">Fecha del documento *</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Monto total */}
            <div className="space-y-2">
              <Label htmlFor="total">Monto total (CLP) *</Label>
              <Input
                id="total"
                type="number"
                value={form.total}
                onChange={(e) => setForm(prev => ({ ...prev, total: e.target.value }))}
                placeholder="0"
                min="0"
                step="1"
              />
            </div>

            {/* IVA */}
            <div className="space-y-2">
              <Label htmlFor="taxAmount">IVA (CLP)</Label>
              <Input
                id="taxAmount"
                type="number"
                value={form.taxAmount}
                onChange={(e) => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                placeholder="Calculado automáticamente"
                min="0"
                step="1"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción detallada del gasto"
              rows={3}
            />
          </div>

          {/* Botón guardar */}
          <Button 
            onClick={handleSave}
            disabled={saveReceiptMutation.isPending}
            className="w-full"
            size="lg"
          >
            {saveReceiptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar Boleta'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}