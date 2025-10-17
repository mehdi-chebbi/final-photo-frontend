import React, { useState, useEffect } from 'react';
import { API_BASE, FRENCH_COUNTRIES } from '../constants';
import { 
  Upload, ImageIcon, Trash2, PlusCircle, CheckCircle, XCircle, Palette, Tag, Globe, Edit, Save, X, Camera, MapPin, Calendar
} from 'lucide-react';

const UploadPage = ({ token, user, showSuccess, showError }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [themes, setThemes] = useState([]);
  const [tags, setTags] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedDateTaken, setSelectedDateTaken] = useState(''); // New state for date_taken override
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTheme, setNewTheme] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // New state for editing
  const [editingTheme, setEditingTheme] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [updatedThemeName, setUpdatedThemeName] = useState('');
  const [updatedTagName, setUpdatedTagName] = useState('');

  useEffect(() => {
    fetchThemes();
    fetchTags();
    // Use hardcoded countries instead of fetching from API
    setCountries(FRENCH_COUNTRIES);
    
    // Don't set default date - let the backend extract from EXIF
    // Only set date if user explicitly selects one
  }, []);

  const fetchThemes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/themes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setThemes(data.themes);
    } catch {
      showError('Erreur lors du chargement des thèmes');
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTags(data.tags);
    } catch {
      showError('Erreur lors du chargement des tags');
    }
  };

  const handleCreateTheme = async (e) => {
    e.preventDefault();
    if (!newTheme.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/themes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newTheme.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showSuccess('Thème créé avec succès');
      setNewTheme('');
      setShowThemeModal(false);
      fetchThemes();
    } catch {
      showError('Erreur lors de la création du thème');
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newTag.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showSuccess('Tag créé avec succès');
      setNewTag('');
      setShowTagModal(false);
      fetchTags();
    } catch {
      showError('Erreur lors de la création du tag');
    }
  };

  // New function to handle theme update
  const handleUpdateTheme = async (e) => {
    e.preventDefault();
    if (!updatedThemeName.trim() || !editingTheme) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/themes/${editingTheme.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: updatedThemeName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showSuccess('Thème mis à jour avec succès');
      setEditingTheme(null);
      setUpdatedThemeName('');
      fetchThemes();
    } catch {
      showError('Erreur lors de la mise à jour du thème');
    }
  };

  // New function to handle tag update
  const handleUpdateTag = async (e) => {
    e.preventDefault();
    if (!updatedTagName.trim() || !editingTag) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: updatedTagName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showSuccess('Tag mis à jour avec succès');
      setEditingTag(null);
      setUpdatedTagName('');
      fetchTags();
    } catch {
      showError('Erreur lors de la mise à jour du tag');
    }
  };

  // New function to handle theme deletion
  const handleDeleteTheme = async (themeId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce thème?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/themes/${themeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showSuccess('Thème supprimé avec succès');
      fetchThemes();
      
      // Remove from selected themes if it was selected
      setSelectedThemes(selectedThemes.filter(id => id !== themeId));
    } catch {
      showError('Erreur lors de la suppression du thème');
    }
  };

  // New function to handle tag deletion
  const handleDeleteTag = async (tagId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce tag?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showSuccess('Tag supprimé avec succès');
      fetchTags();
      
      // Remove from selected tags if it was selected
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } catch {
      showError('Erreur lors de la suppression du tag');
    }
  };

  // New function to start editing a theme
  const startEditingTheme = (theme) => {
    setEditingTheme(theme);
    setUpdatedThemeName(theme.name);
  };

  // New function to start editing a tag
  const startEditingTag = (tag) => {
    setEditingTag(tag);
    setUpdatedTagName(tag.name);
  };

