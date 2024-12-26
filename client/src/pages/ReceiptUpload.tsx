import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReceipts } from "@/hooks/use-receipts";
import { Loader2, Upload } from "lucide-react";
import { createWorker } from 'tesseract.js';
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
      const worker = await createWorker();
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Extract receipt data using AI categorization
      const receiptData = categorizeReceipt(text);

      // Convert numeric values to strings for the API
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
        title: "Success",
        description: "Receipt processed and saved successfully",
      });

      setLocation("/");
    } catch (error) {
      console.error('Error processing receipt:', error);
      toast({
        title: "Error",
        description: "Failed to process receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Upload Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="receipt">Receipt Image</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                disabled={isProcessing}
                onChange={handleFileUpload}
              />
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Processing receipt...</span>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button disabled={isProcessing}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}