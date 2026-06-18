import { AnimatePresence } from "framer-motion";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Matchmaking from "./pages/Matchmaking";
import Game from "./pages/Game";
import History from "./pages/History";
import EloGraph from "./pages/EloGraph";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthSuccess from "./pages/OAuthSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Maps from "./pages/Maps";
import MyMaps from "./pages/MyMaps";
import Store from "./pages/Store";
import CheckoutSim from "./pages/CheckoutSim";
import ProtectedLayout from "./components/ProtectedLayout";
import { getMe } from "./services/api";

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isMounted = true;

    getMe()
      .then(() => {
        if (isMounted) {
          setStatus("allowed");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("blocked");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Verification de session...
      </div>
    );
  }

  if (status === "blocked") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ProtectedWithLayout({ children }) {
  return (
    <ProtectedRoute>
      <ProtectedLayout>{children}</ProtectedLayout>
    </ProtectedRoute>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path="/profile" element={<ProtectedWithLayout><Profile /></ProtectedWithLayout>} />
        <Route path="/maps" element={<ProtectedWithLayout><Maps /></ProtectedWithLayout>} />
        <Route path="/my-maps" element={<ProtectedWithLayout><MyMaps /></ProtectedWithLayout>} />
        <Route path="/store" element={<ProtectedWithLayout><Store /></ProtectedWithLayout>} />
        <Route path="/checkout/:providerSlug" element={<ProtectedRoute><CheckoutSim /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedWithLayout><Dashboard /></ProtectedWithLayout>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/matchmaking" element={<ProtectedWithLayout><Matchmaking /></ProtectedWithLayout>} />
        <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedWithLayout><History /></ProtectedWithLayout>} />
        <Route path="/elo" element={<ProtectedWithLayout><EloGraph /></ProtectedWithLayout>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}
