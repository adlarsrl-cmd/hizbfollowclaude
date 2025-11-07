import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import { useAuth } from './stores/useAuth';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components for better performance
const ParticipantsPage = React.lazy(() => import('./pages/ParticipantsPage'));
const EntryPage = React.lazy(() => import('./pages/EntryPage'));
const MonthlyEntriesPage = React.lazy(() => import('./pages/MonthlyEntriesPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const GroupsPage = React.lazy(() => import('./pages/GroupsPage'));
const PersonalEntryPage = React.lazy(() => import('./pages/PersonalEntryPage'));
const GroupSettingsPage = React.lazy(() => import('./pages/GroupSettingsPage'));
const JoinGroupPage = React.lazy(() => import('./pages/JoinGroupPage'));

function App() {
  const { isAuthenticated, user, enableGroups, fetchMyGroups } = useAppStore();
  const refresh = useAuth((s) => s.refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load groups on app start if groups are enabled
  useEffect(() => {
    if (isAuthenticated && enableGroups) {
      fetchMyGroups();
    }
  }, [isAuthenticated, enableGroups, fetchMyGroups]);

  // Update manifest title based on auth state
  useEffect(() => {
    const titleElement = document.querySelector('title[data-default]');
    if (titleElement && user) {
      titleElement.textContent = 'HizbFollow - Suivi Coran';
    }
  }, [user]);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <ToastContainer />
          <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route
              path="groups"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <GroupsPage />
                </React.Suspense>
              }
            />
            <Route
              path="participants"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <ParticipantsPage />
                </React.Suspense>
              }
            />
            <Route
              path="entry"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <EntryPage />
                </React.Suspense>
              }
            />
            <Route
              path="me/entry"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <PersonalEntryPage />
                </React.Suspense>
              }
            />
            <Route
              path="monthly"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <MonthlyEntriesPage />
                </React.Suspense>
              }
            />
            <Route
              path="analytics"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <AnalyticsPage />
                </React.Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <SettingsPage />
                </React.Suspense>
              }
            />
            <Route
              path="group-settings"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <GroupSettingsPage />
                </React.Suspense>
              }
            />
            <Route
              path="join"
              element={
                <React.Suspense fallback={<div className="flex justify-center p-8">Chargement...</div>}>
                  <JoinGroupPage />
                </React.Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;