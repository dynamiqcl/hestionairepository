
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./button";
import { Link } from "wouter";
import { LogOut } from "lucide-react";

export function Navbar() {
  const { logout } = useAuth();

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost">Inicio</Button>
          </Link>
          <Link href="/upload">
            <Button variant="ghost">Subir Boleta</Button>
          </Link>
          <Link href="/tables">
            <Button variant="ghost">Mantenedores</Button>
          </Link>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
