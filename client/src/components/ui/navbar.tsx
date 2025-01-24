
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./button";
import { Link } from "wouter";
import { LogOut, Menu, X } from "lucide-react";
import * as React from "react";

export function Navbar() {
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-[#1E3A5F] text-[#F0F4F8] backdrop-blur supports-[backdrop-filter]:bg-[#1E3A5F]/90">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
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

          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`${
            isMenuOpen ? "block" : "hidden"
          } absolute left-0 right-0 top-16 bg-background border-b md:hidden`}
        >
          <div className="flex flex-col space-y-2 p-4">
            <Link href="/" onClick={() => setIsMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Inicio
              </Button>
            </Link>
            <Link href="/upload" onClick={() => setIsMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Subir Boleta
              </Button>
            </Link>
            <Link href="/tables" onClick={() => setIsMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Mantenedores
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
