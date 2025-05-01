import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserMessage, useUserMessages } from "@/hooks/use-user-messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Trash, Plus, RefreshCw, X, Pencil } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface User {
  id: number;
  username: string;
  nombreCompleto: string;
  role: string;
}

export default function UserMessagesPage() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<UserMessage | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { 
    createMessageMutation,
    updateMessageMutation, 
    updateMessageStatusMutation, 
    deleteMessageMutation 
  } = useUserMessages();

  // Consulta para obtener todos los usuarios
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error al obtener usuarios:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  // Función para obtener todos los mensajes de usuario
  const fetchAllMessages = async () => {
    setIsRefreshing(true);
    try {
      const promises = users.map(user => 
        fetch(`/api/user-messages/${user.id}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => data ? { ...data, userName: user.username || user.nombreCompleto } : null)
      );
      
      const results = await Promise.all(promises);
      const validMessages = results.filter(Boolean) as UserMessage[];
      setMessages(validMessages);
    } catch (error) {
      console.error("Error al obtener mensajes:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Cargar mensajes cuando los usuarios están disponibles
  useEffect(() => {
    if (users.length > 0 && !isLoading) {
      fetchAllMessages();
    }
  }, [users, isLoading]);

  const handleCreateMessage = async () => {
    if (!selectedUserId || !message.trim()) return;
    
    try {
      await createMessageMutation.mutateAsync({
        userId: selectedUserId,
        message: message.trim(),
      });
      
      setShowMessageDialog(false);
      setMessage("");
      setSelectedUserId(null);
      
      // Recargar mensajes
      fetchAllMessages();
    } catch (error) {
      console.error("Error al crear mensaje:", error);
    }
  };

  const handleOpenEditDialog = (message: UserMessage) => {
    setEditingMessage(message);
    setMessage(message.message);
    setShowEditDialog(true);
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !message.trim()) return;
    
    try {
      await updateMessageMutation.mutateAsync({
        id: editingMessage.id,
        userId: editingMessage.userId,
        message: message.trim(),
      });
      
      setShowEditDialog(false);
      setMessage("");
      setEditingMessage(null);
      
      // Recargar mensajes
      fetchAllMessages();
    } catch (error) {
      console.error("Error al actualizar mensaje:", error);
    }
  };

  const handleToggleMessageStatus = async (message: UserMessage) => {
    try {
      await updateMessageStatusMutation.mutateAsync({
        id: message.id,
        userId: message.userId,
        isActive: !message.isActive,
      });
      
      // Recargar mensajes
      fetchAllMessages();
    } catch (error) {
      console.error("Error al actualizar estado del mensaje:", error);
    }
  };

  const handleDeleteMessage = async (message: UserMessage) => {
    try {
      await deleteMessageMutation.mutateAsync({
        id: message.id,
        userId: message.userId,
      });
      
      // Recargar mensajes
      fetchAllMessages();
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mensajes Personalizados</h1>
          <p className="text-muted-foreground">
            Administra los mensajes personalizados para cada usuario
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchAllMessages()}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Actualizar
          </Button>
          <Button onClick={() => setShowMessageDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Mensaje
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mensajes Activos</CardTitle>
          <CardDescription>
            Mensajes personalizados que se muestran a los usuarios en su dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-medium">
                      {message.userName || `Usuario ${message.userId}`}
                    </TableCell>
                    <TableCell>{message.message}</TableCell>
                    <TableCell>
                      {new Date(message.createdAt).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Switch
                          checked={message.isActive}
                          onCheckedChange={() => handleToggleMessageStatus(message)}
                          className="mr-2"
                        />
                        <Badge variant={message.isActive ? "outline" : "secondary"}>
                          {message.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(message)}
                          title="Editar mensaje"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMessage(message)}
                          title="Eliminar mensaje"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No hay mensajes disponibles</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowMessageDialog(true)}
              >
                Crear un mensaje
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para crear nuevo mensaje */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Mensaje Personalizado</DialogTitle>
            <DialogDescription>
              Crea un mensaje personalizado para un usuario específico
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Usuario</Label>
              <Select
                onValueChange={(value) => setSelectedUserId(Number(value))}
                value={selectedUserId?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.nombreCompleto || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Escribe un mensaje personalizado..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMessageDialog(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateMessage}
              disabled={!selectedUserId || !message.trim() || createMessageMutation.isPending}
            >
              {createMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-1" />
              )}
              Enviar Mensaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar mensaje */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Mensaje</DialogTitle>
            <DialogDescription>
              Modifica el contenido del mensaje para {editingMessage?.userName || `Usuario ${editingMessage?.userId}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-message">Mensaje</Label>
              <Textarea
                id="edit-message"
                placeholder="Edita el mensaje personalizado..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingMessage(null);
                setMessage("");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateMessage}
              disabled={!message.trim() || updateMessageMutation.isPending}
            >
              {updateMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Pencil className="h-4 w-4 mr-1" />
              )}
              Actualizar Mensaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}