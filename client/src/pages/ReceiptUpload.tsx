import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReceipts } from "@/hooks/use-receipts";
import { Loader2, Upload, CheckCircle2, X, FileText } from "lucide-react";
import Tesseract from 'tesseract.js';
import { categorizeReceipt } from "@/lib/categorize";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ValidationResult {
  isValid: boolean;
  validationIssues: string[];
  confidence: {
    overall: number;
    category: number;
    amount: number;
    date: number;
    vendor: number;
  };
}

interface ExtractedData {
  date: Date;
  total: number;
  vendor: string;
  category: string;
  taxAmount: number;
}

interface ReceiptData {
  id: string;
  file: File;
  preview: string;
  isProcessing: boolean;
  validation: ValidationResult | null;
  extractedData: ExtractedData | null;
  editedData: (ExtractedData & { companyId?: number; description?: string }) | null;
}

function useCategories() {
  return useQuery<{ id: number, name: string, description: string }[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Error al obtener categorías');
      return response.json();
    }
  });
}

function useCompanies() {
  return useQuery<{ id: number, name: string }[]>({
    queryKey: ['/api/companies'],
    queryFn: async () => {
      const response = await fetch('/api/companies');
      if (!response.ok) throw new Error('Error al obtener empresas');
      return response.json();
    }
  });
}

