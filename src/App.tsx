import { Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Estimate from './pages/Estimate';
import EstimateMonolith from './pages/EstimateMonolith';
import WorkVolume from './pages/WorkVolume';
import Smeta from './pages/Smeta';
import Documentation from './pages/Documentation';
import BlueprintsRD from './pages/BlueprintsRD';
import BlueprintsPD from './pages/BlueprintsPD';
import References from './pages/References';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import Users from './pages/Users';
import Departments from './pages/Departments';

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents/estimate" element={<Estimate />} />
        <Route path="/documents/estimate-monolith" element={<EstimateMonolith />} />
        <Route path="/documents/work-volume" element={<WorkVolume />} />
        <Route path="/documents/cost" element={<Smeta />} />
        <Route path="/library/docs" element={<Documentation />} />
        <Route path="/library/rd-codes" element={<BlueprintsRD />} />
        <Route path="/library/pd-codes" element={<BlueprintsPD />} />
        <Route path="/references" element={<References />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/departments" element={<Departments />} />
      </Routes>
    </MainLayout>
  );
}
