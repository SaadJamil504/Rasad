import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RouteList from './pages/RouteList';
import CustomerList from './pages/CustomerList';
import DriverList from './pages/DriverList';
import Dashboard from './pages/Dashboard';
import InvitationSignup from './pages/InvitationSignup';
import MonthlyBills from './pages/MonthlyBills';
import Reports from './pages/Reports';

import RoleRoute from './components/Auth/RoleRoute';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/join/:token" element={<InvitationSignup />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route
              path="routes"
              element={<RoleRoute><RouteList /></RoleRoute>}
            />
            <Route
              path="customers"
              element={<RoleRoute><CustomerList /></RoleRoute>}
            />
            <Route
              path="bills"
              element={<RoleRoute><MonthlyBills /></RoleRoute>}
            />
            <Route
              path="reports"
              element={<RoleRoute><Reports /></RoleRoute>}
            />
            <Route
              path="drivers"
              element={<RoleRoute><DriverList /></RoleRoute>}
            />
          </Route>
        </Routes>
      </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
