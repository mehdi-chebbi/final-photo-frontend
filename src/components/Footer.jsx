import React from 'react';
import { Camera } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-800" />
              </div>
              <span className="text-xl font-bold">PhotoApp</span>
            </div>
            <p className="text-blue-200 text-sm mt-1">© 2023 Tous droits réservés</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-blue-200 hover:text-white transition">À propos</a>
            <a href="#" className="text-blue-200 hover:text-white transition">Contact</a>
            <a href="#" className="text-blue-200 hover:text-white transition">Politique de confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;