import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, ArrowLeft, FileText, Download } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: number;
  name: string;
  description: string;
  fileUrl: string;
  uploadedBy: number;
  targetUsers: number[];
  isActive: boolean;
  createdAt: string;
}

export default function DocumentManager() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // Fetch documents
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await fetch("/api/documents");
      if (!response.ok) throw new Error("Error al obtener documentos");
      return response.json();
    },
  });

  // Fetch users for admin to select targets
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Error al obtener usuarios");
      return response.json();
    },
    enabled: user?.role === "ADMINISTRADOR",
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Error al subir documento");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Documento subido correctamente",
      });
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    uploadMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Gestión de Documentos</h1>
        </div>
        {user?.role === "ADMINISTRADOR" && !isUploading && (
          <Button onClick={() => setIsUploading(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Documento
          </Button>
        )}
      </div>

      {isUploading && user?.role === "ADMINISTRADOR" && (
        <Card>
          <CardHeader>
            <CardTitle>Subir Nuevo Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Documento</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="ej: Contrato 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Descripción del documento..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Archivo PDF</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".pdf"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploading(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Subir Documento</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === "ADMINISTRADOR"
              ? "Documentos Disponibles"
              : "Mis Documentos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay documentos disponibles
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.name}</TableCell>
                    <TableCell>{doc.description}</TableCell>
                    <TableCell>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {user?.role === "ADMINISTRADOR" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Eliminar documento?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará
                                  permanentemente el documento "{doc.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    // Implementar eliminación
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
