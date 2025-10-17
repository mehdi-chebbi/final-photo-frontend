import React, { useState, useEffect } from 'react';
import { API_BASE } from '../constants';
import { 
  Search, ImageIcon, Download, Square, ChevronLeft, ChevronRight, Camera, MapPin, Calendar
} from 'lucide-react';
import ImageComponent from '../components/ImageComponent.jsx';
import Swal from 'sweetalert2';

const Gallery = ({ token, showSuccess, showError }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, name, size, uploader, similarity
  const [filterTheme, setFilterTheme] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [themes, setThemes] = useState([]);
  const [tags, setTags] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 12;

  // Metadata filter states
  const [filterCameraMake, setFilterCameraMake] = useState('');
  const [filterCameraModel, setFilterCameraModel] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterFocalLengthMin, setFilterFocalLengthMin] = useState('');
  const [filterFocalLengthMax, setFilterFocalLengthMax] = useState('');
  const [filterIsoMin, setFilterIsoMin] = useState('');
  const [filterIsoMax, setFilterIsoMax] = useState('');
  
  // Available metadata options
  const [cameraMakes, setCameraMakes] = useState([]);
  const [cameraModels, setCameraModels] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Helper function to get the appropriate date (date_taken if available, otherwise created_at)
  const getImageDate = (image) => {
    if (image.date_taken) {
      return new Date(image.date_taken);
    }
    return new Date(image.created_at);
  };
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get formatted taken date if available
  const getTakenDate = (image) => {
    if (image.date_taken) {
      return formatDate(new Date(image.date_taken));
    }
    return null;
  };
  
  // Get formatted upload date
  const getUploadDate = (image) => {
    return formatDate(new Date(image.created_at));
  };

  useEffect(() => {
    fetchImages();
    fetchThemes();
    fetchTags();
    fetchMetadataFilters();
  }, []);

  // Extract unique countries from images
  const extractUniqueCountries = (imagesList) => {
    const uniqueCountries = new Set();
    imagesList.forEach(image => {
      if (image.country) {
        uniqueCountries.add(image.country);
      }
    });
    return Array.from(uniqueCountries).sort();
  };

  // Update countries when images are fetched
  useEffect(() => {
    if (images.length > 0) {
      const uniqueCountries = extractUniqueCountries(images);
      setCountries(uniqueCountries.map(country => ({ name: country, code: country.replace(/\s+/g, '_') })));
    }
  }, [images]);

  // Reset to first page when filters or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, filterTheme, filterTag, filterCountry, 
      filterCameraMake, filterCameraModel, filterLocation, filterDateFrom, filterDateTo,
      filterFocalLengthMin, filterFocalLengthMax, filterIsoMin, filterIsoMax]);

  const fetchImages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/images`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setImages(data.images);
        // Extract unique countries from fetched images
        const uniqueCountries = extractUniqueCountries(data.images);
        setCountries(uniqueCountries.map(country => ({ name: country, code: country.replace(/\s+/g, '_') })));
      }
    } catch {
      showError('Erreur lors du chargement des images');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchMetadataFilters = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/metadata/filters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCameraMakes(data.camera_makes || []);
        setCameraModels(data.camera_models || []);
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des filtres de métadonnées:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchImages();
      setIsSemanticSearch(false);
      return;
    }

    // Check if we have metadata filters that would require metadata search
    const hasMetadataFilters = filterCameraMake || filterCameraModel || filterLocation || 
                              filterDateFrom || filterDateTo || filterFocalLengthMin || filterFocalLengthMax ||
                              filterIsoMin || filterIsoMax;

    if (hasMetadataFilters) {
      // Use metadata search when metadata filters are applied
      await performMetadataSearch();
      return;
    }

    // Try semantic search first
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/images/clip-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchTerm,
          top_k: 100 // Get more results for better filtering
        })
      });
      
      const data = await res.json();
      if (res.ok && data.results.length > 0) {
        setImages(data.results);
        // Extract unique countries from semantic search results
        const uniqueCountries = extractUniqueCountries(data.results);
        setCountries(uniqueCountries.map(country => ({ name: country, code: country.replace(/\s+/g, '_') })));
        setIsSemanticSearch(true);
      } else {
        // If semantic search returns no results, fall back to metadata search
        await performMetadataSearch();
      }
    } catch (err) {
      // If semantic search fails, fall back to metadata search
      console.error('Semantic search failed, falling back to metadata search:', err);
      await performMetadataSearch();
    } finally {
      setSearching(false);
    }
  };

  const performMetadataSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterTheme) params.append('theme', filterTheme);
      if (filterTag) params.append('tag', filterTag);
      if (filterCountry) params.append('country', filterCountry);
      if (filterCameraMake) params.append('camera_make', filterCameraMake);
      if (filterCameraModel) params.append('camera_model', filterCameraModel);
      if (filterLocation) params.append('location', filterLocation);
      if (filterDateFrom) params.append('date_from', filterDateFrom);
      if (filterDateTo) params.append('date_to', filterDateTo);
      if (filterFocalLengthMin) params.append('focal_length_min', filterFocalLengthMin);
      if (filterFocalLengthMax) params.append('focal_length_max', filterFocalLengthMax);
      if (filterIsoMin) params.append('iso_min', filterIsoMin);
      if (filterIsoMax) params.append('iso_max', filterIsoMax);

      const res = await fetch(`${API_BASE}/api/images/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (res.ok) {
        setImages(data.images);
        // Extract unique countries from search results
        const uniqueCountries = extractUniqueCountries(data.images);
        setCountries(uniqueCountries.map(country => ({ name: country, code: country.replace(/\s+/g, '_') })));
        setIsSemanticSearch(false);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Metadata search failed:', err);
      showError('Erreur lors de la recherche');
      setImages([]);
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (imageId, originalName) => {
    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Confirmer le téléchargement',
      text: `Voulez-vous télécharger "${originalName}" ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui',
      cancelButtonText: 'Non'
    });

    if (!result.isConfirmed) {
      return; // User cancelled
    }

    try {
      const res = await fetch(`${API_BASE}/api/images/${imageId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur lors du téléchargement');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccess('Image téléchargée avec succès');
    } catch (err) {
      showError(err.message);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImages.length === 0) return;
    
    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Confirmer le téléchargement',
      text: `Voulez-vous télécharger ${selectedImages.length} image(s) ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui',
      cancelButtonText: 'Non'
    });

    if (!result.isConfirmed) {
      return; // User cancelled
    }
    
    setDownloading(true);
    
    try {
      // Show SweetAlert2 with spinner
      Swal.fire({
        title: 'Téléchargement en cours',
        html: 'Veuillez patienter pendant que nous préparons votre fichier...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const folderName = `photo_telechargé_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
      
      // Use fetch with progress tracking
      const response = await fetch(`${API_BASE}/api/images/bulk-download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageIds: selectedImages
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        Swal.close();
        showError(errorData.error || 'Erreur lors du téléchargement des images');
        return;
      }
      
      // Get the content disposition header to extract the filename
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${folderName}.zip`;
      
      // Get the reader from the response body
      const reader = response.body.getReader();
      let chunks = [];
      
      // Read the data in chunks
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
      }
      
      // Create a blob from all the chunks
      const blob = new Blob(chunks, { type: 'application/zip' });
      
      // Create a download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Close the SweetAlert2 dialog
      Swal.close();
      
      showSuccess(`${selectedImages.length} image(s) téléchargée(s) avec succès dans le fichier ${filename}`);
      setSelectedImages([]);
    } catch (err) {
      console.error('Download error:', err);
      // Close the SweetAlert2 dialog
      Swal.close();
      showError('Erreur lors de la création du fichier zip');
    } finally {
      setDownloading(false);
    }
  };

  const toggleImageSelection = (imageId) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  const selectAllImages = () => {
    if (selectedImages.length === filteredAndSortedImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredAndSortedImages.map(img => img.id));
    }
  };

  // Sort and filter images
  const filteredAndSortedImages = images
    .filter(img => {
      // Filter out low similarity scores for semantic search (below 20%)
      if (isSemanticSearch && img.similarity !== undefined && img.similarity < 0.15) {
        return false;
      }
      
      // If we're doing a semantic search, don't apply additional text filtering
      const matchesSearch = isSemanticSearch || !searchTerm || 
        img.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (img.uploaded_by_name && img.uploaded_by_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTheme = !filterTheme || 
        (img.themes && img.themes.some(theme => theme.id == filterTheme));
      
      const matchesTag = !filterTag || 
        (img.tags && img.tags.some(tag => tag.id == filterTag));
      
      const matchesCountry = !filterCountry || 
        (img.country && img.country === filterCountry);
      
      return matchesSearch && matchesTheme && matchesTag && matchesCountry;
    })
    .sort((a, b) => {
      // For semantic search, use similarity score if available
      if (isSemanticSearch && a.similarity !== undefined && b.similarity !== undefined) {
        return b.similarity - a.similarity;
      }
      
      if (sortBy === 'name') return a.original_name.localeCompare(b.original_name);
      if (sortBy === 'size') return a.size - b.size;
      if (sortBy === 'uploader') {
        const nameA = a.uploaded_by_name || '';
        const nameB = b.uploaded_by_name || '';
        return nameA.localeCompare(nameB);
      }
      // Sort by date (using date_taken if available, otherwise created_at)
      return getImageDate(b) - getImageDate(a);
    });

  // Pagination logic
  const indexOfLastImage = currentPage * imagesPerPage;
  const indexOfFirstImage = indexOfLastImage - imagesPerPage;
  const currentImages = filteredAndSortedImages.slice(indexOfFirstImage, indexOfLastImage);
  const totalPages = Math.ceil(filteredAndSortedImages.length / imagesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Handle search term and filter changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim() || 
          filterCameraMake || filterCameraModel || filterLocation || 
          filterDateFrom || filterDateTo || filterFocalLengthMin || filterFocalLengthMax ||
          filterIsoMin || filterIsoMax) {
        handleSearch();
      } else if (!searchTerm.trim() && isSemanticSearch) {
        // If search term is cleared and we were in semantic search mode, reset to all images
        fetchImages();
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [searchTerm, filterCameraMake, filterCameraModel, filterLocation, 
      filterDateFrom, filterDateTo, filterFocalLengthMin, filterFocalLengthMax,
      filterIsoMin, filterIsoMax]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="text-xl">Chargement...</div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Galerie d'images</h1>
        <p className="text-gray-600">Parcourez toutes les images partagées</p>
      </div>

      {/* Search and Sort Bar */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <select
            value={filterTheme}
            onChange={(e) => setFilterTheme(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Tous les thèmes</option>
            {themes.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
          
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Tous les tags</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Tous les pays</option>
            {countries.length > 0 ? (
              countries.map(country => (
                <option key={country.code} value={country.name}>{country.name}</option>
              ))
            ) : (
              <option value="" disabled>Aucun pays disponible</option>
            )}
          </select>
        </div>
        
        {/* Advanced Filters Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition"
          >
            <span className="text-sm font-medium">
              {showAdvancedFilters ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés'}
            </span>
          </button>
        </div>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="border-t pt-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Camera Make Filter */}
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterCameraMake}
                  onChange={(e) => setFilterCameraMake(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Tous les appareils</option>
                  {cameraMakes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>

              {/* Camera Model Filter */}
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterCameraModel}
                  onChange={(e) => setFilterCameraModel(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Tous les modèles</option>
                  {cameraModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">Toutes les localisations</option>
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* Date Range Filters */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Date de début"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Date de fin"
                />
              </div>

              {/* Focal Length Range */}
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filterFocalLengthMin}
                  onChange={(e) => setFilterFocalLengthMin(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Min mm"
                />
                <input
                  type="number"
                  value={filterFocalLengthMax}
                  onChange={(e) => setFilterFocalLengthMax(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Max mm"
                />
              </div>

              {/* ISO Range */}
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filterIsoMin}
                  onChange={(e) => setFilterIsoMin(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Min ISO"
                />
                <input
                  type="number"
                  value={filterIsoMax}
                  onChange={(e) => setFilterIsoMax(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Max ISO"
                />
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterCameraMake('');
                    setFilterCameraModel('');
                    setFilterLocation('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterFocalLengthMin('');
                    setFilterFocalLengthMax('');
                    setFilterIsoMin('');
                    setFilterIsoMax('');
                  }}
                  className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition text-sm"
                >
                  Effacer les filtres
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="date">Trier par date</option>
            <option value="name">Trier par nom</option>
            <option value="size">Trier par taille</option>
            <option value="uploader">Trier par utilisateur</option>
          </select>
          
          {/* Bulk Selection Controls */}
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={selectAllImages}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Square className={`w-5 h-5 ${selectedImages.length === filteredAndSortedImages.length && filteredAndSortedImages.length > 0 ? 'fill-current text-blue-500' : ''}`} />
              <span>{selectedImages.length === filteredAndSortedImages.length && filteredAndSortedImages.length > 0 ? 'Désélectionner tout' : 'Sélectionner tout'}</span>
            </button>
            <span className="text-sm text-gray-600">
              {selectedImages.length > 0 ? `${selectedImages.length} image(s) sélectionnée(s)` : 'Aucune image sélectionnée'}
            </span>
            
            {selectedImages.length > 0 && (
              <button
                onClick={handleBulkDownload}
                disabled={downloading}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>{downloading ? 'Téléchargement...' : `Télécharger ${selectedImages.length} image(s)`}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Searching indicator */}
      {searching && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-blue-700">Recherche en cours...</span>
        </div>
      )}

      {/* Search type indicator */}
      {(searchTerm || filterCameraMake || filterCameraModel || filterLocation || 
        filterDateFrom || filterDateTo || filterFocalLengthMin || filterFocalLengthMax ||
        filterIsoMin || filterIsoMax) && !searching && (
        <div className={`rounded-lg p-4 mb-6 flex items-center ${
          isSemanticSearch 
            ? 'bg-purple-50 border border-purple-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`w-3 h-3 rounded-full mr-3 ${
            isSemanticSearch ? 'bg-purple-500' : 'bg-blue-500'
          }`}></div>
          <span className={
            isSemanticSearch ? 'text-purple-700' : 'text-blue-700'
          }>
            {isSemanticSearch 
              ? `Recherche IA pour "${searchTerm}" - ${filteredAndSortedImages.length} résultat(s)` 
              : `Recherche avancée - ${filteredAndSortedImages.length} résultat(s)`
            }
          </span>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentImages.map(image => (
          <ImageComponent
            key={image.id}
            image={image}
            token={token}
            handleDownload={handleDownload}
            handleDelete={null}
            showDeleteButton={false}
            isSelected={selectedImages.includes(image.id)}
            onToggleSelect={toggleImageSelection}
            // Pass both dates as props
            takenDate={getTakenDate(image)}
            uploadDate={getUploadDate(image)}
          />
        ))}
      </div>

      {filteredAndSortedImages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            {searchTerm || filterTheme || filterTag || filterCountry || 
             filterCameraMake || filterCameraModel || filterLocation || 
             filterDateFrom || filterDateTo || filterFocalLengthMin || filterFocalLengthMax ||
             filterIsoMin || filterIsoMax ? 'Aucune image trouvée' : 'Aucune image disponible'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {searchTerm || filterTheme || filterTag || filterCountry || 
             filterCameraMake || filterCameraModel || filterLocation || 
             filterDateFrom || filterDateTo || filterFocalLengthMin || filterFocalLengthMax ||
             filterIsoMin || filterIsoMax ? 'Essayez d\'ajuster vos filtres' : 'Les images apparaîtront ici une fois téléversées'}
          </p>
        </div>
      ) : (
        // Pagination Controls
        totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 bg-white rounded-xl shadow-lg p-4">
            <div className="text-sm text-gray-700">
              Affichage de <span className="font-medium">{indexOfFirstImage + 1}</span> à{' '}
              <span className="font-medium">
                {Math.min(indexOfLastImage, filteredAndSortedImages.length)}
              </span>{' '}
              sur <span className="font-medium">{filteredAndSortedImages.length}</span> images
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`flex items-center px-3 py-1 rounded-lg ${
                  currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && page - array[index - 1] > 1 && (
                        <span className="px-2 py-1 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => paginate(page)}
                        className={`w-8 h-8 rounded-full ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center px-3 py-1 rounded-lg ${
                  currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Gallery;