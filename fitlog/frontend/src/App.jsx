import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import GoalModal from './components/GoalModal';

import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import ActiveWorkout from './pages/ActiveWorkout';
import Login from './pages/Login';
import Register from './pages/Register';

// Code-split secondary routes for faster initial load
const PersonalRecords = lazy(() => import('./pages/PersonalRecords'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Templates = lazy(() => import('./pages/Templates'));
const Hydration = lazy(() => import('./pages/Hydration'));
const Activity = lazy(() => import('./pages/Activity'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profile = lazy(() => import('./pages/Profile'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
    </div>
  );
}

function AppLayout({ children }) {
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#08080a] flex flex-col">
      <Navbar onOpenGoalModal={() => setGoalModalOpen(true)} />
      <main className="flex-1 pb-24 lg:pb-8">
        <Suspense fallback={<PageLoader />}>
          {React.cloneElement(children, { onOpenGoalModal: () => setGoalModalOpen(true) })}
        </Suspense>
      </main>
      <BottomNav />
      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        onGoalUpdated={() => window.location.reload()}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workouts"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Workouts />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workouts/active"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ActiveWorkout />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/records"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PersonalRecords />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercises"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Exercises />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Templates />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hydration"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Hydration />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Activity />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Analytics />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
