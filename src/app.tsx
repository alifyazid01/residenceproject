import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/home'; // Import the new Gateway page
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Residents from './pages/residents'; 
import Bills from './pages/bills'; 
import NavBar from './components/NavBar'; 
import Visitors from './pages/visitors'; 
import ProtectedRoute from './components/ProtectedRoute';
import Facilities from './pages/facilities';
import Parking from './pages/parking';
import Contacts from './pages/contacts';
import Register from './pages/register';
import ForgotPassword from './pages/forgot-password';
import UpdatePassword from './pages/update-password';

function App() {
  return (
    <Router>
      <NavBar /> 
      
      <Routes>
        {/* The New Gateway Portal */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        /> 

        {/* The Dedicated Admin Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        /> 
        
        {/* Resident / User Routes */}
        <Route 
          path="/residents" 
          element={
            <ProtectedRoute>
              <Residents />
            </ProtectedRoute>
          } 
        /> 
        
        <Route 
          path="/bills" 
          element={
            <ProtectedRoute>
              <Bills />
            </ProtectedRoute>
          } 
        /> 

        <Route 
          path="/visitors" 
          element={
            <ProtectedRoute>
              <Visitors />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/facilities" 
          element={
            <ProtectedRoute>
              <Facilities />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/parking" 
          element={
            <ProtectedRoute>
              <Parking />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/contacts" 
          element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          } 
        />
        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} /> 

        <Route path="/forgot-password" element={<ForgotPassword />} /> 

        <Route path="/update-password" element={<UpdatePassword />} />
        
      </Routes>
    </Router>
  );
}

export default App;