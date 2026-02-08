import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Cameras from './pages/Cameras';
import PublicLayout from './components/PublicLayout';
import ClientPortal from './pages/ClientPortal';
import EventDetails from './pages/EventDetails';
import Finance from './pages/Finance';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import InvoiceDetails from './pages/InvoiceDetails';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Client Portal Routes */}
        <Route path="/p" element={<PublicLayout />}>
          <Route path=":id" element={<ClientPortal />} />
        </Route>

        {/* Public Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/cameras" element={<Cameras />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
