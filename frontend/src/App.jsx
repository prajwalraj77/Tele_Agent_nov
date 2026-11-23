import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage";
import CallsPage from "./pages/CallsPage";
import BulkCallsPage from "./pages/BulkCallsPage";
import BulkCallDetailPage from "./pages/BulkCallDetailPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerDetailsPage from "./pages/CustomerDetailsPage";
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
        <Route path="/bulk" element={<BulkCallsPage />} />
        <Route path="/bulk/:bulkId" element={<BulkCallDetailPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
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