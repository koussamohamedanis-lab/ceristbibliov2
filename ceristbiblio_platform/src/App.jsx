import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardProfil from "./pages/DashboardProfil";
import OpenAlex from "./pages/OpenAlex";
import Results from "./pages/Results";
import Overview from "./pages/Overview";
import Sources from "./pages/Sources";
import Documents from "./pages/Documents";
import TeamManagement from "./pages/TeamManagement";
import LabManagement from "./pages/LabManagement";
import UserManagement from "./pages/UserManagement";
import InstitutionalStructure from "./pages/InstitutionalStructure";
import GlobalStatistics from "./pages/GlobalStatistics";
import SystemConfiguration from "./pages/SystemConfiguration";
import MyPublications from "./pages/MyPublications";
import HierarchicalExplorer from "./components/HierarchicalExplorer";
import Comparaison from "./pages/Comparaison";
import CollaborationAnalysis from "./pages/CollaborationAnalysis";
import Rapports from "./pages/Rapports";
import Settings from "./pages/Settings";
import Chatbot from "./pages/Chatbot";
import Messaging from "./pages/Messaging";
import './assets/style.css';
import './assets/dashboard.css';

// Pages temporaires pour futures implémentations
// const PubMed = () => <div className="placeholder-page"><h1>PubMed Search</h1><p>À venir...</p></div>;
// const Upload = () => <div className="placeholder-page"><h1>Upload File</h1><p>À venir...</p></div>;
// const Filter = () => <div className="placeholder-page"><h1>Filter Results</h1><p>À venir...</p></div>;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('access_token')
  })

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token')
      setIsAuthenticated(!!token)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <BrowserRouter>
      {isAuthenticated ? (
        <>
          <Sidebar />
          <main className="main-content">
            <Header />
            <div className="content-area-wrapper">
              <Routes>
                {/* Dashboard Profil - Tous les rôles */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <DashboardProfil />
                    </ProtectedRoute>
                  } 
                />

                {/* Mon Équipe - Chef d'Équipe, Chef de Labo */}
                <Route 
                  path="/team-management" 
                  element={
                    <ProtectedRoute allowedRoles={['chef_equipe', 'chef_labo']}>
                      <TeamManagement />
                    </ProtectedRoute>
                  } 
                />

                {/* Gestion Laboratoire - Chef de Labo */}
                <Route 
                  path="/lab-management" 
                  element={
                    <ProtectedRoute allowedRoles={['chef_labo']}>
                      <LabManagement />
                    </ProtectedRoute>
                  } 
                />

                {/* Statistiques Globales - Directeur, Tutelle */}
                <Route 
                  path="/global-statistics" 
                  element={
                    <ProtectedRoute allowedRoles={['directeur', 'tutelle']}>
                      <GlobalStatistics />
                    </ProtectedRoute>
                  } 
                />

                {/* Explorateur Hiérarchique - Tutelle, Directeur, Chef Labo */}
                <Route 
                  path="/hierarchical-explorer" 
                  element={
                    <ProtectedRoute allowedRoles={['tutelle', 'directeur', 'chef_labo']}>
                      <HierarchicalExplorer />
                    </ProtectedRoute>
                  } 
                />

                {/* Comparaison - Chef de Labo, Directeur, Tutelle */}
                <Route 
                  path="/comparaison" 
                  element={
                    <ProtectedRoute allowedRoles={['chef_labo', 'directeur', 'tutelle']}>
                      <Comparaison />
                    </ProtectedRoute>
                  } 
                />

                {/* Collaboration Analysis - Tous les rôles de gestion */}
                <Route 
                  path="/collaboration" 
                  element={
                    <ProtectedRoute allowedRoles={['chef_equipe', 'chef_labo', 'directeur', 'tutelle']}>
                      <CollaborationAnalysis />
                    </ProtectedRoute>
                  } 
                />

                {/* Rapports - Directeur, Tutelle */}
                <Route 
                  path="/rapports" 
                  element={
                    <ProtectedRoute allowedRoles={['directeur', 'tutelle']}>
                      <Rapports />
                    </ProtectedRoute>
                  } 
                />

                {/* Gestion des Utilisateurs - Tutelle, Directeur, Chef Labo */}
                <Route 
                  path="/user-management" 
                  element={
                    <ProtectedRoute allowedRoles={['tutelle', 'directeur', 'chef_labo']}>
                      <UserManagement />
                    </ProtectedRoute>
                  } 
                />

                {/* Structure Institutionnelle - Tutelle */}
                <Route 
                  path="/institutional-structure" 
                  element={
                    <ProtectedRoute allowedRoles={['tutelle', 'directeur']}>
                      <InstitutionalStructure />
                    </ProtectedRoute>
                  } 
                />

                {/* Configuration Système - Admin */}
                <Route 
                  path="/system-configuration" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SystemConfiguration />
                    </ProtectedRoute>
                  } 
                />

                {/* Mes Publications - Chercheur */}
                <Route 
                  path="/my-publications" 
                  element={
                    <ProtectedRoute allowedRoles={['chercheur']}>
                      <MyPublications />
                    </ProtectedRoute>
                  } 
                />

                {/* Paramètres - Tous les rôles */}
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />

                {/* Messagerie - Tous les rôles */}
                <Route 
                  path="/messaging" 
                  element={
                    <ProtectedRoute>
                      <Messaging />
                    </ProtectedRoute>
                  } 
                />

                {/* Assistant IA - Tous les rôles */}
                <Route 
                  path="/assistant-ia" 
                  element={
                    <ProtectedRoute>
                      <Chatbot />
                    </ProtectedRoute>
                  } 
                />

                {/* Routes Utilitaires */}
                <Route 
                  path="/openalex" 
                  element={
                    <ProtectedRoute>
                      <OpenAlex />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/results" 
                  element={
                    <ProtectedRoute>
                      <Results />
                    </ProtectedRoute>
                  } 
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;