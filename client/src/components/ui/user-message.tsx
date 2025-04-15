import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useUserMessages } from "@/hooks/use-user-messages";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface UserMessageProps {
  userId?: number;
  className?: string;
}

export function UserMessage({ userId, className }: UserMessageProps) {
  const { user } = useAuth();
  const { getUserMessage } = useUserMessages();
  const messageId = userId || user?.id;
  
  const { data: userMessage, isLoading } = getUserMessage(messageId as number);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <Skeleton className="h-4 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!userMessage) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Mensaje del Administrador
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-wrap">
          {userMessage.message}
        </div>
      </CardContent>
    </Card>
  );
}