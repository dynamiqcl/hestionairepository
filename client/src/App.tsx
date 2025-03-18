import { Switch, Route } from "wouter";
import Dashboard from "./pages/Dashboard";
import ReceiptUpload from "./pages/ReceiptUpload";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import CategoryManager from "./pages/CategoryManager";
import TablesViewer from "@/pages/TablesViewer";
import CompanyManager from "@/pages/CompanyManager";
import DocumentManager from "./pages/DocumentManager";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SneatLayout from "./components/layouts/SneatLayout";
import CssBaseline from '@mui/material/CssBaseline';


const theme = createTheme({
  palette: {
    primary: {
      main: '#696CFF',
    },
    background: {
      default: '#F5F5F9',
    },
  },
  typography: {
    fontFamily: "'Public Sans', sans-serif",
  },
});

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
        <Route path="/categories" component={CategoryManager} />
        <Route path="/tables" component={TablesViewer} />
        <Route path="/companies" component={CompanyManager} />
        <Route path="/documents" component={DocumentManager} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContent />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;