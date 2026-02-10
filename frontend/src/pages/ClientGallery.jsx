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
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGallery();
    }, [id]);

    const fetchGallery = async () => {
        try {
            const albumRes = await axios.get(`/gallery/albums`);
            const currentAlbum = albumRes.data.find(a => a.id === id);
            setAlbum(currentAlbum);

            const photosRes = await axios.get(`/gallery/albums/${id}/photos`);
            setPhotos(photosRes.data);

            const tiersRes = await axios.get(`/gallery/albums/${id}/tiers`);
            setTiers(tiersRes.data.sort((a, b) => b.quantity - a.quantity));
        } catch (error) {
            console.error("Error fetching gallery:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCart = (photoId) => {
        setCart(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    };

    const calculateTotal = () => {
        let count = cart.length;
        if (count === 0) return 0;

        let total = 0;
        let remaining = count;

        // Apply tiers
        tiers.forEach(tier => {
            if (remaining >= tier.quantity) {
                const numPackages = Math.floor(remaining / tier.quantity);
                total += numPackages * tier.price;
                remaining %= tier.quantity;
            }
        });

        // Remaining at individual prices (assume 15 if not set, but better to use photo.price)
        if (remaining > 0) {
            // Find prices for remaining items from the photos array
            const selectedPhotos = photos.filter(p => cart.includes(p.id));
            // For simplicity, use the last N items' prices
            for (let i = count - remaining; i < count; i++) {
                total += selectedPhotos[i]?.price || 15;
            }
        }

        return total;
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const toastId = toast.loading('Preparing secure checkout...');
        try {
            const res = await axios.post('/gallery/checkout-photos', { photo_ids: cart });
            if (res.data.payment_url) {
                window.location.href = res.data.payment_url;
            }
        } catch (error) {
            toast.error('Checkout failed. Please try again.', { id: toastId });
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

                <PhotoGrid
                    photos={photos}
                    isClient={true}
                    selectedPhotos={cart}
                    onToggleSelect={toggleCart}
                />

                {/* Floating Checkout Bar */}
                {cart.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-blue-600 rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-blue-500/50">
                            <div className="flex items-center gap-4 pl-2">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <ShoppingBagIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg leading-none">{cart.length} Photos Selected</p>
                                    <p className="text-blue-100 text-xs font-medium uppercase tracking-wider mt-1">Total: RM {calculateTotal().toFixed(2)}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCheckout}
                                className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-lg"
                            >
                                Pay Now
                            </button>
                        </div>
                    </div>
                )}

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
