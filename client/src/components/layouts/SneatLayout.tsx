
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import { Menu, ChevronLeft, Dashboard, Receipt, FileText, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const drawerWidth = 260;

export default function SneatLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const theme = useTheme();
  const [location] = useLocation();
  const { logout } = useAuth();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Documentos', icon: <FileText />, path: '/documents' },
    { text: 'Recibos', icon: <Receipt />, path: '/receipts' },
    { text: 'Configuración', icon: <Settings />, path: '/settings' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0px 2px 6px rgba(47, 43, 61, 0.14)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Hestion AI
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#2F2B3D',
            color: 'white',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                component={Link}
                href={item.path}
                selected={location === item.path}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
            <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <ListItem button onClick={logout}>
              <ListItemIcon sx={{ color: 'white' }}>
                <LogOut />
              </ListItemIcon>
              <ListItemText primary="Cerrar Sesión" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
