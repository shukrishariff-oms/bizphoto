import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { ArrowLeftIcon, CloudArrowUpIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import PhotoGrid from '../components/PhotoGrid';
import toast from 'react-hot-toast';

const GalleryDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]); // { name, status: 'pending'|'uploading'|'success'|'error' }
    const [price, setPrice] = useState(50.00);
    const [user, setUser] = useState(null);
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [tiers, setTiers] = useState([]);
    const [newTier, setNewTier] = useState({ quantity: 3, price: 40 });
    const [showTierForm, setShowTierForm] = useState(false);

    useEffect(() => {
        fetchAlbumDetails();
        fetchUser();
        fetchTiers();
    }, [id]);

    const fetchTiers = async () => {
        try {
            const res = await axios.get(`/gallery/albums/${id}/tiers`);
            setTiers(res.data);
        } catch (error) {
            console.error("Error fetching tiers:", error);
        }
    };

    const fetchUser = async () => {
        try {
            const res = await axios.get('/auth/me');
            setUser(res.data);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    const fetchAlbumDetails = async () => {
        try {
            const albumRes = await axios.get('/gallery/albums');
            const currentAlbum = albumRes.data.find(a => a.id === id);
            setAlbum(currentAlbum);

            const photosRes = await axios.get(`/gallery/albums/${id}/photos`);
            console.log("Fetched photos for album:", id, photosRes.data);
            setPhotos(photosRes.data);
        } catch (error) {
            console.error("Error fetching album details:", error);
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setUploading(true);
        // Initialize queue
        const initialQueue = files.map(f => ({ name: f.name, status: 'pending' }));
        setUploadQueue(initialQueue);

        const toastId = toast.loading('Uploading photos...');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Update status to uploading
                setUploadQueue(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'uploading' } : item
                ));

                const formData = new FormData();
                formData.append('file', file);
                formData.append('price', price);

                try {
                    await axios.post(`/gallery/albums/${id}/photos`, formData);
                    // Update status to success
                    setUploadQueue(prev => prev.map((item, idx) =>
                        idx === i ? { ...item, status: 'success' } : item
                    ));
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err);
                    setUploadQueue(prev => prev.map((item, idx) =>
                        idx === i ? { ...item, status: 'error' } : item
                    ));
                }
            }

            const successCount = uploadQueue.filter(f => f.status === 'success').length;
            toast.success(`Upload complete!`, { id: toastId });
            fetchAlbumDetails();

            // Clear queue after a delay
            setTimeout(() => {
                setUploadQueue([]);
                setUploading(false);
            }, 3000);

        } catch (error) {
            toast.error('Upload process encountered errors', { id: toastId });
            setUploading(false);
        }
    };

    const handleToggleSelect = (photoId) => {
        setSelectedPhotos(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    };

    const handleSelectAll = () => {
        if (selectedPhotos.length === photos.length) {
            setSelectedPhotos([]);
        } else {
            setSelectedPhotos(photos.map(p => p.id));
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedPhotos.length) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedPhotos.length} photos?`)) return;

        const toastId = toast.loading(`Deleting ${selectedPhotos.length} photos...`);
        try {
            await axios.post('/gallery/photos/bulk-delete', selectedPhotos);
            toast.success('Photos deleted successfully', { id: toastId });
            setSelectedPhotos([]);
            fetchAlbumDetails();
        } catch (error) {
            toast.error('Failed to delete photos', { id: toastId });
            console.error("Delete error:", error);
        }
    };

    const handleAddTier = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('quantity', newTier.quantity);
        formData.append('price', newTier.price);

        try {
            await axios.post(`/gallery/albums/${id}/tiers`, formData);
            toast.success('Pricing tier added');
            setShowTierForm(false);
            fetchTiers();
        } catch (error) {
            toast.error('Failed to add tier');
        }
    };

    const handleDeleteTier = async (tierId) => {
        if (!window.confirm('Delete this pricing tier?')) return;
        try {
            await axios.delete(`/gallery/tiers/${tierId}`);
            toast.success('Tier deleted');
            fetchTiers();
        } catch (error) {
            toast.error('Failed to delete tier');
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'photographer';

    if (!album) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="p-6">
            <button
                onClick={() => navigate('/galleries')}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Galleries
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-3xl font-bold text-white">{album.name}</h1>
                        {isAdmin && (
                            <span className="bg-blue-900/40 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-800/50 flex items-center gap-1 font-medium">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                Admin Mode
                            </span>
                        )}
                    </div>
                    <p className="text-slate-400">{album.description}</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Set Price (RM)</label>
                        <input
                            type="number"
                            className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-white w-24 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-all ${uploading ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'}`}>
                        <CloudArrowUpIcon className="w-5 h-5" />
                        {uploading ? 'Uploading...' : 'Upload Photos'}
                        <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*" />
                    </label>
                </div>
            </div>

            {/* Upload Progress Section */}
            {uploadQueue.length > 0 && (
                <div className="mb-8 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Upload Progress</h3>
                        <span className="text-xs text-slate-400 font-mono">
                            {uploadQueue.filter(f => f.status === 'success').length} / {uploadQueue.length} Done
                        </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-4 space-y-2">
                        {uploadQueue.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="flex-shrink-0">
                                        {file.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-transparent"></div>}
                                        {file.status === 'uploading' && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>}
                                        {file.status === 'success' && <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div></div>}
                                        {file.status === 'error' && <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div></div>}
                                    </div>
                                    <span className="text-sm text-slate-300 truncate font-medium">{file.name}</span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${file.status === 'success' ? 'text-green-400 bg-green-400/10' :
                                        file.status === 'error' ? 'text-red-400 bg-red-400/10' :
                                            file.status === 'uploading' ? 'text-blue-400 bg-blue-400/10 animate-pulse' :
                                                'text-slate-500 bg-slate-500/10'
                                    }`}>
                                    {file.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="mb-8 bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <span className="bg-yellow-500/10 text-yellow-500 p-1.5 rounded-lg border border-yellow-500/20">
                                <TrashIcon className="w-4 h-4" />
                            </span>
                            Quantity-Based Pricing (Packages)
                        </h2>
                        <button
                            onClick={() => setShowTierForm(!showTierForm)}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {showTierForm ? 'Cancel' : '+ Add Package'}
                        </button>
                    </div>

                    {showTierForm && (
                        <form onSubmit={handleAddTier} className="mb-6 flex flex-wrap gap-4 items-end bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Quantity (e.g., 3)</label>
                                <input
                                    type="number"
                                    required
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newTier.quantity}
                                    onChange={(e) => setNewTier({ ...newTier, quantity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1 font-medium">Package Price (RM)</label>
                                <input
                                    type="number"
                                    required
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white w-40 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newTier.price}
                                    onChange={(e) => setNewTier({ ...newTier, price: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/20">
                                Save Package
                            </button>
                        </form>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {tiers.map((tier) => (
                            <div key={tier.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex justify-between items-center group">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Package for</div>
                                    <div className="text-white font-bold">{tier.quantity} Photos</div>
                                    <div className="text-blue-400 text-xl font-black">RM {tier.price}</div>
                                </div>
                                <button
                                    onClick={() => handleDeleteTier(tier.id)}
                                    className="text-slate-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        {tiers.length === 0 && !showTierForm && (
                            <div className="col-span-full py-6 text-center text-slate-500 text-sm italic bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                                No specific packages set yet. Images will be sold at RM {price} each.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-white">Album Photos ({photos.length})</h2>
                    {isAdmin && photos.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                            <button
                                onClick={handleSelectAll}
                                className="text-xs font-medium text-slate-300 hover:text-white px-2 py-1 rounded transition-colors"
                            >
                                {selectedPhotos.length === photos.length ? 'Unselect All' : 'Select All'}
                            </button>
                            {selectedPhotos.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold px-2 py-1 rounded transition-all border border-red-500/30"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                    Delete {selectedPhotos.length}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => window.open(`/gallery/${id}`, '_blank')}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium underline inline-flex items-center gap-1"
                >
                    View Public Gallery
                </button>
            </div>

            <PhotoGrid
                photos={photos}
                isClient={false}
                isAdmin={isAdmin}
                selectedPhotos={selectedPhotos}
                onToggleSelect={handleToggleSelect}
            />

            {photos.length === 0 && !uploading && (
                <div className="text-center py-20 bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-700">
                    <PhotoIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">No photos in this album yet. Start by uploading some!</p>
                </div>
            )}
        </div>
    );
};

export default GalleryDetails;
