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
    const [price, setPrice] = useState(50.00);
    const [user, setUser] = useState(null);
    const [selectedPhotos, setSelectedPhotos] = useState([]);

    useEffect(() => {
        fetchAlbumDetails();
        fetchUser();
    }, [id]);

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
        const files = e.target.files;
        if (!files.length) return;

        setUploading(true);
        const toastId = toast.loading('Uploading photos and applying watermarks...');

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('price', price);
                await axios.post(`/gallery/albums/${id}/photos`, formData);
            }
            toast.success('Upload complete!', { id: toastId });
            fetchAlbumDetails();
        } catch (error) {
            toast.error('Upload failed', { id: toastId });
            console.error("Upload error:", error);
        } finally {
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
