import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import CallsPage from "./pages/CallsPage";
import CustomersPage from "./pages/CustomersPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import AgentConfigPage from "./pages/AgentConfigPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calls" element={<CallsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />
        <Route path="/management/agent-configuration" element={<AgentConfigPage />} />
        <Route path="/management/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/management/analytics" element={<AnalyticsPage />} />
        <Route path="/management/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;