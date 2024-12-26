import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReceipts } from "@/hooks/use-receipts";
import { Loader2, Upload, Camera } from "lucide-react";
import Tesseract from 'tesseract.js';
import { categorizeReceipt } from "@/lib/categorize";

export default function ReceiptUpload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { addReceipt } = useReceipts();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      // Process image with Tesseract OCR
      const result = await Tesseract.recognize(file, 'spa');
      const text = result.data.text;

      // Extract receipt data using AI categorization
      const receiptData = categorizeReceipt(text);

      await addReceipt({
        date: receiptData.date,
        total: receiptData.total.toString(),
        vendor: receiptData.vendor,
        category: receiptData.category,
        taxAmount: receiptData.taxAmount.toString(),
        rawText: text,
        imageUrl: URL.createObjectURL(file)
      });

      toast({
        title: "¡Éxito!",
        description: "La boleta ha sido procesada y guardada correctamente",
      });

      setLocation("/");
    } catch (error) {
      console.error('Error al procesar la boleta:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la boleta. Por favor, intente nuevamente.",
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
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Toca para tomar una foto o seleccionar una imagen
                      </p>
                    </div>
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
              <Button disabled={isProcessing}>
                <Upload className="w-4 h-4 mr-2" />
                Subir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}