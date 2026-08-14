import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import Login from './pages/login';
import Residents from './pages/residents'; // Import the new page
import Bills from './pages/bills'; // Import the Bills page
import NavBar from './components/NavBar'; 
import ProtectedRoute from './components/ProtectedRoute';

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
        {/* The new bills route */}
        <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} /> 
        <Route path="/login" element={<Login />} />
        
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