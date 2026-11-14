import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

export default function ClubRepLoginPage() {
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [clubCode, setClubCode] = useState('');

  const handleGoogleLogin = async () => {
  setErrorMsg('');
  setLoading(true);

  sessionStorage.setItem('intended_portal', 'club_rep');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?role=club_rep`
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

      <div className="flex flex-col lg:flex-row min-h-[624px] py-8 px-4 sm:px-14 lg:px-28 items-center gap-12 lg:gap-[104px] w-full">
        <div className="flex flex-col items-start gap-8 w-full overflow-hidden">
          <div className="flex flex-col items-start gap-5 w-full overflow-hidden">
            <p className="text-[#7A1F3D] font-inter text-[11px] font-semibold w-fit">
              CLUB REPRESENTATIVE PORTAL
            </p>
            <p className="text-[#1F1A1C] font-inter text-[32px] sm:text-[42px] font-bold leading-[1.12em] w-full">
              Book on behalf of your club.
            </p>
            <p className="text-[#6B6468] font-inter text-base leading-[1.65em] w-full max-w-[405px]">
              Reserve venues for club events, track approvals, and manage your
              club's bookings in one place.
            </p>
          </div>

          <div className="flex items-start gap-7 w-fit overflow-hidden">
            <div className="flex items-center gap-2 w-fit overflow-hidden">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 overflow-hidden relative"
              >
                <g clipPath="url(#club-people-clip)">
                  <path
                    d="M10.667 14V12.6667C10.667 11.9594 10.386 11.2811 9.88595 10.781C9.38585 10.281 8.70757 10 8.00033 10H4.00033C3.29308 10 2.6148 10.281 2.11471 10.781C1.61461 11.2811 1.33366 11.9594 1.33366 12.6667V14M14.6663 14V12.6667C14.6659 12.0714 14.465 11.4933 14.095 11.0226C13.725 10.5519 13.2088 10.2166 12.6263 10.0733M10.6263 2.07334C11.2105 2.2158 11.7283 2.55137 12.0996 3.02325C12.4708 3.49513 12.6719 4.07482 12.6719 4.67167C12.6719 5.26852 12.4708 5.84822 12.0996 6.3201C11.7283 6.79198 11.2105 7.12755 10.6263 7.27M8.66634 4.66667C8.66634 6.13943 7.47243 7.33333 5.99967 7.33333C4.52692 7.33333 3.33301 6.13943 3.33301 4.66667C3.33301 3.19391 4.52692 2 5.99967 2C7.47243 2 8.66634 3.19391 8.66634 4.66667Z"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    stroke="#7A1F3D"
                  />
                </g>
                <defs>
                  <clipPath id="club-people-clip">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <p className="text-[#6B6468] font-inter text-[13px] font-medium w-fit">
                For registered clubs
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
                <g clipPath="url(#club-calendar-clip)">
                  <path
                    d="M5.33333 1.33282V2.66626M5.33333 2.66626V3.9997M5.33333 2.66626H3.33333C2.59695 2.66626 2 3.26327 2 3.9997V6.66658M5.33333 2.66626H10.6667M10.6667 1.33282V2.66626M10.6667 2.66626V3.9997M10.6667 2.66626H12.6667C13.403 2.66626 14 3.26327 14 3.9997V6.66658M2 6.66658H14M2 6.66658V13.3338C2 14.0702 2.59695 14.6672 3.33333 14.6672H12.6667C13.403 14.6672 14 14.0702 14 13.3338V6.66658"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    stroke="#7A1F3D"
                  />
                </g>
                <defs>
                  <clipPath id="club-calendar-clip">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <p className="text-[#6B6468] font-inter text-[13px] font-medium w-fit">
                Event scheduling
              </p>
            </div>
          </div>
        </div>

        <div className="flex p-6 sm:p-10 flex-col items-start gap-7 rounded-[20px] border border-[#E3DEE0] bg-[#FFF] shadow-[0_8px_32px_0_rgba(59,22,37,0.03)] w-full max-w-[520px] overflow-hidden">
          <div className="flex flex-col items-start gap-3 w-full overflow-hidden">
            <p className="text-[#1F1A1C] font-inter text-3xl font-bold w-full">
              Welcome to SUBook
            </p>
            <p className="text-[#6B6468] font-inter text-sm leading-[1.6em] w-full">
              Sign in with your club representative account to continue.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3.5 w-full overflow-hidden">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex py-0 px-5 justify-between items-center rounded-lg bg-[#7A1F3D] hover:bg-[#5c162d] transition-colors w-full h-[52px] overflow-hidden cursor-pointer disabled:opacity-70"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 overflow-hidden relative"
              >
                <path
                  d="M8.33315 15.0005V9.16684M11.6664 15.0005V9.16684M14.9996 15.0005V9.16684M2.5 18.334H17.4995M4.99992 15.0005V9.16684M9.26654 1.83152C9.49519 1.72044 9.74622 1.66314 10.0004 1.66401C10.2546 1.66488 10.5053 1.72389 10.7332 1.83653L17.288 5.04253C17.6846 5.23671 17.5463 5.83341 17.1046 5.83341H2.89507C2.45342 5.83341 2.31592 5.23671 2.71174 5.04253L9.26654 1.83152Z"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  stroke="white"
                />
              </svg>
              <p className="text-[#FFF] font-inter text-sm font-semibold w-fit">
                Sign in with Club Google Account
              </p>
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[18px] h-[18px] overflow-hidden relative"
              >
                <path
                  d="M3.74939 8.99999H14.2506M8.99999 14.2506L14.2506 8.99999L8.99999 3.74939"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  stroke="white"
                />
              </svg>
            </button>
            <p className="text-[#6B6468] font-inter text-xs leading-[1.6em] w-full text-center">
              You'll be redirected to your university's secure sign-in page.
            </p>
          </div>

          {errorMsg && (
            <p className="w-full text-xs text-[#6D28D9] bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex pt-5 flex-col items-start gap-4 border-t border-t-[#E3DEE0] w-full overflow-hidden">
            <button className="cursor-pointer text-nowrap flex justify-center items-center gap-2 w-full overflow-hidden">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 overflow-hidden relative"
              >
                <g clipPath="url(#club-lock-clip)">
                  <path
                    d="M4.08333 5.83324V4.0831C4.08333 3.30949 4.39062 2.56756 4.93761 2.02054C5.48459 1.47351 6.22645 1.1662 7 1.1662C7.77355 1.1662 8.51541 1.47351 9.06239 2.02054C9.60938 2.56756 9.91667 3.30949 9.91667 4.0831V5.83324M4.08333 5.83324H2.91667C2.27233 5.83324 1.75 6.35562 1.75 7V11.667C1.75 12.3114 2.27233 12.8338 2.91667 12.8338H11.0833C11.7277 12.8338 12.25 12.3114 12.25 11.667V7C12.25 6.35562 11.7277 5.83324 11.0833 5.83324H9.91667M4.08333 5.83324H9.91667M7.58333 9.33352C7.58333 9.65571 7.32217 9.9169 7 9.9169C6.67783 9.9169 6.41667 9.65571 6.41667 9.33352C6.41667 9.01133 6.67783 8.75014 7 8.75014C7.32217 8.75014 7.58333 9.01133 7.58333 9.33352Z"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    stroke="#6B6468"
                  />
                </g>
                <defs>
                  <clipPath id="club-lock-clip">
                    <rect width="14" height="14" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <p className="text-[#6B6468] font-inter text-xs w-fit">
                One university account. No extra password.
              </p>
            </button>

            <div className="flex flex-col items-center gap-1.5 w-full">
              <p className="text-[#6B6468] font-inter text-xs">
                Sign in as a different role?
              </p>
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-[#7A1F3D] font-inter text-xs font-semibold hover:underline">
                  👉 Student login
                </Link>
                <Link to="/login/admin" className="text-[#7A1F3D] font-inter text-xs font-semibold hover:underline">
                  👉 Admin login
                </Link>
              </div>
            </div>

            <Link to="/contact" className="text-[#7A1F3D] font-inter text-xs font-semibold w-full text-center block hover:underline">
              Not registered as a club rep? Contact student affairs
            </Link>
          </div>
        </div>
      </div>

      <div className="flex py-0 px-14 justify-between items-center w-full h-20 overflow-hidden">
        <p className="text-[#6B6468] font-inter text-xs w-fit">
          SUBook · Bringing campus together
        </p>
        <div className="flex items-start gap-6 w-fit overflow-hidden">
          <Link to="/privacy" className="text-[#6B6468] font-inter text-xs w-fit hover:underline">
            Privacy
          </Link>
          <Link to="/terms" className="text-[#6B6468] font-inter text-xs w-fit hover:underline">
            Terms of use
          </Link>
        </div>
      </div>
    </div>
  );
}