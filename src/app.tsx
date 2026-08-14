import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Residents from './pages/residents'; // Import the new page
import Bills from './pages/bills'; // Import the Bills page
import NavBar from './components/NavBar'; 
import Visitors from './pages/visitors'; 
import ProtectedRoute from './components/ProtectedRoute';
import Facilities from './pages/facilities';
import Parking from './pages/parking';
import Contacts from './pages/contacts';

function App() {
  return (
    <Router>
      <NavBar /> 
      
      <Routes>
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        /> 
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} /> 
        <Route path="/residents" element={<ProtectedRoute><Residents /></ProtectedRoute>} /> 
        <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} /> 
        <Route path="/login" element={<Login />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/facilities" element={<ProtectedRoute><Facilities /></ProtectedRoute>} />
        <Route path="/parking" element={<ProtectedRoute><Parking /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        
        {/* The new protected residents route! */}
        <Route 
          path="/residents" 
          element={
            <ProtectedRoute>
              <Residents />
            </ProtectedRoute>
          } 
        /> 
        
        <Route path="/login" element={<Login />} /> 
      </Routes>
    </Router>
  );
}

export default App;