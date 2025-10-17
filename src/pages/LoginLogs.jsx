import React, { useState, useEffect } from 'react';
import { API_BASE } from '../constants';
import { 
  Search, Filter, ChevronDown, LogIn, Calendar, Mail, 
  Clock, Download, RefreshCw, UserCheck
} from 'lucide-react';

const LoginLogs = ({ token, showError, showSuccess }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEmail, setFilterEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchLoginLogs();
  }, [currentPage, filterEmail, dateRange]);

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
        setLogs(data.logs || []);
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

  const handleExport = async () => {
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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      (log.email && log.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const uniqueEmails = [...new Set(logs.map(log => log.email).filter(Boolean))];

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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Chargement des journaux de connexion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Journaux de connexion</h1>
        <p className="text-gray-600">Surveillez les connexions des utilisateurs</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Connexions</p>
              <p className="text-3xl font-bold mt-1">{logs.length}</p>
            </div>
            <LogIn className="w-12 h-12 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Connexions Réussies</p>
              <p className="text-3xl font-bold mt-1">{logs.filter(log => log.success).length}</p>
            </div>
            <UserCheck className="w-12 h-12 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Connexions Échouées</p>
              <p className="text-3xl font-bold mt-1">{logs.filter(log => !log.success).length}</p>
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

      {/* Filters */}
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
            onClick={handleExport}
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
              {filteredLogs.length === 0 ? (
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
                filteredLogs.map(log => {
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
    </div>
  );
};

export default LoginLogs;