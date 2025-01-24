import { useAuth } from "@/hooks/use-auth";
import { Button } from "./button";
import { Link } from "wouter";
import { LogOut } from "lucide-react";

export function Navbar() {
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="border-b">
      <div className="mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
          <div className="hidden md:flex md:items-center md:space-x-4">
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
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden pb-4`}>
          <div className="flex flex-col space-y-2">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start">Inicio</Button>
            </Link>
            <Link href="/upload">
              <Button variant="ghost" className="w-full justify-start">Subir Boleta</Button>
            </Link>
            <Link href="/tables">
              <Button variant="ghost" className="w-full justify-start">Mantenedores</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}