export default function ReceiptUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { addReceipt } = useReceipts();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: companies } = useCompanies();
  const { data: categories } = useCategories();
  const queryClient = useQueryClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newReceipts: ReceiptData[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      isProcessing: true,
      validation: null,
      extractedData: null,
      editedData: null
    }));

    setReceipts(prev => [...prev, ...newReceipts]);

    // Procesar todas las boletas en paralelo
    await Promise.all(newReceipts.map(receipt => processImage(receipt.id, receipt.file)));
  };

  const processImage = async (receiptId: string, file: File) => {
    try {
      let text = '';
      let imageData = undefined;
      
      // Verificar si el archivo es un PDF o una imagen
      if (file.type.includes('pdf')) {
        // Para los PDF, vamos a usar Tesseract directamente sin preprocesamiento de imagen
        const result = await Tesseract.recognize(file, 'spa', {
          logger: m => console.log(m)
        });
        text = result.data.text;
      } else {
        // Para imágenes, seguimos con el proceso actual
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => (img.onload = resolve));

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("No se pudo crear el contexto 2D");

        ctx.drawImage(img, 0, 0);
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Procesar el texto con Tesseract
        const result = await Tesseract.recognize(file, 'spa', {
          logger: m => console.log(m)
        });
        text = result.data.text;
      }

      console.log('Texto extraído:', text);

      // Usar el sistema de categorización
      // Asegurarnos de que imageData sea undefined si no está presente
      const receiptData = await categorizeReceipt(text, imageData || undefined);
      console.log('Datos procesados:', receiptData);

      const extractedFields = {
        date: receiptData.date,
        total: receiptData.total,
        vendor: receiptData.vendor,
        category: receiptData.category,
        taxAmount: receiptData.taxAmount,
      };

      setReceipts(prev => prev.map(r => {
        if (r.id === receiptId) {
          return {
            ...r,
            isProcessing: false,
            validation: {
              isValid: receiptData.isValid,
              validationIssues: receiptData.validationIssues,
              confidence: receiptData.confidence
            },
            extractedData: extractedFields,
            editedData: {...extractedFields}
          };
        }
        return r;
      }));

      if (!receiptData.isValid) {
        toast({
          title: "Advertencia",
          description: `Los datos extraídos de la boleta ${file.name} podrían no ser precisos. Por favor, verifícalos.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error al procesar la boleta:', error);
      toast({
        title: "Error",
        description: `Error al procesar la boleta ${file.name}. ${error instanceof Error ? error.message : "Por favor, intente nuevamente."}`,
        variant: "destructive",
      });

      setReceipts(prev => prev.map(r => {
        if (r.id === receiptId) {
          return { ...r, isProcessing: false };
        }
        return r;
      }));
    }
  };

  const handleSave = async (receipt: ReceiptData) => {
    if (!receipt.editedData || !receipt.file) return;

    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('image', receipt.file);

      // Agregar los demás datos del recibo
      Object.entries(receipt.editedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (value instanceof Date) {
            formData.append(key, value.toISOString());
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      if (receipt.extractedData?.vendor) {
        formData.append('rawText', receipt.extractedData.vendor);
      }

      // Enviar la solicitud al servidor
      const response = await fetch('/api/receipts', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      // Invalidar la caché para que se actualice la lista de boletas
      // Aquí NO llamamos a addReceipt porque la boleta ya ha sido guardada por el servidor
      // y eso causaría una duplicación
      queryClient.invalidateQueries({ queryKey: ['/api/receipts'] });

      toast({
        title: "¡Éxito!",
        description: "La boleta ha sido procesada y guardada correctamente",
      });

      // Eliminar la boleta procesada de la lista
      setReceipts(prev => prev.filter(r => r.id !== receipt.id));
    } catch (error) {
      console.error('Error al guardar la boleta:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la boleta. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveReceipt = (receiptId: string) => {
    setReceipts(prev => prev.filter(r => r.id !== receiptId));
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subir Boletas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="receipt">Imágenes y PDFs de Boletas</Label>
              <div className="mt-2">
                <div className="flex flex-col items-center justify-center w-full">
                  <label
                    htmlFor="receipt"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-center text-muted-foreground px-4">
                        Arrastra y suelta imágenes o PDFs, o haz clic para seleccionar múltiples boletas
                      </p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      id="receipt"
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {receipts.map((receipt) => (
        <Card key={receipt.id} className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                {receipt.file.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveReceipt(receipt.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="w-full h-48 border rounded-lg overflow-hidden">
                {receipt.file.type.includes('pdf') ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileText className="h-12 w-12 text-muted-foreground mr-2" />
                    <p className="text-sm text-muted-foreground">{receipt.file.name}</p>
                  </div>
                ) : (
                  <img
                    src={receipt.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {receipt.isProcessing ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Procesando boleta...</span>
                </div>
              ) : receipt.editedData ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`company-${receipt.id}`}>Empresa</Label>
                    <Select
                      value={receipt.editedData.companyId?.toString()}
                      onValueChange={(value) => setReceipts(prev => prev.map(r => {
                        if (r.id === receipt.id && r.editedData) {
                          return {
                            ...r,
                            editedData: {
                              ...r.editedData,
                              companyId: parseInt(value, 10)
                            }
                          };
                        }
                        return r;
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies?.map((company: any) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`category-${receipt.id}`}>Categoría</Label>
                    <Select
                      value={receipt.editedData.category}
                      onValueChange={(value) => setReceipts(prev => prev.map(r => {
                        if (r.id === receipt.id && r.editedData) {
                          return {
                            ...r,
                            editedData: {
                              ...r.editedData,
                              category: value
                            }
                          };
                        }
                        return r;
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name} - {category.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`description-${receipt.id}`}>Descripción</Label>
                    <Input
                      id={`description-${receipt.id}`}
                      value={receipt.editedData.description || ''}
                      onChange={(e) => setReceipts(prev => prev.map(r => {
                        if (r.id === receipt.id && r.editedData) {
                          return {
                            ...r,
                            editedData: {
                              ...r.editedData,
                              description: e.target.value
                            }
                          };
                        }
                        return r;
                      }))}
                      placeholder="Ingrese una descripción"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`date-${receipt.id}`}>Fecha del documento</Label>
                    <Input
                      id={`date-${receipt.id}`}
                      type="date"
                      value={format(receipt.editedData.date, 'yyyy-MM-dd')}
                      onChange={(e) => setReceipts(prev => prev.map(r => {
                        if (r.id === receipt.id && r.editedData) {
                          return {
                            ...r,
                            editedData: {
                              ...r.editedData,
                              date: new Date(e.target.value)
                            }
                          };
                        }
                        return r;
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`total-${receipt.id}`}>Monto Total</Label>
                    <Input
                      id={`total-${receipt.id}`}
                      type="number"
                      value={receipt.editedData.total}
                      onChange={(e) => setReceipts(prev => prev.map(r => {
                        if (r.id === receipt.id && r.editedData) {
                          const value = parseFloat(e.target.value);
                          return {
                            ...r,
                            editedData: {
                              ...r.editedData,
                              total: value,
                              taxAmount: value * 0.19
                            }
                          };
                        }
                        return r;
                      }))}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSave(receipt)}
                      className="w-full md:w-auto"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Guardar Boleta
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Error al procesar la boleta. Por favor, inténtalo de nuevo.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end space-x-2 mt-4">
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}