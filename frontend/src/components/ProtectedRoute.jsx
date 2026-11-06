import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ProtectedRoute({ allowedRoles }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setSession(session);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('profile_id', session.user.id)
        .single();

      if (profile) setRole(profile.role);
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (loading || !session) return;
    if (allowedRoles && !allowedRoles.includes(role)) {
      alert("Access denied. You don't have permission to view that page.");

      if (window.history.length > 1) {
        navigate(-1);
      } else {
        const fallback =
          role === 'mpp_admin' ? '/mpp-dashboard'
          : role === 'club_representative' ? '/club-dashboard'
          : '/student-dashboard';
        setRedirectTo(fallback);
      }
    }
  }, [loading, session, role, allowedRoles, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F4F5]">
        <div className="w-12 h-12 border-4 border-[#7A1F3D] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}