import { Switch, Route } from "wouter";
import Dashboard from "./pages/Dashboard";
import ReceiptUpload from "./pages/ReceiptUpload";
import AlertsPage from "./pages/AlertsPage";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/upload" component={ReceiptUpload} />
        <Route path="/alerts" component={AlertsPage} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;