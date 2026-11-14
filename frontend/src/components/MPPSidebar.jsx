import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function MPPSidebar({ isMobileMenuOpen, setIsMobileMenuOpen, setIsProfileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    sessionStorage.removeItem('intended_portal');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      setLoggingOut(false);
      return;
    }
    setTimeout(() => window.location.replace('/login'), 600);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-[220px] bg-[#7A1F3D] text-white flex flex-col justify-between shrink-0 h-full transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          <div className="px-6 pt-6 pb-4 flex justify-between items-center">
            <div>
              <h1 className="text-[22px] font-bold">SUBook</h1>
              <p className="text-[#E9C7D3] text-xs">MPP Admin</p>
            </div>
            <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <nav className="flex flex-col mt-4">
            <button 
              onClick={() => navigate('/mpp-dashboard')} 
              className={`text-left px-6 py-4 text-sm transition-colors cursor-pointer w-full ${
                isActive('/mpp-dashboard') ? 'bg-[#5E1730] font-semibold' : 'hover:bg-[#5E1730]'
              }`}
            >
              Dashboard
            </button>
            
            <button 
              onClick={() => navigate('/mpp-dashboard/requests')} 
              className={`text-left px-6 py-4 text-sm transition-colors cursor-pointer w-full ${
                isActive('/mpp-dashboard/requests') ? 'bg-[#5E1730] font-semibold' : 'hover:bg-[#5E1730]'
              }`}
            >
              My Approval
            </button>

            {/* ADDED ALL BOOKINGS HERE */}
            <button 
              onClick={() => navigate('/mpp-dashboard/bookings')} 
              className={`text-left px-6 py-4 text-sm transition-colors cursor-pointer w-full ${
                isActive('/mpp-dashboard/bookings') ? 'bg-[#5E1730] font-semibold' : 'hover:bg-[#5E1730]'
              }`}
            >
              All Bookings
            </button>
            
            <button className="text-left px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors cursor-pointer w-full">
              Calendar
            </button>
            <button className="text-left px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors cursor-pointer w-full">
              Venue Management
            </button>
            <button className="text-left px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors cursor-pointer w-full">
              Transaction History
            </button>
            <button className="text-left px-6 py-4 text-sm hover:bg-[#5E1730] transition-colors cursor-pointer w-full">
              Reports & Analytics
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-[#5E1730] flex flex-col gap-4">
          <button
            onClick={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }}
            className="text-left text-sm font-semibold hover:text-[#E9C7D3] transition-colors cursor-pointer"
          >
            Profile Settings
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 text-left text-sm font-semibold hover:text-[#E9C7D3] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loggingOut && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {loggingOut ? 'Logging out…' : 'Log Out'}
          </button>
        </div>
      </aside>
    </>
  );
}