import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axios';
import PhotoGrid from '../components/PhotoGrid';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ClientGallery = () => {
    const { id } = useParams();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [cart, setCart] = useState([]);

    useEffect(() => {
        fetchGallery();
    }, [id]);

    const fetchGallery = async () => {
        try {
            // Fetch public album info (we might need a specific public endpoint later, but for now using the same)
            const albumRes = await axios.get(`/albums`);
            const currentAlbum = albumRes.data.find(a => a.id === id);
            setAlbum(currentAlbum);

            const photosRes = await axios.get(`/albums/${id}/photos`);
            setPhotos(photosRes.data);
        } catch (error) {
            console.error("Error fetching gallery:", error);
        }
    };

    const handleBuy = (photo) => {
        toast.success(`Added ${photo.filename} to cart!`);
        // Payment integration (Fasa 2) will happen here
        console.log("Buying photo:", photo);
    };

    if (!album) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Gallery...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Header */}
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">ANTIGRAVITY <span className="text-blue-500">COLLECTION</span></h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Client Gallery</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                            <ShoppingBagIcon className="w-6 h-6" />
                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="max-w-3xl mb-16">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">{album.name}</h2>
                    <p className="text-lg text-slate-400 font-light leading-relaxed">{album.description}</p>
                </div>

                {/* Photos Section */}
                <div className="mb-12 flex items-center justify-between border-b border-slate-800 pb-6">
                    <h3 className="text-sm uppercase tracking-widest font-bold text-slate-500">Collection ({photos.length})</h3>
                    <div className="text-xs text-slate-500">Select images to purchase high-resolution versions.</div>
                </div>

                <PhotoGrid photos={photos} onBuy={handleBuy} isClient={true} />

                {photos.length === 0 && (
                    <div className="text-center py-32 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                        <p className="text-slate-500 text-lg">This gallery is currently being curated. Please check back later.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-900 py-12 mt-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-slate-600 text-sm">Powered by Antigravity OS &copy; 2026</p>
                </div>
            </footer>
        </div>
    );
};

export default ClientGallery;
