import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';

const GalleryList = () => {
    const [albums, setAlbums] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newAlbum, setNewAlbum] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchAlbums();
    }, []);

    const fetchAlbums = async () => {
        try {
            const response = await axios.get('/albums');
            setAlbums(response.data);
        } catch (error) {
            console.error("Error fetching albums:", error);
        }
    };

    const handleCreateAlbum = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', newAlbum.name);
        formData.append('description', newAlbum.description);

        try {
            await axios.post('/albums', formData);
            setShowModal(false);
            setNewAlbum({ name: '', description: '' });
            fetchAlbums();
        } catch (error) {
            console.error("Error creating album:", error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Galleries</h1>
                    <p className="text-slate-400">Manage your photo albums and client sales.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Album
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {albums.map((album) => (
                    <div key={album.id} className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-slate-600 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <PhotoIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-lg">{album.name}</h3>
                                <p className="text-slate-400 text-sm line-clamp-1">{album.description}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 mt-4 border-t border-slate-700 pt-4">
                            <span>RM 0.00 Total Sales</span>
                            <span className="bg-slate-700/50 px-2 py-1 rounded text-slate-300">0 Photos</span>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-6">Create New Album</h2>
                        <form onSubmit={handleCreateAlbum} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Album Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newAlbum.name}
                                    onChange={(e) => setNewAlbum({ ...newAlbum, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                <textarea
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                    value={newAlbum.description}
                                    onChange={(e) => setNewAlbum({ ...newAlbum, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GalleryList;
