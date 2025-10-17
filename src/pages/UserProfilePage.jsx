import React, { useState, useEffect } from 'react';
import { API_BASE } from '../constants';
import { 
  User, Mail, Camera, Tag, Palette, HardDrive, Calendar, Lock, Settings, Image as ImageIcon, TrendingUp, Trash2
} from 'lucide-react';

const UserProfilePage = ({ token, user, showSuccess, showError }) => {
  const [userStats, setUserStats] = useState({
    imagesUploaded: 0,
    tagsCreated: 0,
    themesCreated: 0,
    tagsUsed: 0,
    storageUsed: 0,
    storageLimit: 1000 // MB
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchUserStats();
    fetchRecentActivity();
  }, [token]);

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Transform the API response to match the expected format
        setUserStats({
          imagesUploaded: data.total_images || 0,
          tagsCreated: data.total_tags || 0,
          themesCreated: data.total_themes || 0,
          tagsUsed: 0, // This field is not provided by the API
          storageUsed: Math.round((data.total_storage || 0) / 1024 / 1024), // Convert bytes to MB
          storageLimit: 1000 // MB
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Transform the backend activity logs to frontend format
        const transformedActivity = (data.logs || []).map(log => ({
          type: getActivityType(log.action),
          description: getActivityDescription(log),
          timestamp: log.created_at
        }));
        setRecentActivity(transformedActivity);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const getActivityType = (action) => {
    if (action.includes('IMAGE')) return 'upload';
    if (action.includes('TAG')) return 'tag';
    if (action.includes('THEME')) return 'theme';
    if (action.includes('USER') && action.includes('DELETED')) return 'delete';
    return 'upload';
  };

  const getActivityDescription = (log) => {
    const action = log.action;
    const userName = log.name || 'Utilisateur';
    
    switch (action) {
      case 'IMAGE_CREATED':
        return `${userName} a téléversé une image`;
      case 'IMAGE_DELETED':
        return `${userName} a supprimé une image`;
      case 'TAG_CREATED':
        return `${userName} a créé un tag`;
      case 'TAG_UPDATED':
        return `${userName} a mis à jour un tag`;
      case 'TAG_DELETED':
        return `${userName} a supprimé un tag`;
      case 'THEME_CREATED':
        return `${userName} a créé un thème`;
      case 'THEME_UPDATED':
        return `${userName} a mis à jour un thème`;
      case 'THEME_DELETED':
        return `${userName} a supprimé un thème`;
      case 'USER_CREATED':
        return `${userName} a créé un utilisateur`;
      case 'USER_UPDATED':
        return `${userName} a mis à jour un utilisateur`;
      case 'USER_DELETED':
        return `${userName} a supprimé un utilisateur`;
      default:
        return `${userName} a effectué une action`;
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 6) {
      showError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess('Mot de passe changé avec succès');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch {
      showError('Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const storagePercentage = userStats && userStats.storageUsed && userStats.storageLimit ? 
    (userStats.storageUsed / userStats.storageLimit) * 100 : 0;
  const storageColor = storagePercentage > 80 ? 'text-red-600' : storagePercentage > 60 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mon Profil</h1>
        <p className="text-gray-600">Gérez votre compte et consultez vos statistiques</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Information */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-yellow-400 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{user && user.name ? user.name : 'Utilisateur'}</h2>
                <p className="text-gray-600 capitalize">{user && user.role ? user.role : 'utilisateur'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{user && user.email ? user.email : 'Email non disponible'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Membre depuis</p>
                  <p className="text-sm text-gray-900">{new Date(user && user.createdAt ? user.createdAt : Date.now()).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <HardDrive className="w-5 h-5 mr-2 text-blue-500" />
              Stockage
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Utilisé</span>
                <span className={`text-sm font-medium ${storageColor}`}>
                  {userStats && userStats.storageUsed ? userStats.storageUsed.toFixed(1) : '0'} MB / {userStats && userStats.storageLimit ? userStats.storageLimit : '1000'} MB
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${
                    storagePercentage > 80 ? 'bg-red-500' : 
                    storagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                ></div>
              </div>
              
              <div className="text-center">
                <span className={`text-lg font-bold ${storageColor}`}>
                  {storagePercentage.toFixed(1)}%
                </span>
                <p className="text-xs text-gray-500">de l'espace utilisé</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Images</h3>
                <Camera className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{userStats && userStats.imagesUploaded ? userStats.imagesUploaded : '0'}</p>
                <p className="text-sm text-gray-600">Images téléversées</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Tags</h3>
                <Tag className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Créés</span>
                  <span className="font-semibold text-green-600">{userStats && userStats.tagsCreated ? userStats.tagsCreated : '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Utilisés</span>
                  <span className="font-semibold text-blue-600">{userStats && userStats.tagsUsed ? userStats.tagsUsed : '0'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Thèmes</h3>
                <Palette className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{userStats && userStats.themesCreated ? userStats.themesCreated : '0'}</p>
                <p className="text-sm text-gray-600">Thèmes créés</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Activité</h3>
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{recentActivity.length}</p>
                <p className="text-sm text-gray-600">Actions récentes</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
              Activité Récente
            </h3>
            
            {recentActivity.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {activity.type === 'upload' && <Camera className="w-4 h-4 text-blue-600" />}
                      {activity.type === 'tag' && <Tag className="w-4 h-4 text-green-600" />}
                      {activity.type === 'theme' && <Palette className="w-4 h-4 text-purple-600" />}
                      {activity.type === 'delete' && <Trash2 className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune activité récente</p>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-blue-500" />
              Changer le mot de passe
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  minLength="6"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  minLength="6"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Réinitialiser
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {changingPassword ? 'Changement...' : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;