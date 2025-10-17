import React, { useState, useEffect } from 'react';
import { API_BASE } from '../constants';
import { 
  Search, Filter, ChevronDown, Activity, UserPlus, Edit, UserMinus, 
  ImageIcon as ImageIcon2, Trash2, FileText, LogIn, UserCheck, Mail, 
  Calendar, Download, RefreshCw, Clock
} from 'lucide-react';

const ActivityLogs = ({ token, showError, showSuccess }) => {
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' or 'login'
  const [activityLogs, setActivityLogs] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userStats, setUserStats] = useState({});
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLogs();
      fetchUserStats();
    } else {
      fetchLoginLogs();
    }
  }, [activeTab, currentPage, filterAction, filterEmail, dateRange]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/logs?page=${currentPage}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActivityLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      showError('Erreur lors du chargement des journaux d\'activité');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginLogs = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/admin/login-logs?page=${currentPage}&limit=50`;
      
      if (filterEmail) {
        url += `&email=${encodeURIComponent(filterEmail)}`;
      }
      
      if (dateRange.start) {
        url += `&start_date=${encodeURIComponent(dateRange.start)}`;
      }
      
      if (dateRange.end) {
        url += `&end_date=${encodeURIComponent(dateRange.end)}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setLoginLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        showError(data.error || 'Erreur lors du chargement des journaux de connexion');
      }
    } catch {
      showError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        const stats = {};
        
        data.logs.forEach(log => {
          if (!stats[log.name]) {
            stats[log.name] = {
              name: log.name,
              created: 0,
              updated: 0,
              deleted: 0,
              lastActivity: null
            };
          }
          
          if (log.action === 'USER_CREATED') {
            stats[log.name].created++;
          } else if (log.action === 'USER_UPDATED') {
            stats[log.name].updated++;
          } else if (log.action === 'USER_DELETED') {
            stats[log.name].deleted++;
          }
          
          if (!stats[log.name].lastActivity || new Date(log.created_at) > new Date(stats[log.name].lastActivity)) {
            stats[log.name].lastActivity = log.created_at;
          }
        });
        
        setUserStats(stats);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  const handleExportLoginLogs = async () => {
    setExportLoading(true);
    try {
      let url = `${API_BASE}/api/admin/login-logs/export`;
      
      if (filterEmail) {
        url += `?email=${encodeURIComponent(filterEmail)}`;
      }
      
      if (dateRange.start) {
        url += `${filterEmail ? '&' : '?'}start_date=${encodeURIComponent(dateRange.start)}`;
      }
      
      if (dateRange.end) {
        url += `${filterEmail || dateRange.start ? '&' : '?'}end_date=${encodeURIComponent(dateRange.end)}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `login-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        showSuccess('Export des journaux de connexion réussi');
      } else {
        showError('Erreur lors de l\'export des journaux');
      }
    } catch {
      showError('Erreur lors de l\'export');
    } finally {
      setExportLoading(false);
    }
  };

  const filteredActivityLogs = activityLogs.filter(log => {
    const matchesAction = !filterAction || log.action === filterAction;
    const matchesSearch = !searchTerm || 
      (log.name && log.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  const filteredLoginLogs = loginLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      (log.email && log.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const uniqueActions = [...new Set(activityLogs.map(log => log.action))];
  const uniqueEmails = [...new Set(loginLogs.map(log => log.email).filter(Boolean))];

  const getActionDescription = (log) => {
    switch (log.action) {
      case 'USER_CREATED':
        return {
          title: 'Création d\'utilisateur',
          description: `${log.name} a créé un nouveau compte utilisateur`,
          icon: <UserPlus className="w-5 h-5 text-green-500" />,
          color: 'bg-green-100 text-green-800'
        };
      case 'USER_UPDATED':
        return {
          title: 'Modification d\'utilisateur',
          description: `${log.name} a modifié les informations d'un utilisateur`,
          icon: <Edit className="w-5 h-5 text-blue-500" />,
          color: 'bg-blue-100 text-blue-800'
        };
      case 'USER_DELETED':
        return {
          title: 'Suppression d\'utilisateur',
          description: `${log.name} a supprimé un compte utilisateur`,
          icon: <UserMinus className="w-5 h-5 text-red-500" />,
          color: 'bg-red-100 text-red-800'
        };
      case 'IMAGE_CREATED':
        return {
          title: 'Ajout d\'image',
          description: `${log.name} a ajouté une nouvelle image`,
          icon: <ImageIcon2 className="w-5 h-5 text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-800'
        };
      case 'IMAGE_UPDATED':
        return {
          title: 'Modification d\'image',
          description: `${log.name} a modifié les métadonnées d'une image`,
          icon: <Edit className="w-5 h-5 text-blue-500" />,
          color: 'bg-blue-100 text-blue-800'
        };
      case 'IMAGE_DELETED':
        return {
          title: 'Suppression d\'image',
          description: `${log.name} a supprimé une image`,
          icon: <Trash2 className="w-5 h-5 text-red-500" />,
          color: 'bg-red-100 text-red-800'
        };
      default:
        return {
          title: log.action,
          description: `${log.name} a effectué une action`,
          icon: <FileText className="w-5 h-5 text-gray-500" />,
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const getLoginStatus = (log) => {
    if (log.success) {
      return {
        status: 'Succès',
        color: 'bg-green-100 text-green-800',
        icon: <UserCheck className="w-4 h-4 text-green-500" />
      };
    } else {
      return {
        status: 'Échec',
        color: 'bg-red-100 text-red-800',
        icon: <LogIn className="w-4 h-4 text-red-500" />
      };
    }
  };

  const getUserActivitySummary = (userName) => {
    const stats = userStats[userName];
    if (!stats) return '';
    
    const parts = [];
    if (stats.created > 0) parts.push(`${stats.created} création${stats.created > 1 ? 's' : ''}`);
    if (stats.updated > 0) parts.push(`${stats.updated} modification${stats.updated > 1 ? 's' : ''}`);
    if (stats.deleted > 0) parts.push(`${stats.deleted} suppression${stats.deleted > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="text-xl">Chargement...</div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Journaux système</h1>
        <p className="text-gray-600">Consultez les journaux d'activité et de connexion</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Activité système
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={`py-4 px-6 border-b-2 font-medium text-sm transition ${
                activeTab === 'login'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Connexions
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'activity' ? (
        <>
          {/* User Activity Summary */}
          {Object.keys(userStats).length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Résumé d'activité par utilisateur</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(userStats).map(([userName, stats]) => (
                  <div key={userName} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{userName}</h3>
                      <span className="text-xs text-gray-500">
                        {stats.lastActivity ? `Dernière activité: ${new Date(stats.lastActivity).toLocaleDateString('fr-FR')}` : 'Aucune activité récente'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{getUserActivitySummary(userName)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Filters */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher dans les journaux..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  <option value="">Toutes les actions</option>
                  {uniqueActions.map(action => {
                    const actionInfo = getActionDescription({ action });
                    return (
                      <option key={action} value={action}>{actionInfo.title}</option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Activity Logs List */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredActivityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Aucune activité trouvée</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {searchTerm || filterAction ? 'Essayez d\'ajuster vos filtres' : 'Les activités apparaîtront ici'}
                  </p>
                </div>
              ) : (
                filteredActivityLogs.map(log => {
                  const actionInfo = getActionDescription(log);
                  return (
                    <div key={log.id} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${actionInfo.color}`}>
                          {actionInfo.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800">{actionInfo.title}</h3>
                          <p className="text-gray-600 mt-1">{actionInfo.description}</p>
                          <div className="flex items-center text-sm text-gray-500 mt-2">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{formatDate(log.created_at)}</span>
                            {log.resource_type && (
                              <>
                                <span className="mx-2">•</span>
                                <span>Type: {log.resource_type}</span>
                              </>
                            )}
                            {log.resource_id && (
                              <>
                                <span className="mx-2">•</span>
                                <span>ID: {log.resource_id}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="text-gray-600">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Login Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Connexions</p>
                  <p className="text-3xl font-bold mt-1">{loginLogs.length}</p>
                </div>
                <LogIn className="w-12 h-12 text-blue-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Connexions Réussies</p>
                  <p className="text-3xl font-bold mt-1">{loginLogs.filter(log => log.success).length}</p>
                </div>
                <UserCheck className="w-12 h-12 text-green-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Connexions Échouées</p>
                  <p className="text-3xl font-bold mt-1">{loginLogs.filter(log => !log.success).length}</p>
                </div>
                <LogIn className="w-12 h-12 text-red-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Utilisateurs Uniques</p>
                  <p className="text-3xl font-bold mt-1">{uniqueEmails.length}</p>
                </div>
                <Mail className="w-12 h-12 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Login Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  <option value="">Tous les emails</option>
                  {uniqueEmails.map(email => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  placeholder="Date de début"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  placeholder="Date de fin"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={fetchLoginLogs}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualiser</span>
              </button>
              
              <button
                onClick={handleExportLoginLogs}
                disabled={exportLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{exportLoading ? 'Exportation...' : 'Exporter CSV'}</span>
              </button>
            </div>
          </div>

          {/* Login Logs List */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLoginLogs.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-12">
                        <LogIn className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">Aucun journal de connexion trouvé</p>
                        <p className="text-gray-500 text-sm mt-2">
                          {searchTerm || filterEmail || dateRange.start || dateRange.end 
                            ? 'Essayez d\'ajuster vos filtres' 
                            : 'Les connexions apparaîtront ici'
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLoginLogs.map(log => {
                      const statusInfo = getLoginStatus(log);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="font-medium text-gray-900">{log.email || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-gray-400 mr-2" />
                              {formatDate(log.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.icon}
                              <span className="ml-1">{statusInfo.status}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="text-gray-600">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLogs;