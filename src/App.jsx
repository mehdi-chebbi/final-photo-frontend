import React, { useState } from 'react';
import { 
  BrowserRouter as Router, Routes, Route, Navigate
} from 'react-router-dom';
import { useAuth } from './hooks';
import { 
  Footer, Navbar 
} from './components';
import { 
  LoginPage, AdminDashboard, UploadPage, MyImagesPage, Gallery, ActivityLogs, UserProfilePage, LoginLogs
} from './pages';

// Main App Component with Router
const App = () => {
  const { currentUser, token, loading, initializing, handleLogin, handleLogout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  // If we're still initializing, show a loading screen
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-yellow-400">
        <div className="text-xl text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-yellow-50">
        {success && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {success}
          </div>
        )}
        {error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}

        <Routes>
          <Route path="/login" element={
            !currentUser ? (
              <LoginPage 
                onLogin={async (email, password) => {
                  const result = await handleLogin(email, password);
                  if (!result.success) {
                    showError(result.error);
                  }
                }} 
                loading={loading} 
                error={error} 
              />
            ) : (
              <Navigate to={currentUser.role === 'admin' ? '/admin-dashboard' : currentUser.role === 'uploader' ? '/upload' : '/gallery'} />
            )
          } />
          
          <Route path="/admin-dashboard" element={
            currentUser && currentUser.role === 'admin' ? (
              <>
                <Navbar 
                  user={currentUser} 
                  onLogout={handleLogout}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
                <main className="flex-1 pt-20 pb-8">
                  <AdminDashboard token={token} showSuccess={showSuccess} showError={showError} />
                </main>
                <Footer />
              </>
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/upload" element={
            currentUser && (currentUser.role === 'admin' || currentUser.role === 'uploader') ? (
              <>
                <Navbar 
                  user={currentUser} 
                  onLogout={handleLogout}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
                <main className="flex-1 pt-20 pb-8">
                  <UploadPage token={token} user={currentUser} showSuccess={showSuccess} showError={showError} />
                </main>
                <Footer />
              </>
            ) : currentUser ? (
              <Navigate to="/gallery" />
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          {/* Updated MyImagesPage routes with pagination support */}
          <Route path="/my-images" element={
            currentUser && (currentUser.role === 'admin' || currentUser.role === 'uploader') ? (
              <>
                <Navbar 
                  user={currentUser} 
                  onLogout={handleLogout}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
                <main className="flex-1 pt-20 pb-8">
                  <MyImagesPage token={token} user={currentUser} showSuccess={showSuccess} showError={showError} />
                </main>
                <Footer />
              </>
            ) : currentUser ? (
              <Navigate to="/gallery" />
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          {/* New route for paginated MyImagesPage */}
          <Route path="/my-images/page/:page" element={
            currentUser && (currentUser.role === 'admin' || currentUser.role === 'uploader') ? (
              <>
                <Navbar 
                  user={currentUser} 
                  onLogout={handleLogout}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
                <main className="flex-1 pt-20 pb-8">
                  <MyImagesPage token={token} user={currentUser} showSuccess={showSuccess} showError={showError} />
                </main>
                <Footer />
              </>
            ) : currentUser ? (
              <Navigate to="/gallery" />
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/gallery" element={
            currentUser ? (
              <>
                <Navbar 
                  user={currentUser} 
                  onLogout={handleLogout}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
                <main className="flex-1 pt-20 pb-8">
                  <Gallery token={token} user={currentUser} showSuccess={showSuccess} showError={showError} />
                </main>
                <Footer />
              </>
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/logs" element={
            currentUser && currentUser.role === 'admin' ? (
              <>
                <Navbar 
                  user={currentUser} 
                  onLogout={handleLogout}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
                <main className="flex-1 pt-20 pb-8">
                  <ActivityLogs token={token} showError={showError} showSuccess={showSuccess} />
                </main>
                <Footer />
              </>
            ) : currentUser ? (
              <Navigate to={currentUser.role === 'admin' ? '/admin-dashboard' : currentUser.role === 'uploader' ? '/upload' : '/gallery'} />
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/myinfo" element={
            currentUser && currentUser.role !== 'admin' ? (
              <>
                <Navbar 
                  user={currentUser} 
                  onLogout={handleLogout}
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
                <main className="flex-1 pt-20 pb-8">
                  <UserProfilePage token={token} user={currentUser} showSuccess={showSuccess} showError={showError} />
                </main>
                <Footer />
              </>
            ) : currentUser ? (
              <Navigate to={currentUser.role === 'admin' ? '/admin-dashboard' : currentUser.role === 'uploader' ? '/upload' : '/gallery'} />
            ) : (
              <Navigate to="/login" />
            )
          } />
          
          <Route path="/" element={
            currentUser ? (
              <Navigate to={currentUser.role === 'admin' ? '/admin-dashboard' : currentUser.role === 'uploader' ? '/upload' : '/gallery'} />
            ) : (
              <Navigate to="/login" />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;