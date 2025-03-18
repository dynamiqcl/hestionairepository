import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({
        username: formData.username,
        password: formData.password,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error de autenticación",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Login form */}
      <div className="hidden lg:flex w-1/2 bg-primary items-center justify-center p-8">
        <div className="max-w-lg text-white">
          <h1 className="text-4xl font-bold mb-4">Bienvenido a Hestion</h1>
          <p className="text-lg text-primary-foreground/90 mb-8">
            Plataforma financiera inteligente para el mercado chileno, especializada en gestión documental
            con robusto sistema de manejo de documentos y control de acceso administrativo.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <i className='bx bx-check-circle text-xl'></i>
              <span>Control de acceso</span>
            </div>
            <div className="flex items-center gap-2">
              <i className='bx bx-check-circle text-xl'></i>
              <span>Gestión documental</span>
            </div>
            <div className="flex items-center gap-2">
              <i className='bx bx-check-circle text-xl'></i>
              <span>OCR avanzado</span>
            </div>
            <div className="flex items-center gap-2">
              <i className='bx bx-check-circle text-xl'></i>
              <span>IA financiera</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <img src="/logo.png" alt="Logo" className="h-12" />
            </div>
            <CardTitle className="text-2xl font-bold">¡Bienvenido a Hestion! 👋</CardTitle>
            <p className="text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Correo Electrónico</Label>
                <div className="relative">
                  <i className='bx bx-envelope absolute left-3 top-2.5 text-xl text-muted-foreground'></i>
                  <Input
                    id="username"
                    type="email"
                    required
                    className="pl-10"
                    placeholder="correo@ejemplo.com"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <i className='bx bx-lock-alt absolute left-3 top-2.5 text-xl text-muted-foreground'></i>
                  <Input
                    id="password"
                    type="password"
                    required
                    className="pl-10"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}