import React from 'react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

const PhotoGrid = ({ photos, onBuy, isClient = true, selectedPhotos = [], onToggleSelect, isAdmin = false }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => {
                const isSelected = selectedPhotos.includes(photo.id);
                return (
                    <div
                        key={photo.id}
                        className={`group relative bg-slate-800 rounded-xl overflow-hidden border transition-all shadow-lg ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-700 hover:border-slate-500'
                            }`}
                    >
                        {/* Admin Selection Checkbox */}
                        {isAdmin && (
                            <div className="absolute top-3 left-3 z-10">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggleSelect(photo.id)}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer shadow-xl"
                                />
                            </div>
                        )}

                        <div
                            className="aspect-[3/2] overflow-hidden cursor-pointer"
                            onClick={() => isAdmin && onToggleSelect(photo.id)}
                        >
                            <img
                                src={`/uploads/gallery/${photo.album_id}/watermarked/${photo.filename}`}
                                alt={photo.filename}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-4 flex items-center justify-between bg-slate-800/80 backdrop-blur-sm">
                            <div>
                                <p className="text-slate-400 text-xs">RM {photo.price?.toFixed(2)}</p>
                            </div>
                            {isClient && (
                                <button
                                    onClick={() => onBuy(photo)}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <ShoppingCartIcon className="w-4 h-4" />
                                    Buy Now
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PhotoGrid;
