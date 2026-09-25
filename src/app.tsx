import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home'; 
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Residents from './pages/residents'; 
import Bills from './pages/bills'; 
import NavBar from './components/NavBar';  
import ProtectedRoute from './components/ProtectedRoute';
import Contacts from './pages/contacts';
import Register from './pages/register';
import ForgotPassword from './pages/forgot-password';
import UpdatePassword from './pages/update-password';
import Landing from './pages/landing';
import OutstandingLedger from './pages/OutstandingLedger';
import AuditExport from './pages/AuditExport';

function App() {
  return (
    <Router>
      <NavBar /> 
      
      <Routes>
        {/* === SHARED ROUTES (Both Admin & User) === */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} /> 
        <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} /> 
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />

        {/* === ADMIN-ONLY ROUTES === */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        /> 
        <Route 
          path="/outstanding" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <OutstandingLedger />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audit" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditExport />
            </ProtectedRoute>
          } 
        />

        {/* === RESIDENT-ONLY ROUTES === */}
        <Route 
          path="/residents" 
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <Residents />
            </ProtectedRoute>
          } 
        /> 

        {/* === PUBLIC ROUTES (No Login Required) === */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} /> 
        <Route path="/forgot-password" element={<ForgotPassword />} /> 
        <Route path="/update-password" element={<UpdatePassword />} />
        
      </Routes>
    </Router>
  );
}

export default App;