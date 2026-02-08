import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
    return (
        <div className="min-h-screen bg-[#233D4C] font-inter text-slate-100 antialiased selection:bg-[#FD802E] selection:text-[#233D4C]">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-[#233D4C]/80 backdrop-blur-md border-b border-white/5 z-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FD802E] to-rose-500 flex items-center justify-center font-bold text-white shadow-lg shadow-[#FD802E]/20">
                        B
                    </div>
                    <span className="font-outfit font-bold text-lg tracking-tight">BizPhoto</span>
                </div>
            </header>

            {/* Content Content - Centered */}
            <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto w-full">
                <Outlet />
            </main>
        </div>
    );
};

export default PublicLayout;
