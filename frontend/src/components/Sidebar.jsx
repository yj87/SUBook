import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';

// REPLACE THESE WITH YOUR ACTUAL GOOGLE FORM LINKS
const FEEDBACK_URL = "https://forms.gle/YOUR_FEEDBACK_LINK";
const LOST_ITEM_URL = "https://forms.gle/YOUR_LOST_ITEM_LINK";

export default function Sidebar({ role }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
  console.log('LOGOUT CLICKED');
  setLoggingOut(true);
  console.log('loggingOut set to true');

  sessionStorage.removeItem('intended_portal');
  const { error } = await supabase.auth.signOut();
  console.log('signOut returned:', error);

  if (error) {
    setLoggingOut(false);
    return;
  }

  setTimeout(() => {
    window.location.replace('/login');
  }, 600); // bump to 2s for testing
};
  return (
    <div className="w-64 bg-white border-r border-[#E3DEE0] min-h-screen p-6 flex flex-col justify-between hidden md:flex">
      <div>
        <h2 className="text-2xl font-bold text-[#7A1F3D] mb-8">SUBook</h2>
        <p className="text-xs text-[#6B6468] uppercase tracking-wider mb-4 font-semibold">
          {role.replace('_', ' ')} Menu
        </p>
        
        <nav className="flex flex-col gap-2">
          <Link to={`/${role.replace('_', '-')}-dashboard`} className="p-3 rounded-lg hover:bg-[#FAF3F6] text-[#1F1A1C] font-medium">Dashboard</Link>
          
          {(role === 'student' || role === 'club_representative') && (
            <a href="#" className="p-3 rounded-lg hover:bg-[#FAF3F6] text-[#1F1A1C] font-medium">Book Venue</a>
          )}

          {role === 'mpp_admin' && (
            <a href="#" className="p-3 rounded-lg hover:bg-[#FAF3F6] text-[#1F1A1C] font-medium">My Approvals</a>
          )}

          <Link to="/faq" className="p-3 rounded-lg hover:bg-[#FAF3F6] text-[#1F1A1C] font-medium">FAQs</Link>
        </nav>
      </div>

      <div className="flex flex-col gap-2 border-t border-[#E3DEE0] pt-4">
        <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="p-3 text-sm text-[#6B6468] hover:text-[#7A1F3D] font-medium">
          Submit Feedback ↗
        </a>
        <a href={LOST_ITEM_URL} target="_blank" rel="noopener noreferrer" className="p-3 text-sm text-[#6B6468] hover:text-[#7A1F3D] font-medium">
          Report Lost Item ↗
        </a>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-left p-3 text-red-600 font-medium hover:bg-red-50 rounded-lg mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {loggingOut ? 'Logging out…' : 'Log Out'}
        </button>
      </div>
    </div>
  );
}