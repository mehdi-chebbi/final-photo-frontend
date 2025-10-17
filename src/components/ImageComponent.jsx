import React, { useState, useEffect } from 'react';
import { API_BASE } from '../constants';
import { 
  Download, Trash2, Square, ImageIcon, Calendar
} from 'lucide-react';

const ImageComponent = ({ 
  image, 
  token, 
  handleDownload, 
  handleDelete, 
  showDeleteButton = true, 
  isSelected = false, 
  onToggleSelect = null,
  takenDate = null,
  uploadDate = null
}) => {
  const [imageSrc, setImageSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchImage();
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [image.id]);

  const fetchImage = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/images/${image.id}/preview?width=400&quality=70`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur lors du chargement de l\'image');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImageSrc(url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <ImageIcon className="w-16 h-16 text-gray-400" />
          </div>
        )}
        {!loading && !error && imageSrc && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img 
              src={imageSrc} 
              alt={image.original_name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
        {onToggleSelect && (
          <div className="absolute top-2 left-2">
            <button
              onClick={() => onToggleSelect(image.id)}
              className={`p-2 rounded-full ${isSelected ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'} shadow-md`}
            >
              <Square className={`w-5 h-5 ${isSelected ? 'fill-current' : ''}`} />
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-gray-800 truncate mb-1">{image.original_name}</h4>
        <p className="text-sm text-gray-500 mb-3">Par {image.uploaded_by_name || 'Utilisateur supprimé'}</p>
        
        {/* Date display section */}
        <div className="text-sm text-gray-600 mb-3">
          {takenDate ? (
            <>
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                <span className="font-medium">Date de prise:</span>
                <span className="ml-1">{takenDate}</span>
              </div>
              <div className="flex items-center mt-1">
                <Calendar className="w-3 h-3 mr-1" />
                <span className="font-medium">Date de téléversement:</span>
                <span className="ml-1">{uploadDate}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              <span className="font-medium">Date de téléversement:</span>
              <span className="ml-1">{uploadDate}</span>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600 space-y-1 mb-3">
          <p>{image.width} × {image.height}px</p>
          <p>{(image.size / 1024).toFixed(2)} KB</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => handleDownload(image.id, image.original_name)}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger</span>
          </button>
          {showDeleteButton && (
            <button
              onClick={() => handleDelete(image.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageComponent;