import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function TopNavbar({ role, onProfileOpen }) {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    if (activeDropdown === name) setActiveDropdown(null);
    else setActiveDropdown(name);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    sessionStorage.removeItem('intended_portal');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error.message);
      setLoggingOut(false);
      return;
    }

    setTimeout(() => {
      window.location.replace('/login');
    }, 600);
  };

  const isStudent = role === 'student';
  const isClub = role === 'club_representative';
  const homePath = isStudent ? '/student-dashboard' : '/club-dashboard';
  const homeLabel = isStudent ? 'Home' : 'Dashboard';
  const faqPath = isStudent ? '/student-faq' : '/club-faq';
  const roleLabel = isStudent ? 'Student' : 'Club Rep';

  const checkActive = (path) => {
    if (path === homePath) return location.pathname === homePath;
    if (path === faqPath) return location.pathname === faqPath;
    return location.pathname.startsWith(path);
  };

  return (
    // ADDED: sticky top-0
    <header className="w-full bg-white border-b border-[#E3DEE0] h-16 flex items-center justify-between px-6 md:px-12 shrink-0 sticky top-0 z-50 font-inter" ref={navRef}>

      <div className="flex items-center gap-4 md:gap-24">
        <button
          className="md:hidden text-[#1F1A1C] p-2 -ml-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>

        <div onClick={() => navigate(homePath)} className="cursor-pointer">
          <h1 className="text-[#7A1F3D] text-[22px] font-bold">SUBook</h1>
        </div>

        <nav className="hidden md:flex gap-16 text-sm font-semibold text-[#1F1A1C]">
          
          {/* Home/Dashboard Link */}
          <button 
            onClick={() => navigate(homePath)} 
            className={`py-4 cursor-pointer transition-colors ${checkActive(homePath) ? "text-[#7A1F3D]" : "hover:text-[#7A1F3D]"}`}
          >
            {homeLabel}
          </button>

          {/* Venue & Booking Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('venue')} 
              className={`flex items-center gap-1 py-4 cursor-pointer transition-colors ${
                location.pathname.startsWith('/venues') || location.pathname.startsWith('/booking-request') || activeDropdown === 'venue' ? "text-[#7A1F3D]" : "hover:text-[#7A1F3D]"
              }`}
            >
              Venue & Booking
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15L7 10H17L12 15Z" fill="currentColor"/></svg>
            </button>
            {activeDropdown === 'venue' && (
              <div className="absolute top-14 left-0 w-48 bg-white border border-[#E3DEE0] rounded-lg shadow-lg py-1 flex flex-col">
                <button 
                  onClick={() => { navigate('/venues'); setActiveDropdown(null); }} 
                  className={`text-left px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold cursor-pointer ${
                    location.pathname.startsWith('/venues') || location.pathname.startsWith('/booking-request') ? "text-[#7A1F3D]" : "text-[#1F1A1C]"
                  }`}
                >
                  Book Venue
                </button>
                <a href="#" className="px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold text-[#1F1A1C]">Booking History</a>
              </div>
            )}
          </div>

          {/* Events Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('events')} 
              className={`flex items-center gap-1 py-4 cursor-pointer transition-colors ${
                location.pathname.includes('/events') || activeDropdown === 'events' ? "text-[#7A1F3D]" : "hover:text-[#7A1F3D]"
              }`}
            >
              Events
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15L7 10H17L12 15Z" fill="currentColor"/></svg>
            </button>
            {activeDropdown === 'events' && (
              <div className="absolute top-14 left-0 w-48 bg-white border border-[#E3DEE0] rounded-lg shadow-lg py-1 flex flex-col">
                {isStudent && <a href="#" className="px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold text-[#1F1A1C]">Browse Events</a>}
                {isClub && (
                  <>
                    <a href="#" className="px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold text-[#1F1A1C]">Publish Event</a>
                    <a href="#" className="px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold text-[#1F1A1C]">Browse Events</a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Help & Support Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('help')} 
              className={`flex items-center gap-1 py-4 cursor-pointer transition-colors ${
                checkActive(faqPath) || activeDropdown === 'help' ? "text-[#7A1F3D]" : "hover:text-[#7A1F3D]"
              }`}
            >
              Help & Support
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15L7 10H17L12 15Z" fill="currentColor"/></svg>
            </button>
            {activeDropdown === 'help' && (
              <div className="absolute top-14 left-0 w-48 bg-white border border-[#E3DEE0] rounded-lg shadow-lg py-1 flex flex-col">
                <button 
                  onClick={() => { navigate(faqPath); setActiveDropdown(null); }} 
                  className={`text-left px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold cursor-pointer ${
                    checkActive(faqPath) ? "text-[#7A1F3D]" : "text-[#1F1A1C]"
                  }`}
                >
                  FAQ
                </button>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLScKPJLpauxqEzx6vavNyKgUUw9oVKgYx7L5wcDPizUSjgvgig/viewform?usp=publish-editor" target="_blank" rel="noreferrer" className="px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold text-[#1F1A1C]">Lost Item</a>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSeE1J0a6KQTBnpRSbUyvReN9HSOOXqBgGY2fvxkH32g2ULMWA/viewform?usp=publish-editor" target="_blank" rel="noreferrer" className="px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold text-[#1F1A1C]">Feedback</a>
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="relative cursor-pointer">
        <button onClick={() => toggleDropdown('role')} className="flex items-center gap-2 bg-[#7A1F3D] text-white px-4 md:px-5 py-2 rounded-lg text-[13px] font-semibold cursor-pointer">
          <span>{roleLabel}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.58744 11.379C7.63331 11.4234 7.69469 11.4597 7.76629 11.4848C7.8379 11.5099 7.91758 11.523 7.99847 11.523C8.07936 11.523 8.15904 11.5099 8.23064 11.4848C8.30224 11.4597 8.36363 11.4234 8.4095 11.379L12.9099 7.04593C12.9619 6.99595 12.9925 6.93741 12.9982 6.87667C13.0039 6.81594 12.9845 6.75532 12.9421 6.70142C12.8997 6.64751 12.836 6.60237 12.7579 6.57091C12.6797 6.53945 12.5901 6.52287 12.4988 6.52296H3.49811C3.40703 6.52322 3.31777 6.54001 3.23993 6.57155C3.1621 6.60309 3.09863 6.64817 3.05636 6.70195C3.01409 6.75573 2.99462 6.81618 3.00003 6.87678C3.00544 6.93739 3.03554 6.99587 3.08708 7.04593L7.58744 11.379Z" fill="white"/>
          </svg>
        </button>
        {activeDropdown === 'role' && (
          <div className="absolute top-12 right-0 w-48 bg-white border border-[#E3DEE0] rounded-lg shadow-lg py-1 flex flex-col">
            <button onClick={() => { onProfileOpen(true); setActiveDropdown(null); }} className="text-left px-4 py-3 hover:bg-[#FAF3F6] text-sm font-semibold text-[#1F1A1C] cursor-pointer">Profile Settings</button>
            <div className="border-t border-gray-100 my-1"></div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 text-left px-4 py-3 hover:bg-red-50 text-sm font-semibold text-red-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loggingOut && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              )}
              {loggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        )}
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-[#E3DEE0] shadow-lg z-40 flex flex-col py-2 font-inter">
          <button 
            onClick={() => { setIsMobileMenuOpen(false); navigate(homePath); }} 
            className={`text-left w-full px-6 py-3 text-sm font-semibold border-b border-gray-100 cursor-pointer ${
              checkActive(homePath) ? "text-[#7A1F3D]" : "text-[#1F1A1C]"
            }`}
          >
            {homeLabel}
          </button>

          <div className="px-6 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Venue & Booking</p>
            <button onClick={() => { setIsMobileMenuOpen(false); navigate('/venues'); }} className="block w-full text-left py-1 text-[13px] font-semibold text-[#1F1A1C] cursor-pointer">Book Venue</button>
            <a href="#" className="block py-1 text-[13px] font-semibold text-[#1F1A1C]">Booking History</a>
          </div>

          <div className="px-6 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Events</p>
            {isStudent && <a href="#" className="block py-1 text-[13px] font-semibold text-[#1F1A1C]">Browse Events</a>}
            {isClub && (
              <>
                <a href="#" className="block py-1 text-[13px] font-semibold text-[#1F1A1C]">Publish Event</a>
                <a href="#" className="block py-1 text-[13px] font-semibold text-[#1F1A1C]">Browse Events</a>
              </>
            )}
          </div>

          <div className="px-6 py-2 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Help & Support</p>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); navigate(faqPath); }} 
              className={`block py-1 text-[13px] font-semibold ${
                checkActive(faqPath) ? "text-[#7A1F3D]" : "text-[#1F1A1C]"
              }`}
            >
              FAQ
            </button>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLScKPJLpauxqEzx6vavNyKgUUw9oVKgYx7L5wcDPizUSjgvgig/viewform?usp=publish-editor" target="_blank" rel="noreferrer" className="block py-1 text-[13px] font-semibold text-[#1F1A1C]">Lost Item</a>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSeE1J0a6KQTBnpRSbUyvReN9HSOOXqBgGY2fvxkH32g2ULMWA/viewform?usp=publish-editor" target="_blank" rel="noreferrer" className="block py-1 text-[13px] font-semibold text-[#1F1A1C]">Feedback</a>
          </div>
        </div>
      )}
    </header>
  );
}