import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout        from './components/Layout.jsx';
import Dashboard     from './pages/Dashboard.jsx';
import Clients       from './pages/Clients.jsx';
import ClientProfile from './pages/ClientProfile.jsx';
import Schedule      from './pages/Schedule.jsx';
import Plans          from './pages/Plans.jsx';
import NutritionPlans  from './pages/NutritionPlans.jsx';
import Notifications  from './pages/Notifications.jsx';
import Settings       from './pages/Settings.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<Layout />}>
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/clients"     element={<Clients />} />
          <Route path="/clients/:id" element={<ClientProfile />} />
          <Route path="/schedule"    element={<Schedule />} />
          <Route path="/plans"       element={<Plans />} />
          <Route path="/nutrition"       element={<NutritionPlans />} />
          <Route path="/notifications"  element={<Notifications />} />
          <Route path="/settings"    element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
