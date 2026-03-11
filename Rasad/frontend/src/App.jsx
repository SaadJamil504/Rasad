import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RouteList from './pages/RouteList';
import CustomerList from './pages/CustomerList';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="routes" element={<RouteList />} />
            <Route path="customers" element={<CustomerList />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
