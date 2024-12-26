import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReceipts } from "@/hooks/use-receipts";
import { Loader2, Camera, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import Tesseract from 'tesseract.js';
import { categorizeReceipt } from "@/lib/categorize";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { isMobile, hasCamera } = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara",
        variant: "destructive",
      });
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], "captura.jpg", { type: "image/jpeg" });
      await processImage(file);

      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCapturing(false);
    }, 'image/jpeg', 0.95);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImage(file);
  };

  const processImage = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setIsProcessing(true);
    setValidation(null);

    try {
      toast({
        title: "Procesando",
        description: "Analizando la imagen de la boleta...",
      });

      const result = await Tesseract.recognize(file, 'spa', {
        logger: m => console.log(m)
      });

      console.log('Texto extraído:', result.data.text);
      const text = result.data.text;

      const receiptData = categorizeReceipt(text);
      console.log('Datos procesados:', receiptData);

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
                {isCapturing ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg aspect-[3/4] object-cover"
                    />
                    <Button
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                      onClick={captureImage}
                      disabled={isProcessing}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capturar
                    </Button>
                  </div>
                ) : (
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
                          {isMobile && hasCamera ? (
                            <>
                              <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="text-sm text-center text-muted-foreground px-4">
                                Toca para tomar una foto o seleccionar una imagen de tu galería
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                              <p className="text-sm text-center text-muted-foreground px-4">
                                Arrastra y suelta una imagen o haz clic para seleccionar
                              </p>
                            </>
                          )}
                        </div>
                      )}
                      <Input
                        ref={fileInputRef}
                        id="receipt"
                        type="file"
                        accept="image/*"
                        capture={isMobile && hasCamera ? "environment" : undefined}
                        className="hidden"
                        disabled={isProcessing}
                        onChange={handleFileUpload}
                      />
                    </label>

                    {isMobile && hasCamera && (
                      <Button
                        className="mt-4 w-full"
                        onClick={startCamera}
                        disabled={isProcessing}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Usar Cámara
                      </Button>
                    )}
                  </div>
                )}
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