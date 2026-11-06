import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ProtectedRoute({ allowedRoles }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Loading — show spinner (same as before)
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F4F5]">
        <div className="w-12 h-12 border-4 border-[#7A1F3D] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // No session — go to login
  if (!session) return <Navigate to="/login" replace />;

  // Role mismatch — show denied screen; children never mount
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <AccessDenied
        role={role}
        onGoBack={() => window.history.length > 1 ? window.history.back() : window.location.replace(
          role === 'mpp_admin' ? '/mpp-dashboard'
          : role === 'club_representative' ? '/club-dashboard'
          : '/student-dashboard'
        )}
      />
    );
  }

  // Authorized — safe to render the child page
  return <Outlet />;
}

function AccessDenied({ onGoBack }) {
  useEffect(() => {
    // Show the warning for 1.5s, then go back
    const timer = setTimeout(onGoBack, 1500);
    return () => clearTimeout(timer);
  }, [onGoBack]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F4F5] px-4">
      <div className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-bold text-red-700">Access denied</h2>
        <p className="mt-2 text-sm text-red-600">
          You don't have permission to view that page. Redirecting…
        </p>
      </div>
    </div>
  );
}