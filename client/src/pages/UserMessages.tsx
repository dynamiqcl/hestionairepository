import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useUserMessages, UserMessage } from "@/hooks/use-user-messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Check, X, Clock, Edit, Trash2, User, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function UserMessagesPage() {
  const { isAdmin, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  
  const { 
    createMessageMutation, 
    updateMessageStatusMutation, 
    deleteMessageMutation 
  } = useUserMessages();
  
  // Obtener la lista de usuarios
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }
      return response.json();
    },
    enabled: isAdmin // Solo cargar si es administrador
  });
  
  // Obtener los mensajes de todos los usuarios
  const { data: allMessages, isLoading: loadingMessages } = useQuery<UserMessage[]>({
    queryKey: ['/api/user-messages/all'],
    queryFn: async () => {
      // Obtenemos todos los mensajes consultando para cada usuario
      if (!users) return [];
      
      const messagesPromises = users.map(async (user: any) => {
        try {
          const response = await fetch(`/api/user-messages/${user.id}`);
          if (!response.ok) return null;
          const data = await response.json();
          return data ? { ...data, userName: user.nombreCompleto || user.username } : null;
        } catch (error) {
          return null;
        }
      });
      
      const results = await Promise.all(messagesPromises);
      return results.filter(Boolean) as UserMessage[];
    },
    enabled: !!users && isAdmin // Solo cargar cuando tengamos usuarios y sea admin
  });
  
  // Redireccionar a la página principal si no es administrador
  if (!isAdmin) {
    toast({
      title: "Acceso denegado",
      description: "No tienes permisos para acceder a esta página",
      variant: "destructive",
    });
    navigate("/");
    return null;
  }
  
  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const handleCreateMessage = () => {
    if (!selectedUser || !messageText.trim()) {
      toast({
        title: "Error",
        description: "Debes seleccionar un usuario y escribir un mensaje",
        variant: "destructive",
      });
      return;
    }
    
    createMessageMutation.mutate({
      userId: selectedUser,
      message: messageText
    }, {
      onSuccess: () => {
        setMessageText("");
        setSelectedUser(null);
      }
    });
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mensajes Personalizados</h1>
          <p className="text-muted-foreground">
            Administración de mensajes para usuarios
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="mt-4 md:mt-0">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Mensaje
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Mensaje</DialogTitle>
              <DialogDescription>
                Crea un mensaje personalizado para un usuario específico. Este mensaje aparecerá en su panel de control.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user">Usuario</Label>
                <select
                  id="user"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedUser || ""}
                  onChange={(e) => setSelectedUser(parseInt(e.target.value))}
                >
                  <option value="">Seleccionar usuario</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.nombreCompleto || user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  rows={5}
                  placeholder="Escribe el mensaje aquí..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreateMessage} disabled={createMessageMutation.isPending}>
                {createMessageMutation.isPending ? "Guardando..." : "Guardar Mensaje"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loadingMessages ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted rounded-md w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded-md w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-24 bg-muted rounded-md"></div>
                <div className="flex justify-between mt-4">
                  <div className="h-8 bg-muted rounded-md w-16"></div>
                  <div className="h-8 bg-muted rounded-md w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : allMessages?.length === 0 ? (
          <div className="col-span-full text-center p-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No hay mensajes</h3>
            <p className="text-muted-foreground">
              No se han creado mensajes personalizados para los usuarios.
            </p>
          </div>
        ) : (
          allMessages?.map((message) => (
            <Card key={message.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {message.userName || "Usuario"}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  {message.isActive ? (
                    <>
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Activo</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 text-red-500" />
                      <span>Inactivo</span>
                    </>
                  )}
                  <span className="mx-1">•</span>
                  <Clock className="h-3 w-3" />
                  <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm border rounded-md p-3 bg-muted/50 whitespace-pre-wrap">
                  {message.message}
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`active-${message.id}`}
                      checked={message.isActive}
                      onCheckedChange={(checked) => {
                        updateMessageStatusMutation.mutate({
                          id: message.id,
                          isActive: checked,
                          userId: message.userId
                        });
                      }}
                    />
                    <Label htmlFor={`active-${message.id}`}>
                      {message.isActive ? "Activo" : "Inactivo"}
                    </Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Mensaje</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Usuario</Label>
                            <Input value={message.userName || "Usuario"} disabled />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`edit-message-${message.id}`}>Mensaje</Label>
                            <Textarea
                              id={`edit-message-${message.id}`}
                              rows={5}
                              defaultValue={message.message}
                              onChange={(e) => setMessageText(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                          <Button onClick={() => {
                            createMessageMutation.mutate({
                              userId: message.userId,
                              message: messageText || message.message
                            });
                          }}>
                            Actualizar Mensaje
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500"
                      onClick={() => {
                        if (confirm("¿Estás seguro de eliminar este mensaje?")) {
                          deleteMessageMutation.mutate({
                            id: message.id,
                            userId: message.userId
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}