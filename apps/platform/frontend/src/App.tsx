import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import CanvasPage from './pages/CanvasPage';
import BotsPage from './pages/BotsPage';
import SessionsPage from './pages/SessionsPage';
import BotDetailPage from './pages/BotDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/canvas/:id" element={<CanvasPage />} />
      <Route path="/bots" element={<BotsPage />} />
      <Route path="/bots/:id" element={<BotDetailPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
    </Routes>
  );
}

export default App;
