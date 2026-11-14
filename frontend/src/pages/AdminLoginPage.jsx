import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const ACCENT = '#7A1F3D';       // admin accent (red)
const ACCENT_HOVER = '#7A1F3D';

export default function AdminLoginPage() {
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleGoogleLogin = async () => {
  setErrorMsg('');
  setLoading(true);

  sessionStorage.setItem('intended_portal', 'admin');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?role=admin`
    }
  });

  if (error) {
    sessionStorage.removeItem('intended_portal');
    setErrorMsg(error.message);
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen flex-col items-start bg-[#F6F4F5] w-full overflow-hidden">
      {/* ── Header (same as student page) ── */}
      <div className="flex py-0 px-4 sm:px-14 justify-between items-center w-full h-24 overflow-hidden">
        <div className="flex items-center gap-4 w-fit overflow-hidden">
          <Link to="/login" className="text-[#7A1F3D] font-inter text-2xl font-bold w-fit hover:opacity-80 transition-opacity">
  SUBook
</Link>
          <p className="text-[#6B6468] font-inter text-[13px] w-fit hidden sm:block">
            Venue booking &amp; campus events
          </p>
        </div>
        <div className="flex items-center gap-2 w-fit overflow-hidden">
            <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 overflow-hidden relative"
          >
            <g clipPath="url(#clip0_104_239)">
              <path
                d="M6.05977 5.99957C6.21651 5.55398 6.5259 5.17824 6.93314 4.93891C7.34037 4.69957 7.81917 4.61209 8.28473 4.69194C8.75029 4.7718 9.17256 5.01384 9.47676 5.37521C9.78096 5.73657 9.94745 6.19393 9.94674 6.66629C9.94674 7.99973 7.94658 8.66645 7.94658 8.66645M8.00002 11.3336H8.00669M14.6672 8C14.6672 11.6822 11.6822 14.6672 8.00002 14.6672C4.31783 14.6672 1.33282 11.6822 1.33282 8C1.33282 4.31781 4.31783 1.3328 8.00002 1.3328C11.6822 1.3328 14.6672 4.31781 14.6672 8Z"
                strokeWidth="1.6"
                strokeLinecap="round"
                stroke="#6B6468"
              />
            </g>
            <defs>
              <clipPath id="club-help-clip">
                <rect width="16" height="16" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <Link to="/contact" className="text-[#7A1F3D] font-inter text-[13px] font-medium w-fit hover:underline">
            Need help?
          </Link>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-col lg:flex-row min-h-[624px] py-8 px-4 sm:px-14 lg:px-28 items-center gap-12 lg:gap-[104px] w-full">
        {/* Left hero */}
        <div className="flex flex-col items-start gap-8 w-full overflow-hidden">
          <div className="flex flex-col items-start gap-5 w-full overflow-hidden">
            <p className="font-inter text-[11px] font-semibold w-fit" style={{ color: ACCENT }}>
              ADMINISTRATION PORTAL
            </p>
            <p className="text-[#1F1A1C] font-inter text-[32px] sm:text-[42px] font-bold leading-[1.12em] w-full">
              Keep campus running smoothly.
            </p>
            <p className="text-[#6B6468] font-inter text-base leading-[1.65em] w-full max-w-[405px]">
              Approve bookings, manage venues, and review audit logs — all from one
              secure dashboard.
            </p>
          </div>

          {/* Small feature list with accent icons */}
          <div className="flex flex-col items-start gap-4 w-fit">
            <FeatureLine color={ACCENT} label="Approve or reject bookings" />
            <FeatureLine color={ACCENT} label="Manage venue catalogue" />
            <FeatureLine color={ACCENT} label="View audit logs & activity" />
          </div>

          <div className="flex items-start gap-7 w-fit overflow-hidden">
            <div className="flex items-center gap-2 w-fit overflow-hidden">
              <ShieldIcon color={ACCENT} />
              <p className="text-[#6B6468] font-inter text-[13px] font-medium w-fit">Role-restricted access</p>
            </div>
            <div className="flex items-center gap-2 w-fit overflow-hidden">
              <LockIcon color={ACCENT} />
              <p className="text-[#6B6468] font-inter text-[13px] font-medium w-fit">Actions are logged</p>
            </div>
          </div>
        </div>

        {/* Right card */}
        <div className="flex p-6 sm:p-10 flex-col items-start gap-7 rounded-[20px] border border-[#E3DEE0] bg-[#FFF] shadow-[0_8px_32px_0_rgba(59,22,37,0.03)] w-full max-w-[520px] overflow-hidden">
          <div className="flex flex-col items-start gap-3 w-full overflow-hidden">
            <span
              className="font-inter text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#FEE2E2', color: ACCENT }}
            >
              Admin
            </span>
            <p className="text-[#1F1A1C] font-inter text-3xl font-bold w-full">
              Administrator sign in
            </p>
            <p className="text-[#6B6468] font-inter text-sm leading-[1.6em] w-full">
              Sign in with your authorised administrator account to continue.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3.5 w-full overflow-hidden">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex py-0 px-5 justify-between items-center rounded-lg transition-colors w-full h-[52px] overflow-hidden cursor-pointer disabled:opacity-70"
              style={{ backgroundColor: ACCENT }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = ACCENT_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ACCENT)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <path d="M8.33315 15.0005V9.16684M11.6664 15.0005V9.16684M14.9996 15.0005V9.16684M2.5 18.334H17.4995M4.99992 15.0005V9.16684M9.26654 1.83152C9.49519 1.72044 9.74622 1.66314 10.0004 1.66401C10.2546 1.66488 10.5053 1.72389 10.7332 1.83653L17.288 5.04253C17.6846 5.23671 17.5463 5.83341 17.1046 5.83341H2.89507C2.45342 5.83341 2.31592 5.23671 2.71174 5.04253L9.26654 1.83152Z" strokeWidth="1.7" strokeLinecap="round" stroke="white" />
              </svg>
              <p className="text-[#FFF] font-inter text-sm font-semibold w-fit">
                Sign in with Admin Google Account
              </p>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]">
                <path d="M3.74939 8.99999H14.2506M8.99999 14.2506L14.2506 8.99999L8.99999 3.74939" strokeWidth="1.8" strokeLinecap="round" stroke="white" />
              </svg>
            </button>
            <p className="text-[#6B6468] font-inter text-xs leading-[1.6em] w-full text-center">
              You'll be redirected to your university's secure sign-in page.
            </p>
          </div>

          {/* Warning box */}
          <div className="flex items-start gap-2 w-full rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3">
            <ShieldIcon color={ACCENT} size={16} />
            <p className="text-[#7A1F3D] font-inter text-xs leading-[1.55em]">
              Admin access is restricted. Unauthorised login attempts are recorded in
              <span className="font-semibold"> audit logs</span>.
            </p>
          </div>

          {errorMsg && (
            <p className="w-full text-xs text-[#7A1F3D] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex pt-5 flex-col items-start gap-4 border-t border-t-[#E3DEE0] w-full overflow-hidden">
            <div className="flex flex-col items-center gap-1.5 w-full">
              <p className="text-[#6B6468] font-inter text-xs">Sign in as a different role?</p>
              <div className="flex items-center gap-4">
                <Link to="/login" className="font-inter text-xs font-semibold hover:underline" style={{ color: '#7A1F3D' }}>
                  👉 Student login 
                </Link>
                <Link to="/login/club" className="font-inter text-xs font-semibold hover:underline" style={{ color: '#7A1F3D' }}>
                  👉 Club representative login
                </Link>
              </div>
            </div>
            <Link to="/contact" className="font-inter text-xs font-semibold w-full text-center block hover:underline" style={{ color: ACCENT }}>
              Trouble signing in? Contact IT support
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer (same as student page) ── */}
      <div className="flex py-0 px-14 justify-between items-center w-full h-20 overflow-hidden">
        <p className="text-[#6B6468] font-inter text-xs w-fit">SUBook · Bringing campus together</p>
        <div className="flex items-start gap-6 w-fit overflow-hidden">
          <Link to="/privacy" className="text-[#6B6468] font-inter text-xs w-fit hover:underline">Privacy</Link>
          <Link to="/terms" className="text-[#6B6468] font-inter text-xs w-fit hover:underline">Terms of use</Link>
        </div>
      </div>
    </div>
  );
}

/* ── small shared bits (copy into each file or extract) ── */

function FeatureLine({ color, label }) {
  return (
    <div className="flex items-center gap-2.5 w-fit overflow-hidden">
      <div className="rounded-full w-1.5 h-1.5" style={{ backgroundColor: color }} />
      <p className="text-[#6B6468] font-inter text-[13px] font-medium w-fit">{label}</p>
    </div>
  );
}

function ShieldIcon({ color, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.3328 6.66665C13.3328 9.99563 9.64054 13.4626 8.40066 14.5334C8.28516 14.6203 8.14455 14.6672 8.00004 14.6672C7.85552 14.6672 7.71492 14.6203 7.59941 14.5334C6.35953 13.4626 2.66724 9.99563 2.66724 6.66665C2.66724 5.25203 3.22908 3.89535 4.22918 2.89507C5.22927 1.89478 6.58569 1.33282 8.00004 1.33282C9.41438 1.33282 10.7708 1.89478 11.7709 2.89507C12.771 3.89535 13.3328 5.25203 13.3328 6.66665Z" strokeWidth="1.6" strokeLinecap="round" stroke={color} />
    </svg>
  );
}

function LockIcon({ color, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.66667 6.66665V4.66653C4.66667 3.78247 5.01786 2.9346 5.643 2.30948C6.26813 1.68436 7.11596 1.33315 8 1.33315C8.88404 1.33315 9.73187 1.68436 10.357 2.30948C10.9821 2.9346 11.3333 3.78247 11.3333 4.66653V6.66665M4.66667 6.66665H3.33333C2.59695 6.66665 2 7.2636 2 7.99998V13.3333C2 14.0697 2.59695 14.6666 3.33333 14.6666H12.6667C13.403 14.6666 14 14.0697 14 13.3333V7.99998C14 7.2636 13.403 6.66665 12.6667 6.66665H11.3333M4.66667 6.66665H11.3333" strokeWidth="1.6" strokeLinecap="round" stroke={color} />
    </svg>
  );
}