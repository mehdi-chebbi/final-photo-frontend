import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants';
import { Search, ImageIcon, Activity, Upload, ChevronLeft, ChevronRight, Square, Trash2, Calendar } from 'lucide-react';
import ImageComponent from '../components/ImageComponent.jsx';

const MyImagesPage = ({ token, user, showSuccess, showError }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, name, size
  const [selectedImages, setSelectedImages] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  
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
  
  // Get page from URL parameters
  const { page = '1' } = useParams();
  const navigate = useNavigate();
  const currentPage = parseInt(page);

  useEffect(() => {
    fetchImages();
  }, [currentPage]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      // Use the correct endpoint to get all images
      const res = await fetch(`${API_BASE}/api/images`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Filter images to show only those uploaded by the current user
        const myImages = data.images.filter(img => img.uploaded_by_name === user.name);
        setImages(myImages);
        
        // Set up pagination manually since backend doesn't provide it
        const totalImages = myImages.length;
        const totalPages = Math.ceil(totalImages / pagination.limit);
        setPagination(prev => ({
          ...prev,
          total: totalImages,
          totalPages: totalPages
        }));
      }
    } catch {
      showError('Erreur lors du chargement des images');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/images/${imageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      
      showSuccess('Image supprimée avec succès');
      // If we're on the last page and it becomes empty after deletion, go to previous page
      if (images.length === 1 && currentPage > 1) {
        navigate(`/my-images/page/${currentPage - 1}`);
      } else {
        fetchImages();
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.length === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedImages.length} image(s) ?`)) return;
    
    setDownloading(true);
    
    try {
      for (const imageId of selectedImages) {
        const res = await fetch(`${API_BASE}/api/images/${imageId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur lors de la suppression');
      }
      
      showSuccess(`${selectedImages.length} image(s) supprimée(s) avec succès`);
      setSelectedImages([]);
      fetchImages();
    } catch (err) {
      showError(err.message);
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
    if (selectedImages.length === images.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images.map(img => img.id));
    }
  };

  // Sort, filter, and paginate images
  const filteredAndSortedImages = images
    .filter(img => 
      img.original_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.original_name.localeCompare(b.original_name);
      if (sortBy === 'size') return a.size - b.size;
      // Sort by date (using date_taken if available, otherwise created_at)
      return getImageDate(b) - getImageDate(a);
    })
    .slice((currentPage - 1) * pagination.limit, currentPage * pagination.limit);

  // Pagination controls
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages) {
      navigate(`/my-images/page/${pageNumber}`);
    }
  };
  
  const nextPage = () => {
    if (currentPage < pagination.totalPages) {
      navigate(`/my-images/page/${currentPage + 1}`);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      navigate(`/my-images/page/${currentPage - 1}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="text-xl">Chargement...</div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Mes Images</h1>
        <p className="text-gray-600">Gérez votre collection personnelle d'images</p>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Images</p>
              <p className="text-3xl font-bold mt-1">{images.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Espace Utilisé</p>
              <p className="text-3xl font-bold mt-1">
                {(images.reduce((acc, img) => acc + img.size, 0) / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Dernier Téléversement</p>
              <p className="text-xl font-bold mt-1">
                {images.length > 0 ? formatDate(getImageDate(images[0])) : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Images Section with Search and Sort */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <h2 className="text-xl font-bold text-gray-800">Ma Collection ({images.filter(img => img.original_name.toLowerCase().includes(searchTerm.toLowerCase())).length})</h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="date">Trier par date</option>
              <option value="name">Trier par nom</option>
              <option value="size">Trier par taille</option>
            </select>
          </div>
        </div>

        {/* Bulk Selection Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={selectAllImages}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Square className={`w-5 h-5 ${selectedImages.length === images.length && images.length > 0 ? 'fill-current text-blue-500' : ''}`} />
              <span className="text-sm">{selectedImages.length === images.length && images.length > 0 ? 'Désélectionner tout' : 'Sélectionner tout'}</span>
            </button>
            <span className="text-sm text-gray-600">
              {selectedImages.length > 0 ? `${selectedImages.length} image(s) sélectionnée(s)` : 'Aucune image sélectionnée'}
            </span>
          </div>
          
          {selectedImages.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={downloading}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              <span>{downloading ? 'Suppression...' : `Supprimer ${selectedImages.length} image(s)`}</span>
            </button>
          )}
        </div>

        {/* Images Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedImages.map(image => (
            <ImageComponent
              key={image.id}
              image={image}
              token={token}
              handleDownload={null}
              handleDelete={handleDelete}
              showDeleteButton={true}
              isSelected={selectedImages.includes(image.id)}
              onToggleSelect={toggleImageSelection}
              // Pass both dates as props
              takenDate={getTakenDate(image)}
              uploadDate={getUploadDate(image)}
            />
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-700">
              Affichage de {(currentPage - 1) * pagination.limit + 1} à {Math.min(currentPage * pagination.limit, pagination.total)} sur {pagination.total} images
            </div>
            <div className="flex space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let page;
                  if (pagination.totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    page = pagination.totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`w-8 h-8 rounded-full ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={nextPage}
                disabled={currentPage === pagination.totalPages}
                className={`px-3 py-1 rounded-md ${currentPage === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {filteredAndSortedImages.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'Aucune image trouvée' : 'Aucune image téléversée'}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {searchTerm ? 'Essayez une autre recherche' : 'Commencez par téléverser votre première image'}
            </p>
            <Link
              to="/upload"
              className="mt-4 inline-flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
            >
              <Upload className="w-5 h-5" />
              <span>Téléverser des images</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyImagesPage;