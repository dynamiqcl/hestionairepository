import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    nombreCompleto: "",
  });
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login({
          username: formData.username,
          password: formData.password,
        });
      } else {
        await register({
          username: formData.username,
          password: formData.password,
          nombreCompleto: formData.nombreCompleto,
        });
      }
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isLogin ? "Iniciar Sesión" : "Registrarse"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="nombreCompleto">Nombre Completo</Label>
                <Input
                  id="nombreCompleto"
                  required
                  value={formData.nombreCompleto}
                  onChange={(e) =>
                    setFormData({ ...formData, nombreCompleto: e.target.value })
                  }
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Ingresar" : "Registrarse"}
            </Button>

            <p className="text-center text-sm">
              {isLogin ? "¿No tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Regístrate aquí" : "Inicia sesión"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
