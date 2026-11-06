import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Home from './pages/Home.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import InternLogin from './pages/InternLogin.jsx';
import InternRegister from './pages/InternRegister.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import InternDashboard from './pages/InternDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

function RequireRole({ role, children }) {
  const { session } = useAuth();
  if (session?.role !== role) return <Navigate to={`/${role}/login`} replace />;
  return children;
}

function GuestOnly({ children }) {
  const { session } = useAuth();
  if (session?.role) return <Navigate to={`/${session.role}`} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestOnly><Home /></GuestOnly>} />
      <Route path="/admin/login" element={<GuestOnly><AdminLogin /></GuestOnly>} />
      <Route path="/intern/login" element={<GuestOnly><InternLogin /></GuestOnly>} />
      <Route path="/intern/register" element={<GuestOnly><InternRegister /></GuestOnly>} />
      <Route path="/admin/*" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="/intern/*" element={<RequireRole role="intern"><InternDashboard /></RequireRole>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
