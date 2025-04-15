import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare } from "lucide-react";

interface UserMessageProps {
  userId?: number;
  className?: string;
}

export function UserMessage({ userId, className }: UserMessageProps) {
  const [message, setMessage] = useState<{
    id: number;
    message: string;
    isActive: boolean;
    createdAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchMessage() {
      try {
        setLoading(true);
        const id = userId || user?.id;
        if (!id) return;

        const response = await fetch(`/api/user-messages/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.isActive) {
            setMessage(data);
          } else {
            setMessage(null);
          }
        } else {
          setMessage(null);
        }
      } catch (error) {
        console.error("Error fetching user message:", error);
        setMessage(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMessage();
  }, [userId, user?.id]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
            Mensaje de Administración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-2"></div>
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
          Mensaje de Administración
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{message.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(message.createdAt).toLocaleDateString('es-ES')}
        </p>
      </CardContent>
    </Card>
  );
}