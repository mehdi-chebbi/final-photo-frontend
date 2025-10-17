import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, Users, Activity, Upload, LogOut, Menu, X, ImageIcon, User, Settings, LogIn
} from 'lucide-react';

const Navbar = ({ user, onLogout, mobileMenuOpen, setMobileMenuOpen }) => {
  const location = window.location.pathname;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-800" />
              </div>
              <span className="text-xl font-bold text-white">PhotoApp</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {user.role === 'admin' && (
              <>
                <Link
                  to="/admin-dashboard"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    location === '/admin-dashboard' 
                      ? 'bg-yellow-400 text-blue-800' 
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Utilisateurs</span>
                </Link>
                <Link
                  to="/logs"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    location === '/logs' 
                      ? 'bg-yellow-400 text-blue-800' 
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                  <span>Journaux</span>
                </Link>
              </>
            )}
            {user.role === 'uploader' && (
              <>
                <Link
                  to="/upload"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    location === '/upload' 
                      ? 'bg-yellow-400 text-blue-800' 
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span>Téléverser</span>
                </Link>
                <Link
                  to="/my-images"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    location === '/my-images' 
                      ? 'bg-yellow-400 text-blue-800' 
                      : 'text-blue-100 hover:bg-blue-700'
                  }`}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Mes Images</span>
                </Link>
              </>
            )}
            <Link
              to="/gallery"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                location === '/gallery' 
                  ? 'bg-yellow-400 text-blue-800' 
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span>Galerie</span>
            </Link>
            {user.role !== 'admin' && (
              <Link
                to="/myinfo"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  location === '/myinfo' 
                    ? 'bg-yellow-400 text-blue-800' 
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Mon Profil</span>
              </Link>
            )}
            
            <div className="flex items-center space-x-3 pl-6 border-l border-blue-400">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-blue-200 capitalize">{user.role}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-yellow-400 hover:bg-blue-700 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-blue-700 text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-blue-700 border-t border-blue-600">
          <div className="px-4 py-3 space-y-2">
            {user.role === 'admin' && (
              <>
                <Link
                  to="/admin-dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-blue-600 text-white"
                >
                  <Users className="w-5 h-5" />
                  <span>Utilisateurs</span>
                </Link>
                <Link
                  to="/logs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-blue-600 text-white"
                >
                  <Activity className="w-5 h-5" />
                  <span>Journaux</span>
                </Link>
              </>
            )}
            {user.role === 'uploader' && (
              <>
                <Link
                  to="/upload"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-blue-600 text-white"
                >
                  <Upload className="w-5 h-5" />
                  <span>Téléverser</span>
                </Link>
                <Link
                  to="/my-images"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-blue-600 text-white"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Mes Images</span>
                </Link>
              </>
            )}
            <Link
              to="/gallery"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-blue-600 text-white"
            >
              <ImageIcon className="w-5 h-5" />
              <span>Galerie</span>
            </Link>
            {user.role !== 'admin' && (
              <Link
                to="/myinfo"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-blue-600 text-white"
              >
                <User className="w-5 h-5" />
                <span>Mon Profil</span>
              </Link>
            )}
            <button
              onClick={onLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg hover:bg-blue-600 text-yellow-400"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;