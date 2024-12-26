import { useState } from "react";
import { useAlerts } from "@/hooks/use-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Settings } from "lucide-react";

export default function AlertsPage() {
  const { rules, notifications, isLoading, addRule, toggleRule, markAsRead } = useAlerts();
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    type: "AMOUNT",
    threshold: 0,
    category: "",
    timeframe: "DAILY"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addRule(newRule);
      setIsCreating(false);
      setNewRule({
        name: "",
        type: "AMOUNT",
        threshold: 0,
        category: "",
        timeframe: "DAILY"
      });
    } catch (error) {
      console.error("Error al crear la alerta:", error);
    }
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Alertas Personalizadas</h1>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Alerta
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Alerta</Label>
                <Input
                  id="name"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="ej: Gastos grandes en restaurantes"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Alerta</Label>
                <Select
                  value={newRule.type}
                  onValueChange={(value) => setNewRule({ ...newRule, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMOUNT">Por Monto</SelectItem>
                    <SelectItem value="CATEGORY">Por Categoría</SelectItem>
                    <SelectItem value="FREQUENCY">Por Frecuencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">
                  {newRule.type === "AMOUNT" ? "Monto Límite (CLP)" :
                   newRule.type === "FREQUENCY" ? "Número de Transacciones" :
                   "Monto Límite por Categoría (CLP)"}
                </Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={newRule.threshold}
                  onChange={(e) => setNewRule({ ...newRule, threshold: parseInt(e.target.value) })}
                  required
                />
              </div>

              {newRule.type === "CATEGORY" && (
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={newRule.category}
                    onValueChange={(value) => setNewRule({ ...newRule, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alimentación">Alimentación</SelectItem>
                      <SelectItem value="Transporte">Transporte</SelectItem>
                      <SelectItem value="Oficina">Oficina</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="timeframe">Período</Label>
                <Select
                  value={newRule.timeframe}
                  onValueChange={(value) => setNewRule({ ...newRule, timeframe: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Diario</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="MONTHLY">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Crear Alerta
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Alertas Configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay alertas configuradas
              </p>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{rule.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {rule.type === "AMOUNT" ? "Por Monto" :
                         rule.type === "CATEGORY" ? "Por Categoría" :
                         "Por Frecuencia"} - {rule.timeframe.toLowerCase()}
                      </p>
                    </div>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) => toggleRule({ id: rule.id, isActive: checked })}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay notificaciones nuevas
              </p>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg ${
                      notification.isRead ? "bg-muted/10" : "bg-primary/5"
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <p className="font-medium">{notification.message}</p>
                    {notification.details && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.details}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
