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
      // No creamos URL para previsualizaciones de PDFs, solo para imágenes
      preview: file.type.includes('pdf') ? '' : URL.createObjectURL(file),
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
      // Establecer estado inicial procesando
      setReceipts(prev => prev.map(r => {
        if (r.id === receiptId) {
          return { ...r, isProcessing: true };
        }
        return r;
      }));
      
      // Verificar si el archivo es un PDF o una imagen
      if (file.type.includes('pdf')) {
        // Para PDFs, usamos nuestra API especial basada en OpenAI
        console.log('Procesando PDF con OpenAI:', file.name);
        
        // Crear FormData para enviar el PDF
        const pdfFormData = new FormData();
        pdfFormData.append('pdf', file);
        
        // Enviar a la API del servidor
        const response = await fetch('/api/receipts/pdf', {
          method: 'POST',
          body: pdfFormData,
        });
        
        if (!response.ok) {
          throw new Error(`Error al procesar PDF: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Respuesta del servidor (PDF):', result);
        
        if (result.extractedData) {
          const extractedFields = {
            date: new Date(result.extractedData.date),
            total: result.extractedData.total,
            vendor: result.extractedData.vendor,
            category: result.extractedData.category,
            taxAmount: result.extractedData.taxAmount || Math.round(result.extractedData.total * 0.19),
            description: result.extractedData.description || '',
          };
          
          setReceipts(prev => prev.map(r => {
            if (r.id === receiptId) {
              return {
                ...r,
                isProcessing: false,
                validation: {
                  isValid: true,
                  validationIssues: [],
                  confidence: { overall: 0.9, category: 0.9, amount: 0.9, date: 0.9, vendor: 0.9 }
                },
                extractedData: extractedFields,
                editedData: {...extractedFields},
                serverId: result.id,  // Guardamos el ID del servidor para futuras operaciones
              };
            }
            return r;
          }));
          
          toast({
            title: "PDF procesado correctamente",
            description: `Se procesó el PDF ${file.name} con éxito usando IA.`,
          });
          
          return;
        } else {
          throw new Error('No se pudo extraer información del PDF');
        }
      } else {
        // Para imágenes, intentamos primero con OpenAI, si falla usamos Tesseract
        let text = '';
        let imageData = undefined;
        let openAIFailed = false;
        
        try {
          // Crear FormData para enviar la imagen
          const imageFormData = new FormData();
          imageFormData.append('image', file);
          
          // Enviar a la API del servidor
          const response = await fetch('/api/receipts', {
            method: 'POST',
            body: imageFormData,
          });
          
          if (!response.ok) {
            throw new Error(`Error en la API: ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log('Respuesta del servidor (Imagen):', result);
          
          if (result.aiExtracted) {
            // Si OpenAI extrajo datos correctamente, usamos esos
            const extractedFields = {
              date: new Date(result.date),
              total: result.total,
              vendor: result.vendor,
              category: result.category || 'Otros',
              taxAmount: result.taxAmount || Math.round(result.total * 0.19),
              description: result.rawText || '',
            };
            
            setReceipts(prev => prev.map(r => {
              if (r.id === receiptId) {
                return {
                  ...r,
                  isProcessing: false,
                  validation: {
                    isValid: true,
                    validationIssues: [],
                    confidence: { overall: 0.95, category: 0.95, amount: 0.95, date: 0.95, vendor: 0.95 }
                  },
                  extractedData: extractedFields,
                  editedData: {...extractedFields},
                  serverId: result.id,
                };
              }
              return r;
            }));
            
            toast({
              title: "Imagen procesada con IA",
              description: `Se procesó la imagen ${file.name} con éxito usando IA.`,
            });
            
            return;
          } else {
            // Si OpenAI falló pero la API respondió, continuamos con Tesseract
            openAIFailed = true;
          }
        } catch (error) {
          console.error('Error al procesar con OpenAI, usando Tesseract:', error);
          openAIFailed = true;
        }
        
        if (openAIFailed) {
          // Fallback a Tesseract para imágenes
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
  
          // Procesar el texto con Tesseract como método de respaldo
          const result = await Tesseract.recognize(file, 'spa', {
            logger: m => console.log(m)
          });
          text = result.data.text;
          
          console.log('Texto extraído por Tesseract:', text);
  
          // Usar el sistema de categorización local
          const receiptData = await categorizeReceipt(text, imageData || undefined);
          console.log('Datos procesados localmente:', receiptData);
      
          const extractedFields = {
            date: receiptData.date,
            total: receiptData.total,
            vendor: receiptData.vendor,
            category: receiptData.category,
            taxAmount: receiptData.taxAmount,
            description: text.substring(0, 200) || '',
          };
          
          toast({
            title: "Imagen procesada localmente",
            description: `La IA en la nube no pudo procesar la imagen, se usó procesamiento local.`,
          });
      
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
        }
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
          return { 
            ...r, 
            isProcessing: false,
            validation: null,
            extractedData: null,
            editedData: null
          };
        }
        return r;
      }));
    }
  };

  const handleSave = async (receipt: ReceiptData) => {
    if (!receipt.editedData || !receipt.file) {
      toast({
        title: "Error",
        description: "La boleta no ha sido procesada correctamente. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
      return;
    }

    // Validar campos obligatorios

    const validationErrors: string[] = [];
    
    // Verificar empresa
    if (!receipt.editedData.companyId) {
      validationErrors.push('Empresa');
    }
    
    // Verificar categoría
    if (!receipt.editedData.category) {
      validationErrors.push('Categoría');
    }
    
    // Verificar descripción
    if (!receipt.editedData.description) {
      validationErrors.push('Descripción');
    }
    
    // Verificar fecha
    if (!receipt.editedData.date) {
      validationErrors.push('Fecha del documento');
    }
    
    // Verificar monto total
    if (!receipt.editedData.total || receipt.editedData.total <= 0) {
      validationErrors.push('Monto total');
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Campos obligatorios",
        description: `Por favor completa los siguientes campos: ${validationErrors.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

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
                        Haz clic para seleccionar múltiples boletas
                      </p>
                      <p className="text-xs text-center text-blue-500">
                        ¡Nuevo! Procesamiento mejorado con Inteligencia Artificial
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
                    <small className="mt-2 text-xs text-center text-muted-foreground">
                      Formatos permitidos: JPEG, PNG, PDF. Tamaño máximo: 5MB
                    </small>
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
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                    <FileText className="h-24 w-24 text-primary mb-2" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Documento PDF</p>
                      <p className="text-xs text-muted-foreground">{receipt.file.name}</p>
                      <p className="text-xs text-muted-foreground mt-2">No hay vista previa disponible</p>
                    </div>
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