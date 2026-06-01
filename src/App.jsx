import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';

// Client Dashboard imports
import ClientLayout from './pages/client/ClientLayout';
import ClientDashboard from './pages/client/Dashboard';
import CampaignOverview from './pages/client/CampaignOverview';
import PressTracker from './pages/client/PressTracker';
import ThoughtLeadership from './pages/client/ThoughtLeadership';
import EventsAwards from './pages/client/EventsAwards';
import GoalsCommitment from './pages/client/GoalsCommitment';
import Reports from './pages/client/Reports';
import MeetTeam from './pages/client/MeetTeam';
import Subscription from './pages/client/Subscription';
import Settings from './pages/client/Settings';

// Team Dashboard imports
import TeamLayout from './pages/employee/EmployeeLayout';
import TeamDashboard from './pages/employee/Dashboard';
import Clients from './pages/employee/Clients';
import TimeAllocation from './pages/employee/TimeAllocation';
import UploadCoverage from './pages/employee/UploadCoverage';
import AnalysisBoard from './pages/employee/AnalysisBoard';
import EventsAwardsTeam from './pages/employee/EventsAwards';
import JournalistSource from './pages/employee/JournalistSource';
import SettingsTeam from './pages/employee/Settings';
import MorningTracker from './pages/employee/MorningTracker';
import CrisisPredictor from './pages/employee/CrisisPredictor';

// Helper component to redirect logged in users according to their roles
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Employee' || user.role === 'Team') {
    return <Navigate to="/team" replace />;
  }
  // Default to Client
  return <Navigate to="/client" replace />;
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Smart Router Redirector */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRedirect />
                </ProtectedRoute>
              }
            />

            {/* Client Portal Routes */}
            <Route
              path="/client"
              element={
                <ProtectedRoute>
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClientDashboard />} />
              <Route path="campaigns" element={<CampaignOverview />} />
              <Route path="press" element={<PressTracker />} />
              <Route path="thought-leadership" element={<ThoughtLeadership />} />
              <Route path="events" element={<EventsAwards />} />
              <Route path="goals" element={<GoalsCommitment />} />
              <Route path="reports" element={<Reports />} />
              <Route path="team" element={<MeetTeam />} />
              <Route path="subscription" element={<Subscription />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Team Portal Routes */}
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <TeamLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TeamDashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="time-allocation" element={<TimeAllocation />} />
              <Route path="upload" element={<UploadCoverage />} />
              <Route path="analysis" element={<AnalysisBoard />} />
              <Route path="events" element={<EventsAwardsTeam />} />
              <Route path="journalists" element={<JournalistSource />} />
              <Route path="morning-tracker" element={<MorningTracker />} />
              <Route path="crisis-tracker" element={<CrisisPredictor />} />
              <Route path="settings" element={<SettingsTeam />} />
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
