import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ApplyPage } from "./pages/ApplyPage";
import { CandidateDetailPage } from "./pages/CandidateDetailPage";
import { CandidatesPage } from "./pages/CandidatesPage";
import { DashboardPage } from "./pages/DashboardPage";

function HRLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function ApplyLayout() {
  return (
    <AppShell hideNav hideProfile>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<HRLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="candidates/:id" element={<CandidateDetailPage />} />
      </Route>
      <Route element={<ApplyLayout />}>
        <Route path="apply" element={<ApplyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
