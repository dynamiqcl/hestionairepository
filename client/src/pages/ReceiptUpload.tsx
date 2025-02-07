import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReceipts } from "@/hooks/use-receipts";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";

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

function useCategories() {
  return useQuery<{ id: number, name: string }[]>({
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData & { companyId?: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { data: companies } = useCompanies();
  const { data } = useCategories();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  const processImage = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setIsProcessing(true);
    setValidation(null);
    setExtractedData(null);
    setEditedData(null);
    setIsEditing(false);

    try {
      toast({
        title: "Procesando",
        description: "Analizando la imagen de la boleta...",
      });

      // Crear ImageData para el preprocesamiento
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No se pudo crear el contexto 2D");

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Procesar el texto con Tesseract
      const result = await Tesseract.recognize(file, 'spa', {
        logger: m => console.log(m)
      });

      console.log('Texto extraído:', result.data.text);
      const text = result.data.text;

      // Usar el sistema de categorización con imagen y texto
      const receiptData = await categorizeReceipt(text, imageData);
      console.log('Datos procesados:', receiptData);

      setValidation({
        isValid: receiptData.isValid,
        validationIssues: receiptData.validationIssues,
        confidence: receiptData.confidence
      });

      const extractedFields = {
        date: receiptData.date,
        total: receiptData.total,
        vendor: receiptData.vendor,
        category: receiptData.category,
        taxAmount: receiptData.taxAmount,
      };

      setExtractedData(extractedFields);
      setEditedData({...extractedFields});
      setIsEditing(true);

      if (!receiptData.isValid) {
        toast({
          title: "Advertencia",
          description: "Los datos extraídos podrían no ser precisos. Por favor, verifícalos antes de guardar.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error al procesar la boleta:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar la boleta. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!editedData || !preview) return;

    try {
      const receiptToSave = {
        ...editedData,
        date: editedData.date instanceof Date ? editedData.date.toISOString() : new Date(editedData.date).toISOString(),
        rawText: extractedData?.vendor || "",
        imageUrl: preview
      };

      console.log('Datos a enviar:', receiptToSave);

      await addReceipt(receiptToSave);

      toast({
        title: "¡Éxito!",
        description: "La boleta ha sido procesada y guardada correctamente",
      });

      setLocation("/");
    } catch (error) {
      console.error('Error al guardar la boleta:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar la boleta. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Subir Boleta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="receipt">Imagen de la Boleta</Label>
              <div className="mt-2">
                <div className="flex flex-col items-center justify-center w-full">
                  <label
                    htmlFor="receipt"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 relative overflow-hidden"
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-center text-muted-foreground px-4">
                          Arrastra y suelta una imagen o haz clic para seleccionar
                        </p>
                      </div>
                    )}
                    <Input
                      ref={fileInputRef}
                      id="receipt"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isProcessing}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </div>

            {isEditing && editedData && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                <h3 className="font-medium">Editar Datos Extraídos</h3>

                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Select
                    value={editedData.companyId?.toString()}
                    onValueChange={(value) => setEditedData({
                      ...editedData,
                      companyId: parseInt(value, 10)
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">
                    Fecha
                    {validation && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Confianza: {Math.round(validation.confidence.date * 100)}%)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={format(editedData.date, 'yyyy-MM-dd')}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      date: new Date(e.target.value)
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total">
                    Monto Total (CLP)
                    {validation && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Confianza: {Math.round(validation.confidence.amount * 100)}%)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="total"
                    type="number"
                    value={editedData.total}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      total: parseInt(e.target.value, 10),
                      taxAmount: Math.round(parseInt(e.target.value, 10) * 0.19)
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">
                    Proveedor
                    {validation && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Confianza: {Math.round(validation.confidence.vendor * 100)}%)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="vendor"
                    value={editedData.vendor}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      vendor: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Categoría
                    {validation && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Confianza: {Math.round(validation.confidence.category * 100)}%)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={editedData.category}
                    onValueChange={(value) => setEditedData({
                      ...editedData,
                      category: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxAmount">IVA Estimado (19%)</Label>
                  <Input
                    id="taxAmount"
                    type="number"
                    value={editedData.taxAmount}
                    disabled
                  />
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Procesando boleta...</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              {isEditing && (
                <Button
                  onClick={handleSave}
                  disabled={isProcessing || !editedData}
                >
                  Guardar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}