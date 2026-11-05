import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom'

export default function StudentclubLoginPage() {
   const [errorMsg, setErrorMsg] = useState('');
   const [loading, setLoading] = useState(false);
   const handleGoogleLogin = async () => {
  setErrorMsg('');
  setLoading(true);

  sessionStorage.setItem('intended_portal', 'student');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?role=student`
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
            className="w-4 h-4 overflow-hidden relative "
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
              <clipPath id="clip0_104_239">
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
              YOUR CAMPUS STARTS HERE
            </p>
            <p className="text-[#1F1A1C] font-inter text-[32px] sm:text-[42px] font-bold leading-[1.12em] w-full">
              Your campus, connected.
            </p>
            <p className="text-[#6B6468] font-inter text-base leading-[1.65em] w-full max-w-[405px]">
              Book a venue, discover events and bring your campus plans to life.
              All in one place.
            </p>
          </div>
          <div className="flex flex-col items-start w-full max-w-[420px] h-44 overflow-hidden relative">
            <div className="absolute right-3 bottom-1 rounded-[100px] bg-[#F0EBED] w-[390px] h-5"></div>
            <svg
              width="360"
              height="150"
              viewBox="0 0 360 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-6 top-2.5 opacity-[55%] w-[366px] h-[150px] "
            >
              <mask id="stroke0_104_183" fill="white">
                <path d="M38.2305 150H16.2305V129.167C-8.76953 122.917 -1.76953 91.6667 16.2305 86.4583C35.2305 92.7083 41.2305 125 16.2305 129.167V150H38.2305V62.5H113.23V34.375L201.23 0L289.23 34.375V83.3333H326.23V150H346.23V137.5C328.23 132.292 331.23 111.458 346.23 106.25C361.23 111.458 367.23 134.375 346.23 137.5V150H326.23H289.23H271.23H219.23H181.23H131.23H113.23H38.2305Z" />
              </mask>
              <path
                opacity="0.55"
                d="M131.23 48.9583V48.2083H130.48V48.9583H131.23ZM271.23 48.9583H271.98V48.2083H271.23V48.9583ZM147.23 57.2917V56.5417H146.48V57.2917H147.23ZM147.23 77.0833H146.48V77.8333H147.23V77.0833ZM166.23 77.0833V77.8333H166.98V77.0833H166.23ZM166.23 57.2917H166.98V56.5417H166.23V57.2917ZM190.23 57.2917V56.5417H189.48V57.2917H190.23ZM190.23 77.0833H189.48V77.8333H190.23V77.0833ZM209.23 77.0833V77.8333H209.98V77.0833H209.23ZM209.23 57.2917H209.98V56.5417H209.23V57.2917ZM233.23 57.2917V56.5417H232.48V57.2917H233.23ZM233.23 77.0833H232.48V77.8333H233.23V77.0833ZM252.23 77.0833V77.8333H252.98V77.0833H252.23ZM252.23 57.2917H252.98V56.5417H252.23V57.2917ZM147.23 90.625V89.875H146.48V90.625H147.23ZM147.23 110.417H146.48V111.167H147.23V110.417ZM166.23 110.417V111.167H166.98V110.417H166.23ZM166.23 90.625H166.98V89.875H166.23V90.625ZM190.23 90.625V89.875H189.48V90.625H190.23ZM190.23 110.417H189.48V111.167H190.23V110.417ZM209.23 110.417V111.167H209.98V110.417H209.23ZM209.23 90.625H209.98V89.875H209.23V90.625ZM233.23 90.625V89.875H232.48V90.625H233.23ZM233.23 110.417H232.48V111.167H233.23V110.417ZM252.23 110.417V111.167H252.98V110.417H252.23ZM252.23 90.625H252.98V89.875H252.23V90.625ZM181.23 123.958V123.208H180.48V123.958H181.23ZM219.23 123.958H219.98V123.208H219.23V123.958ZM53.2305 77.0833V76.3333H52.4805V77.0833H53.2305ZM72.2305 77.0833H72.9805V76.3333H72.2305V77.0833ZM72.2305 96.875V97.625H72.9805V96.875H72.2305ZM53.2305 96.875H52.4805V97.625H53.2305V96.875ZM84.2305 77.0833V76.3333H83.4805V77.0833H84.2305ZM102.23 77.0833H102.98V76.3333H102.23V77.0833ZM102.23 96.875V97.625H102.98V96.875H102.23ZM84.2305 96.875H83.4805V97.625H84.2305V96.875ZM53.2305 111.458V110.708H52.4805V111.458H53.2305ZM72.2305 111.458H72.9805V110.708H72.2305V111.458ZM72.2305 131.25V132H72.9805V131.25H72.2305ZM53.2305 131.25H52.4805V132H53.2305V131.25ZM84.2305 111.458V110.708H83.4805V111.458H84.2305ZM102.23 111.458H102.98V110.708H102.23V111.458ZM102.23 131.25V132H102.98V131.25H102.23ZM84.2305 131.25H83.4805V132H84.2305V131.25ZM301.23 96.875V96.125H300.48V96.875H301.23ZM313.23 96.875H313.98V96.125H313.23V96.875ZM313.23 112.5V113.25H313.98V112.5H313.23ZM301.23 112.5H300.48V113.25H301.23V112.5ZM-3.76953 150V150.75H16.2305V150V149.25H-3.76953V150ZM16.2305 150V150.75H38.2305V150V149.25H16.2305V150ZM326.23 150V150.75H346.23V150V149.25H326.23V150ZM346.23 150V150.75H362.23V150V149.25H346.23V150ZM113.23 150H113.98V62.5H113.23H112.48V150H113.23ZM289.23 83.3333H288.48V150H289.23H289.98V83.3333H289.23ZM113.23 34.375V35.125H289.23V34.375V33.625H113.23V34.375ZM131.23 150H131.98V48.9583H131.23H130.48V150H131.23ZM131.23 48.9583V49.7083H271.23V48.9583V48.2083H131.23V48.9583ZM271.23 48.9583H270.48V150H271.23H271.98V48.9583H271.23ZM147.23 57.2917H146.48V77.0833H147.23H147.98V57.2917H147.23ZM147.23 77.0833V77.8333H166.23V77.0833V76.3333H147.23V77.0833ZM166.23 77.0833H166.98V57.2917H166.23H165.48V77.0833H166.23ZM166.23 57.2917V56.5417H147.23V57.2917V58.0417H166.23V57.2917ZM190.23 57.2917H189.48V77.0833H190.23H190.98V57.2917H190.23ZM190.23 77.0833V77.8333H209.23V77.0833V76.3333H190.23V77.0833ZM209.23 77.0833H209.98V57.2917H209.23H208.48V77.0833H209.23ZM209.23 57.2917V56.5417H190.23V57.2917V58.0417H209.23V57.2917ZM233.23 57.2917H232.48V77.0833H233.23H233.98V57.2917H233.23ZM233.23 77.0833V77.8333H252.23V77.0833V76.3333H233.23V77.0833ZM252.23 77.0833H252.98V57.2917H252.23H251.48V77.0833H252.23ZM252.23 57.2917V56.5417H233.23V57.2917V58.0417H252.23V57.2917ZM147.23 90.625H146.48V110.417H147.23H147.98V90.625H147.23ZM147.23 110.417V111.167H166.23V110.417V109.667H147.23V110.417ZM166.23 110.417H166.98V90.625H166.23H165.48V110.417H166.23ZM166.23 90.625V89.875H147.23V90.625V91.375H166.23V90.625ZM190.23 90.625H189.48V110.417H190.23H190.98V90.625H190.23ZM190.23 110.417V111.167H209.23V110.417V109.667H190.23V110.417ZM209.23 110.417H209.98V90.625H209.23H208.48V110.417H209.23ZM209.23 90.625V89.875H190.23V90.625V91.375H209.23V90.625ZM233.23 90.625H232.48V110.417H233.23H233.98V90.625H233.23ZM233.23 110.417V111.167H252.23V110.417V109.667H233.23V110.417ZM252.23 110.417H252.98V90.625H252.23H251.48V110.417H252.23ZM252.23 90.625V89.875H233.23V90.625V91.375H252.23V90.625ZM181.23 150H181.98V123.958H181.23H180.48V150H181.23ZM181.23 123.958V124.708H219.23V123.958V123.208H181.23V123.958ZM219.23 123.958H218.48V150H219.23H219.98V123.958H219.23ZM53.2305 77.0833V77.8333H72.2305V77.0833V76.3333H53.2305V77.0833ZM72.2305 77.0833H71.4805V96.875H72.2305H72.9805V77.0833H72.2305ZM72.2305 96.875V96.125H53.2305V96.875V97.625H72.2305V96.875ZM53.2305 96.875H53.9805V77.0833H53.2305H52.4805V96.875H53.2305ZM84.2305 77.0833V77.8333H102.23V77.0833V76.3333H84.2305V77.0833ZM102.23 77.0833H101.48V96.875H102.23H102.98V77.0833H102.23ZM102.23 96.875V96.125H84.2305V96.875V97.625H102.23V96.875ZM84.2305 96.875H84.9805V77.0833H84.2305H83.4805V96.875H84.2305ZM53.2305 111.458V112.208H72.2305V111.458V110.708H53.2305V111.458ZM72.2305 111.458H71.4805V131.25H72.2305H72.9805V111.458H72.2305ZM72.2305 131.25V130.5H53.2305V131.25V132H72.2305V131.25ZM53.2305 131.25H53.9805V111.458H53.2305H52.4805V131.25H53.2305ZM84.2305 111.458V112.208H102.23V111.458V110.708H84.2305V111.458ZM102.23 111.458H101.48V131.25H102.23H102.98V111.458H102.23ZM102.23 131.25V130.5H84.2305V131.25V132H102.23V131.25ZM84.2305 131.25H84.9805V111.458H84.2305H83.4805V131.25H84.2305ZM301.23 96.875V97.625H313.23V96.875V96.125H301.23V96.875ZM313.23 96.875H312.48V112.5H313.23H313.98V96.875H313.23ZM313.23 112.5V111.75H301.23V112.5V113.25H313.23V112.5ZM301.23 112.5H301.98V96.875H301.23H300.48V112.5H301.23ZM16.2305 150H16.9805V129.167H16.2305H15.4805V150H16.2305ZM16.2305 129.167H16.9805V116.667H16.2305H15.4805V129.167H16.2305ZM346.23 150H346.98V137.5H346.23H345.48V150H346.23ZM346.23 137.5H346.98V127.083H346.23H345.48V137.5H346.23ZM38.2305 150H36.7305V151.5H38.2305V150ZM326.23 150V151.5H327.73V150H326.23ZM38.2305 62.5V61H36.7305V62.5H38.2305ZM113.23 62.5V64H114.73V62.5H113.23ZM113.23 34.375L112.685 32.9778L111.73 33.3506V34.375H113.23ZM201.23 0L201.776 -1.39719L201.23 -1.61038L200.685 -1.39719L201.23 0ZM289.23 34.375H290.73V33.3506L289.776 32.9778L289.23 34.375ZM289.23 83.3333H287.73V84.8333H289.23V83.3333ZM326.23 83.3333H327.73V81.8333H326.23V83.3333ZM16.2305 129.167L15.8667 130.622L16.1693 130.698L16.4771 130.646L16.2305 129.167ZM16.2305 86.4583L16.6992 85.0334L16.2588 84.8886L15.8135 85.0174L16.2305 86.4583ZM346.23 137.5L345.814 138.941L346.128 139.032L346.451 138.984L346.23 137.5ZM346.23 106.25L346.722 104.833L346.23 104.662L345.738 104.833L346.23 106.25ZM38.2305 150V151.5H113.23V150V148.5H38.2305V150ZM113.23 150V151.5H131.23V150V148.5H113.23V150ZM131.23 150V151.5H181.23V150V148.5H131.23V150ZM181.23 150V151.5H219.23V150V148.5H181.23V150ZM219.23 150V151.5H271.23V150V148.5H219.23V150ZM271.23 150V151.5H289.23V150V148.5H271.23V150ZM289.23 150V151.5H326.23V150V148.5H289.23V150ZM38.2305 150H39.7305V62.5H38.2305H36.7305V150H38.2305ZM38.2305 62.5V64H113.23V62.5V61H38.2305V62.5ZM113.23 62.5H114.73V34.375H113.23H111.73V62.5H113.23ZM113.23 34.375L113.776 35.7722L201.776 1.39719L201.23 0L200.685 -1.39719L112.685 32.9778L113.23 34.375ZM201.23 0L200.685 1.39719L288.685 35.7722L289.23 34.375L289.776 32.9778L201.776 -1.39719L201.23 0ZM289.23 34.375H287.73V83.3333H289.23H290.73V34.375H289.23ZM289.23 83.3333V84.8333H326.23V83.3333V81.8333H289.23V83.3333ZM326.23 83.3333H324.73V150H326.23H327.73V83.3333H326.23ZM16.2305 129.167L16.5943 127.711C10.6622 126.228 6.74938 123.301 4.40267 119.761C2.04474 116.203 1.18798 111.904 1.59879 107.563C2.42811 98.8011 8.35546 90.2985 16.6474 87.8992L16.2305 86.4583L15.8135 85.0174C6.10548 87.8265 -0.467173 97.5531 -1.38786 107.281C-1.85205 112.185 -0.896305 117.196 1.90202 121.418C4.71156 125.657 9.29874 128.98 15.8667 130.622L16.2305 129.167ZM16.2305 86.4583L15.7618 87.8832C24.5889 90.7869 30.5245 99.8291 31.2352 108.713C31.5878 113.12 30.6409 117.373 28.2295 120.742C25.8338 124.088 21.8946 126.702 15.9839 127.687L16.2305 129.167L16.4771 130.646C23.0663 129.548 27.7521 126.563 30.6689 122.488C33.57 118.435 34.6231 113.442 34.2257 108.474C33.4364 98.6083 26.8721 88.3798 16.6992 85.0334L16.2305 86.4583ZM346.23 137.5L346.647 136.059C338.286 133.64 335.02 127.738 335.353 121.961C335.692 116.067 339.786 110.075 346.722 107.667L346.23 106.25L345.738 104.833C337.675 107.633 332.768 114.662 332.358 121.789C331.941 129.033 336.175 136.152 345.814 138.941L346.23 137.5ZM346.23 106.25L345.738 107.667C352.695 110.082 357.554 116.629 358.24 122.821C358.578 125.88 357.896 128.782 356.032 131.089C354.168 133.396 350.986 135.276 346.01 136.016L346.23 137.5L346.451 138.984C351.975 138.162 355.918 136.005 358.366 132.974C360.815 129.942 361.633 126.203 361.221 122.491C360.407 115.142 354.766 107.626 346.722 104.833L346.23 106.25Z"
                fill="#7A1F3D"
                mask="url(#stroke0_104_183)"
              />
            </svg>
            <div className="flex p-3 flex-col items-start gap-3 absolute left-2 top-5 rounded-xl border border-[#E3DEE0] bg-[#FFF] w-[94px] h-[98px] overflow-hidden">
              <div className="flex justify-between items-start w-full overflow-hidden">
                <div className="rounded-sm bg-[#7A1F3D] w-1 h-2.5"></div>
                <div className="rounded-sm bg-[#7A1F3D] w-1 h-2.5"></div>
              </div>
              <div className="flex items-start gap-1.5 flex-wrap w-full overflow-hidden">
                <div className="rounded-[3px] bg-[#F0EBED] w-[18px] h-[17px]"></div>
                <div className="rounded-[3px] bg-[#F0EBED] w-[18px] h-[17px]"></div>
                <div className="rounded-[3px] bg-[#7A1F3D] w-[18px] h-[17px]"></div>
                <div className="rounded-[3px] bg-[#F0EBED] w-[18px] h-[17px]"></div>
                <div className="rounded-[3px] bg-[#7A1F3D] w-[18px] h-[17px]"></div>
                <div className="rounded-[3px] bg-[#F0EBED] w-[18px] h-[17px]"></div>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-7 w-fit overflow-hidden">
            <div className="flex items-center gap-2 w-fit overflow-hidden">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 overflow-hidden relative "
              >
                <g clipPath="url(#clip0_104_242)">
                  <path
                    d="M13.3328 6.66665C13.3328 9.99563 9.64054 13.4626 8.40066 14.5334C8.28516 14.6203 8.14455 14.6672 8.00004 14.6672C7.85552 14.6672 7.71492 14.6203 7.59941 14.5334C6.35953 13.4626 2.66724 9.99563 2.66724 6.66665C2.66724 5.25203 3.22908 3.89535 4.22918 2.89507C5.22927 1.89478 6.58569 1.33282 8.00004 1.33282C9.41438 1.33282 10.7708 1.89478 11.7709 2.89507C12.771 3.89535 13.3328 5.25203 13.3328 6.66665ZM9.99984 6.66665C9.99984 7.77132 9.1045 8.66684 8.00004 8.66684C6.89558 8.66684 6.00024 7.77132 6.00024 6.66665C6.00024 5.56198 6.89558 4.66647 8.00004 4.66647C9.1045 4.66647 9.99984 5.56198 9.99984 6.66665Z"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    stroke="#7A1F3D"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_104_242">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <p className="text-[#6B6468] font-inter text-[13px] font-medium w-fit">
                Book venues
              </p>
            </div>
            <div className="flex items-center gap-2 w-fit overflow-hidden">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 overflow-hidden relative "
              >
                <g clipPath="url(#clip0_104_245)">
                  <path
                    d="M5.33333 1.33282V2.66626M5.33333 2.66626V3.9997M5.33333 2.66626H3.33333C2.59695 2.66626 2 3.26327 2 3.9997V6.66658M5.33333 2.66626H10.6667M10.6667 1.33282V2.66626M10.6667 2.66626V3.9997M10.6667 2.66626H12.6667C13.403 2.66626 14 3.26327 14 3.9997V6.66658M2 6.66658H14M2 6.66658V13.3338C2 14.0702 2.59695 14.6672 3.33333 14.6672H12.6667C13.403 14.6672 14 14.0702 14 13.3338V6.66658M5.33333 9.33347H5.34M8 9.33347H8.00667M10.6667 9.33347H10.6733M5.33333 12.0003H5.34M8 12.0003H8.00667M10.6667 12.0003H10.6733"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    stroke="#7A1F3D"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_104_245">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <p className="text-[#6B6468] font-inter text-[13px] font-medium w-fit">
                Discover events
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
              Sign in using your university account to continue.
            </p>
          </div>
          
          <div className="flex flex-col items-start gap-3.5 w-full overflow-hidden">
            {errorMsg && <p role="alert" className="w-full rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>}
            <button onClick={handleGoogleLogin} disabled={loading} className="flex py-0 px-5 justify-between items-center rounded-lg bg-[#7A1F3D] hover:bg-[#5c162d] transition-colors w-full h-[52px] overflow-hidden cursor-pointer disabled:opacity-70">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 overflow-hidden relative "
              >
                <path
                  d="M8.33315 15.0005V9.16684M11.6664 15.0005V9.16684M14.9996 15.0005V9.16684M2.5 18.334H17.4995M4.99992 15.0005V9.16684M9.26654 1.83152C9.49519 1.72044 9.74622 1.66314 10.0004 1.66401C10.2546 1.66488 10.5053 1.72389 10.7332 1.83653L17.288 5.04253C17.6846 5.23671 17.5463 5.83341 17.1046 5.83341H2.89507C2.45342 5.83341 2.31592 5.23671 2.71174 5.04253L9.26654 1.83152Z"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  stroke="white"
                />
              </svg>
              <p className="text-[#FFF] font-inter text-sm font-semibold w-fit">
                Sign in with University Google Account
              </p>
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[18px] h-[18px] overflow-hidden relative "
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
              You’ll be redirected to your university’s secure sign-in page.
            </p>
          </div>
          <div className="flex pt-5 flex-col items-start gap-4 border-t border-t-[#E3DEE0] w-full overflow-hidden">
  <button className="cursor-pointer text-nowrap flex justify-center items-center gap-2 w-full overflow-hidden">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5">
      <path d="M4.08333 5.83324V4.0831C4.08333 3.30949 4.39062 2.56756 4.93761 2.02054C5.48459 1.47351 6.22645 1.1662 7 1.1662C7.77355 1.1662 8.51541 1.47351 9.06239 2.02054C9.60938 2.56756 9.91667 3.30949 9.91667 4.0831V5.83324M4.08333 5.83324H2.91667C2.27233 5.83324 1.75 6.35562 1.75 7V11.667C1.75 12.3114 2.27233 12.8338 2.91667 12.8338H11.0833C11.7277 12.8338 12.25 12.3114 12.25 11.667V7C12.25 6.35562 11.7277 5.83324 11.0833 5.83324H9.91667M4.08333 5.83324H9.91667" strokeWidth="1.6" strokeLinecap="round" stroke="#6B6468" />
    </svg>
    <p className="text-[#6B6468] font-inter text-xs w-fit">One university account. No extra password.</p>
  </button>

  {/* ── NEW: role switch links ── */}
  <div className="flex flex-col items-center gap-1.5 w-full">
    <p className="text-[#6B6468] font-inter text-xs">Sign in as a different role?</p>
    <div className="flex items-center gap-4">
      <Link to="/login/admin" className="text-[#7A1F3D] font-inter text-xs font-semibold hover:underline">
         👉 Admin login
      </Link>
      <Link to="/login/club" className="text-[#7A1F3D] font-inter text-xs font-semibold hover:underline">
        👉 Club representative login
      </Link>
    </div>
  </div>

  <Link to="/contact" className="text-[#7A1F3D] font-inter text-xs font-semibold w-full text-center block hover:underline">
    Trouble signing in? Contact campus support
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
          <Link to="/terms"className="text-[#6B6468] font-inter text-xs w-fit hover:underline">
            Terms of use
          </Link>
        </div>
      </div>
    </div>
  ); 
}
