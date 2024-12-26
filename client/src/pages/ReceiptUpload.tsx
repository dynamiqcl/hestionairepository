import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReceipts } from "@/hooks/use-receipts";
import { Loader2, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import Tesseract from 'tesseract.js';
import { categorizeReceipt } from "@/lib/categorize";

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

export default function ReceiptUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { addReceipt } = useReceipts();
  const [isProcessing, setIsProcessing] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Mostrar preview de la imagen
    setPreview(URL.createObjectURL(file));
    setIsProcessing(true);
    setValidation(null);

    try {
      toast({
        title: "Procesando",
        description: "Analizando la imagen de la boleta...",
      });

      // Procesar imagen con Tesseract OCR
      const result = await Tesseract.recognize(file, 'spa', {
        logger: m => console.log(m)
      });

      console.log('Texto extraído:', result.data.text);
      const text = result.data.text;

      // Extraer y validar datos
      const receiptData = categorizeReceipt(text);
      console.log('Datos procesados:', receiptData);

      // Actualizar estado de validación
      setValidation({
        isValid: receiptData.isValid,
        validationIssues: receiptData.validationIssues,
        confidence: receiptData.confidence
      });

      if (!receiptData.isValid) {
        toast({
          title: "Advertencia",
          description: "La boleta podría no ser válida. Por favor, verifica los datos.",
          variant: "destructive",
        });
        return;
      }

      // Crear URL para la imagen
      const imageUrl = URL.createObjectURL(file);

      const receiptToSave = {
        date: receiptData.date,
        total: receiptData.total,
        vendor: receiptData.vendor,
        category: receiptData.category,
        taxAmount: receiptData.taxAmount,
        rawText: text,
        imageUrl
      };

      console.log('Datos a enviar:', receiptToSave);

      await addReceipt(receiptToSave);

      toast({
        title: "¡Éxito!",
        description: "La boleta ha sido procesada y guardada correctamente",
      });

      setLocation("/");
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
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="receipt"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 relative overflow-hidden"
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Toca para tomar una foto o seleccionar una imagen
                        </p>
                      </div>
                    )}
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={isProcessing}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </div>

            {validation && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {validation.isValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {validation.isValid ? 'Boleta Válida' : 'Validación Pendiente'}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Confianza de detección:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Categoría: {Math.round(validation.confidence.category * 100)}%</div>
                    <div>Monto: {Math.round(validation.confidence.amount * 100)}%</div>
                    <div>Fecha: {Math.round(validation.confidence.date * 100)}%</div>
                    <div>Vendedor: {Math.round(validation.confidence.vendor * 100)}%</div>
                  </div>
                </div>

                {validation.validationIssues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-medium text-yellow-600">
                      Problemas detectados:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {validation.validationIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}