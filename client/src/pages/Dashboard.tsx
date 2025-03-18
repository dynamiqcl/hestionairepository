import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, DollarSign, Building2, BarChart3 } from "lucide-react"
import { useDocuments } from "@/hooks/use-documents"
import { useReceipts } from "@/hooks/use-receipts"
import { useCompanies } from "@/hooks/use-companies"

export default function Dashboard() {
  const { data: documents } = useDocuments()
  const { data: receipts } = useReceipts()
  const { data: companies } = useCompanies()

  const stats = [
    {
      title: "Documentos Totales",
      value: documents?.length || 0,
      icon: <FileText className="h-6 w-6" />,
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Recibos Procesados",
      value: receipts?.length || 0,
      icon: <DollarSign className="h-6 w-6" />,
      color: "bg-blue-100 text-blue-600", 
    },
    {
      title: "Empresas Registradas",
      value: companies?.length || 0,
      icon: <Building2 className="h-6 w-6" />,
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Análisis Pendientes",
      value: "12",
      icon: <BarChart3 className="h-6 w-6" />,
      color: "bg-orange-100 text-orange-600",
    }
  ]

  return (
    <div className="p-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido a tu panel de control</p>
      </div>

      <div className="dashboard-stats">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="stat-card">
              <div className={`stat-icon ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-semibold">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Aquí irá el contenido de actividad reciente */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Aquí irán las estadísticas */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}