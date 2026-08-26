import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import CalendarOAuthCallback from './pages/CalendarOAuthCallback';

// Client Dashboard imports
// Client portal is temporarily disabled - see the commented-out route below.
// import ClientLayout from './pages/client/ClientLayout';
// import ClientDashboard from './pages/client/Dashboard';
// import CampaignOverview from './pages/client/CampaignOverview';
// import PressTracker from './pages/client/PressTracker';
// import ThoughtLeadership from './pages/client/ThoughtLeadership';
// import EventsAwards from './pages/client/EventsAwards';
// import GoalsCommitment from './pages/client/GoalsCommitment';
// import Reports from './pages/client/Reports';
// import MeetTeam from './pages/client/MeetTeam';
// import Subscription from './pages/client/Subscription';
// import Settings from './pages/client/Settings';

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
import ArticlePdfScraper from './pages/employee/ArticlePdfScraper';
import EPaperReader from './pages/employee/EPaperReader';
import EPaperManager from './pages/employee/EPaperManager';
// import InfluencerFinder from './pages/employee/InfluencerFinder'; // disabled for now -- needs further improvement

// Influencer Finder tab integration config
// Shown in place of the client portal while it's disabled (see route below)
function ClientPortalUnavailable() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19] text-center p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Client Portal Not Available</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The client portal is temporarily unavailable. Please check back later.
        </p>
      </div>
    </div>
  );
}

// Helper component to redirect logged in users according to their roles
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  const userRole = user.role?.toLowerCase();
  if (['employee', 'team', 'core', 'manager'].includes(userRole)) {
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
            <Route path="/oauth/calendar-callback" element={<CalendarOAuthCallback />} />

            {/* Smart Router Redirector */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRedirect />
                </ProtectedRoute>
              }
            />

            {/* Client Portal Routes - temporarily disabled, shows an unavailable
                notice instead. Uncomment below (and the imports above) to restore. */}
            <Route path="/client/*" element={<ClientPortalUnavailable />} />
            {/*
            <Route
              path="/client"
              element={
                <ProtectedRoute role="Client">
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
            */}

            {/* Team Portal Routes */}
            <Route
              path="/team"
              element={
                <ProtectedRoute role={['employee', 'team', 'core', 'manager']}>
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
              <Route path="article-pdf" element={<ArticlePdfScraper />} />
              <Route path="settings" element={<SettingsTeam />} />
              <Route path="epaper" element={<EPaperReader />} />
              <Route path="manage-epaper" element={<EPaperManager />} />
              {/* <Route path="influencer-finder" element={<InfluencerFinder />} /> disabled for now -- needs further improvement */}
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