const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    // Filter for valid image files
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/heif', 'image/heic'];
      const isValidType = validTypes.includes(file.type);
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      const isValidMinSize = file.size >= 1 * 1024 * 1024; // 1MB minimum
      
      if (!isValidType) {
        showError(`${file.name} n'est pas un format d'image valide`);
        return false;
      }
      if (!isValidMinSize) {
        showError(`Les images ajoutées sont trop petites (minimum 1MB)`);
        return false;
      }
      if (!isValidSize) {
        showError(`${file.name} dépasse la taille limite de 50MB`);
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
    
    // Don't automatically set date - let backend extract from EXIF
    // Only set date if user explicitly selects one in the date picker
    
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    const uploadPromises = selectedFiles.map(async (file, index) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('themes', JSON.stringify(selectedThemes));
      formData.append('tags', JSON.stringify(selectedTags));
      formData.append('country', selectedCountry || '');
      
      // Only send date_taken if user explicitly selected one
      if (selectedDateTaken) {
        formData.append('date_taken', selectedDateTaken);
      }
      
      try {
        const res = await fetch(`${API_BASE}/api/images/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          setUploadProgress(prev => ({ ...prev, [index]: 100 }));
          
          // Show extracted date if available and user didn't manually set one
          if (data.image?.metadata?.date_taken && !selectedDateTaken) {
            const extractedDate = new Date(data.image.metadata.date_taken).toISOString().split('T')[0];
            showSuccess(`Date extraite des métadonnées: ${extractedDate}`);
          }
          
          return { 
            success: true, 
            file: file.name, 
            metadata: data.image?.metadata || null,
            imageId: data.image?.id || null
          };
        } else {
          setUploadProgress(prev => ({ ...prev, [index]: -1 }));
          return { success: false, file: file.name };
        }
      } catch {
        setUploadProgress(prev => ({ ...prev, [index]: -1 }));
        return { success: false, file: file.name };
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length > 0) {
        showSuccess(`${successful.length} image(s) téléversée(s) avec succès${!selectedDateTaken ? ' (dates extraites des métadonnées)' : ''}`);
      }
      
      if (failed.length > 0) {
        showError(`${failed.length} image(s) n'ont pas pu être téléversées`);
      }
      
      setSelectedFiles([]);
      setUploadProgress({});
    } catch {
      showError('Erreur lors du téléversement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="mb-8">
    <h1 className="text-3xl font-bold text-gray-800 mb-2">Téléverser des images</h1>
    <p className="text-gray-600">Ajoutez de nouvelles images à votre collection</p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Main Upload Section */}
    <div className="lg:col-span-2 space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-yellow-400 rounded-full mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Sélectionnez vos images</h3>
          <p className="text-gray-600 mb-6">JPEG, PNG, WebP, TIFF, HEIF, HEIC (Max 50MB, Min 1MB)</p>
          
          <label className="inline-block cursor-pointer">
            <input
              type="file"
              id="file-input"
              accept="image/jpeg,image/png,image/webp,image/tiff,image/heif,image/heic"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              multiple
            />
            <span className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50">
              <Upload className="w-5 h-5" />
              <span>Sélectionner des images</span>
            </span>
          </label>
        </div>
      </div>

      {/* Selected Files Queue */}
      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Images à téléverser ({selectedFiles.length})</h3>
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {uploading ? 'Téléversement en cours...' : `Téléverser ${selectedFiles.length} image(s)`}
            </button>
          </div>
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    {uploadProgress[index] !== undefined && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            uploadProgress[index] === 100 ? 'bg-green-500' : 
                            uploadProgress[index] === -1 ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.abs(uploadProgress[index])}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {uploadProgress[index] === 100 && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {uploadProgress[index] === -1 && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    disabled={uploading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Metadata Sidebar */}
    <div className="space-y-6">
      {/* Country Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-blue-500" />
          Pays
        </h3>
        
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Sélectionner un pays</option>
          {countries.map(country => (
            <option key={country.code} value={country.name}>{country.name}</option>
          ))}
        </select>
      </div>

      {/* Date Taken Override Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-green-500" />
          Date de prise
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de prise (optionnel)
            </label>
            <input
              type="date"
              value={selectedDateTaken}
              onChange={(e) => setSelectedDateTaken(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Sets max date to today
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez vide pour utiliser la date des métadonnées de l'image. Ne peut pas être dans le futur.
            </p>
            {selectedDateTaken && (
              <button
                type="button"
                onClick={() => setSelectedDateTaken('')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Effacer la date et utiliser les métadonnées
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Themes Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Palette className="w-5 h-5 mr-2 text-yellow-500" />
            Thèmes
          </h3>
          <button
            onClick={() => setShowThemeModal(true)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {themes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun thème disponible</p>
          ) : (
            themes.map(theme => (
              <div key={theme.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedThemes.includes(theme.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedThemes([...selectedThemes, theme.id]);
                      } else {
                        setSelectedThemes(selectedThemes.filter(id => id !== theme.id));
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{theme.name}</span>
                </div>
                <div className="flex space-x-1">
                  {user && (user.role === 'admin' || theme.created_by === user.id) && (
                    <>
                      <button
                        onClick={() => startEditingTheme(theme)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded transition"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTheme(theme.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tags Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Tag className="w-5 h-5 mr-2 text-blue-500" />
            Tags
          </h3>
          <button
            onClick={() => setShowTagModal(true)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun tag disponible</p>
          ) : (
            tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags([...selectedTags, tag.id]);
                      } else {
                        setSelectedTags(selectedTags.filter(id => id !== tag.id));
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
                <div className="flex space-x-1">
                  {user && (user.role === 'admin' || tag.created_by === user.id) && (
                    <>
                      <button
                        onClick={() => startEditingTag(tag)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded transition"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>

  {/* Theme Modal */}
  {showThemeModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Ajouter un thème</h3>
        
        <form onSubmit={handleCreateTheme} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du thème</label>
            <input
              type="text"
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Entrez le nom du thème"
              required
            />
          </div>
          
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowThemeModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Tag Modal */}
  {showTagModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Ajouter un tag</h3>
        
        <form onSubmit={handleCreateTag} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du tag</label>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Entrez le nom du tag"
              required
            />
          </div>
          
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowTagModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Edit Theme Modal */}
  {editingTheme && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Modifier le thème</h3>
        
        <form onSubmit={handleUpdateTheme} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du thème</label>
            <input
              type="text"
              value={updatedThemeName}
              onChange={(e) => setUpdatedThemeName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Entrez le nom du thème"
              required
            />
          </div>
          
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingTheme(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition"
            >
              Mettre à jour
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Edit Tag Modal */}
  {editingTag && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Modifier le tag</h3>
        
        <form onSubmit={handleUpdateTag} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du tag</label>
            <input
              type="text"
              value={updatedTagName}
              onChange={(e) => setUpdatedTagName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Entrez le nom du tag"
              required
            />
          </div>
          
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingTag(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition"
            >
              Mettre à jour
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
</div>
  );
};

export default UploadPage;