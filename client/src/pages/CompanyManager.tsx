import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { useCompanies } from "@/hooks/use-companies"

export default function CompanyManager() {
  const { data: companies } = useCompanies()
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="p-6">
      <div className="page-header">
        <h1 className="page-title">Gestor de Empresas</h1>
        <p className="text-muted-foreground">Administra las empresas registradas en el sistema</p>
      </div>

      <Card className="data-table">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Empresas</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Empresa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies?.map((company) => (
              <Card key={company.id}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">{company.rut}</p>
                  <p className="text-sm text-muted-foreground">{company.direccion}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}