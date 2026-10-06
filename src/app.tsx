import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/home'; 
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Bills from './pages/bills'; 
import NavBar from './components/NavBar';  
import ProtectedRoute from './components/ProtectedRoute';
import Contacts from './pages/contacts';
import Landing from './pages/landing';
import OutstandingLedger from './pages/OutstandingLedger';
import AuditExport from './pages/AuditExport';
import Announcements from './pages/announcements';
import Expenses from './pages/expenses';

function App() {
  return (
    <Router>
      <NavBar /> 
      
      <Routes>
        {/* === PUBLIC ROUTES (No Login Required) === */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />   
        {/* === USER ROUTES (Anonymous Access) === */}
        <Route path="/" element={<Home />} /> 
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/announcements" element={<Announcements />} />
        {/* Placeholder for future module: <Route path="/announcements" element={<Announcements />} /> */}

        {/* === ADMIN-ONLY ROUTES === */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} /> 
        <Route path="/outstanding" element={<ProtectedRoute allowedRoles={['admin']}><OutstandingLedger /></ProtectedRoute>} />
        <Route path="/bills" element={<ProtectedRoute allowedRoles={['admin']}><Bills /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute allowedRoles={['admin']}><AuditExport /></ProtectedRoute>} />
        <Route path="/expenses" element={<Expenses />} />
        
      </Routes>
    </Router>
  );
}

export default App;