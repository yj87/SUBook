import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function ProfileModal({ isOpen, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Text form states
  const [fullName, setFullName] = useState('');
  const [matricNo, setMatricNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [email, setEmail] = useState('');
  
  // Avatar states
  const [googleAvatar, setGoogleAvatar] = useState(null);
  const [localCustomAvatar, setLocalCustomAvatar] = useState(null); 
  const [fileToUpload, setFileToUpload] = useState(null);           
  const [localHideGooglePic, setLocalHideGooglePic] = useState(false);
  
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef(null);
  
  // Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  let streamRef = useRef(null);
  
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch user data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchProfile = async () => {
      setLoading(true);
      setStatusMessage('');
      setShowAvatarMenu(false);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const googlePic = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      if (googlePic) setGoogleAvatar(googlePic);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setMatricNo(profileData.matric_no || '');
        setPhoneNo(profileData.phone_no ? profileData.phone_no.replace('+60', '') : '');
        setEmail(profileData.email || '');
        
        setLocalCustomAvatar(profileData.avatar_url || null);
        setLocalHideGooglePic(profileData.hide_google_pic || false);
        setFileToUpload(null); 
      }
      setLoading(false);
    };

    fetchProfile();
  }, [isOpen]);

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    setShowAvatarMenu(false);
    setCameraError('');
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(file);
          
          setLocalCustomAvatar(previewUrl);
          setFileToUpload(file);
          setLocalHideGooglePic(false);
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };
  // --------------------

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setLocalCustomAvatar(previewUrl);
    setFileToUpload(file);
    setLocalHideGooglePic(false); 
    setShowAvatarMenu(false); 
  };

  const handleUseGoogleAvatar = () => {
    setLocalCustomAvatar(null);
    setFileToUpload(null);
    setLocalHideGooglePic(false);
    setShowAvatarMenu(false); 
  };

  const handleRemoveAvatar = () => {
    setLocalCustomAvatar(null);
    setFileToUpload(null);
    setLocalHideGooglePic(true); 
    setShowAvatarMenu(false); 
  };

  const handleSave = async () => {
    setLoading(true);
    setStatusMessage('');
    
    try {
      let finalAvatarUrl = localCustomAvatar;

      // 1. Upload new image if selected
      if (fileToUpload) {
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${profile.profile_id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalAvatarUrl = data.publicUrl;
        
        setLocalCustomAvatar(finalAvatarUrl);
        setFileToUpload(null);
      }

      // 2. Update database for ALL roles (Student, Club, MPP)
      const updates = {
        full_name: fullName,
        phone_no: phoneNo ? `+60${phoneNo}` : null,
        avatar_url: finalAvatarUrl,
        hide_google_pic: localHideGooglePic
      };

      // Only update matric_no if the user is a student
      if (profile.role === 'student') {
        updates.matric_no = matricNo;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('profile_id', profile.profile_id);

      if (updateError) throw updateError;

      setStatusMessage('Profile updated successfully!');
      setProfile({ ...profile, ...updates });

    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isClub = profile?.role === 'club_representative';
  const isMPP = profile?.role === 'mpp_admin';
  
  let displayAvatar = null;
  if (localCustomAvatar) {
    displayAvatar = localCustomAvatar;
  } else if (!localHideGooglePic && googleAvatar) {
    displayAvatar = googleAvatar;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      
      <div className="bg-white rounded-[20px] w-full max-w-[891px] min-h-[604px] shadow-2xl relative p-10 flex flex-col">
        
        {/* CAMERA OVERLAY */}
        {isCameraOpen ? (
          <div className="absolute inset-0 bg-white z-50 rounded-[20px] flex flex-col items-center justify-center p-6">
            <h3 className="text-2xl font-bold mb-4">Take a Photo</h3>
            
            {cameraError ? (
              <div className="text-red-500 font-semibold mb-4">{cameraError}</div>
            ) : (
              <div className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden mb-6">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={stopCamera} className="px-6 py-2 border border-gray-400 rounded-lg hover:bg-gray-100 font-semibold cursor-pointer">Cancel</button>
              {!cameraError && (
                <button onClick={capturePhoto} className="px-6 py-2 bg-[#7A1F3D] text-white rounded-lg hover:bg-[#5c162d] font-semibold cursor-pointer">Capture Photo</button>
              )}
            </div>
          </div>
        ) : null}

        {/* REGULAR MODAL CONTENT */}
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-500 hover:text-black transition-colors cursor-pointer">
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <path d="M10.1334 30.0834L7.91675 27.8667L16.7834 19L7.91675 10.1334L10.1334 7.91669L19.0001 16.7834L27.8667 7.91669L30.0834 10.1334L21.2167 19L30.0834 27.8667L27.8667 30.0834L19.0001 21.2167L10.1334 30.0834Z" fill="currentColor"/>
          </svg>
        </button>

        <h2 className="text-[32px] font-bold text-black border-b-2 border-gray-200 pb-4 mb-8 inline-block w-full">
          My Profile
        </h2>

        {loading && !profile ? (
          <div className="flex-grow flex items-center justify-center text-xl text-gray-500">Loading profile...</div>
        ) : profile ? (
          <>
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-6">
                
                <div className="w-[105px] h-[92px] bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path d="M46 38C46 39.0609 45.5786 40.0783 44.8284 40.8284C44.0783 41.5786 43.0609 42 42 42H6C4.93913 42 3.92172 41.5786 3.17157 40.8284C2.42143 40.0783 2 39.0609 2 38V16C2 14.9391 2.42143 13.9217 3.17157 13.1716C3.92172 12.4214 4.93913 12 6 12H14L18 6H30L34 12H42C43.0609 12 44.0783 12.4214 44.8284 13.1716C45.5786 13.9217 46 14.9391 46 16V38ZM32 26C32 30.4183 28.4183 34 24 34C19.5817 34 16 30.4183 16 26C16 21.5817 19.5817 18 24 18C28.4183 18 32 21.5817 32 26Z" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" stroke="#9CA3AF"/>
                    </svg>
                  )}
                  {loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-black">{profile.full_name || 'User Name'}</h3>
                  <p className="text-sm font-light text-gray-600 mt-1">
                    {isClub ? 'Club Representative' : isMPP ? 'MPP Admin' : 'Student'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 relative">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                
                <div className="relative">
                  <button 
                    onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                    disabled={loading}
                    className="flex items-center gap-2 border border-gray-400 rounded-[10px] px-4 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <svg width="24" height="24" viewBox="0 0 31 30" fill="none">
                      <path d="M27.125 18.75V23.75C27.125 24.413 26.8528 25.0489 26.3684 25.5178C25.8839 25.9866 25.2268 26.25 24.5417 26.25H6.45833C5.77319 26.25 5.11611 25.9866 4.63164 25.5178C4.14717 25.0489 3.875 24.413 3.875 23.75V18.75M9.04167 10L15.5 3.75L21.9583 10M15.5 3.75V18.75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="#1E1E1E"/>
                    </svg>
                    <span className="text-lg font-medium">Change Profile</span>
                  </button>

                  {showAvatarMenu && (
                    <div className="absolute top-12 right-0 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 flex flex-col">
                      <button onClick={() => fileInputRef.current.click()} className="text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 cursor-pointer">
                        Upload from device
                      </button>
                      <button onClick={startCamera} className="text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 cursor-pointer">
                        Take a photo
                      </button>
                      <button onClick={handleUseGoogleAvatar} className="text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 cursor-pointer">
                        Use Google picture
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button onClick={handleRemoveAvatar} className="text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 cursor-pointer">
                        Remove picture
                      </button>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleRemoveAvatar}
                  disabled={loading} 
                  className="border border-red-600 rounded-[10px] p-2 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                >
                  <svg width="24" height="24" viewBox="0 0 27 28" fill="none">
                    <path d="M3.375 6.99998H5.625M5.625 6.99998H23.625M5.625 6.99998L5.625 23.3333C5.625 23.9522 5.86205 24.5456 6.28401 24.9832C6.70597 25.4208 7.27826 25.6666 7.875 25.6666H19.125C19.7217 25.6666 20.294 25.4208 20.716 24.9832C21.1379 24.5456 21.375 23.9522 21.375 23.3333V6.99998M9 6.99998V4.66665C9 4.04781 9.23705 3.45432 9.65901 3.01673C10.081 2.57915 10.6533 2.33331 11.25 2.33331H15.75C16.3467 2.33331 16.919 2.57915 17.341 3.01673C17.7629 3.45432 18 4.04781 18 4.66665V6.99998M11.25 12.8333V19.8333M15.75 12.8333V19.8333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="#C00F0C"/>
                  </svg>
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className={`p-3 mb-6 rounded-lg text-center font-semibold ${statusMessage.includes('Error') || statusMessage.includes('denied') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 flex-grow">
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <label className="text-xl font-medium text-black">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-400 rounded-[10px] px-4 py-3 text-xl focus:outline-none focus:border-[#7A1F3D]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xl font-medium text-black">Phone Number</label>
                  <div className="flex w-full">
                    <div className="bg-[#E3DEE0] border border-gray-400 border-r-0 rounded-l-[10px] px-4 py-3 flex items-center text-xl font-medium">+60</div>
                    <input type="text" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} placeholder="23 3456789" className="flex-grow border border-gray-400 rounded-r-[10px] px-4 py-3 text-xl focus:outline-none focus:border-[#7A1F3D]" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                {/* Matric No only for Students */}
                {profile.role === 'student' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xl font-medium text-black">Matric Number</label>
                    <input type="text" value={matricNo} onChange={(e) => setMatricNo(e.target.value)} placeholder="e.g. A24KM0512" className="w-full border border-gray-400 rounded-[10px] px-4 py-3 text-xl focus:outline-none focus:border-[#7A1F3D]" />
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <label className="text-xl font-medium text-black">Email Address</label>
                  <input type="email" value={email} disabled className="w-full border border-gray-400 rounded-[10px] px-4 py-3 text-xl bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-10 mt-12">
              <button onClick={onClose} className="w-[258px] h-[51px] border border-gray-500 rounded-[10px] text-2xl font-bold hover:bg-gray-100 transition-colors cursor-pointer">Close</button>
              <button onClick={handleSave} disabled={loading} className="w-[258px] h-[51px] bg-[#7A1F3D] text-white rounded-[10px] text-2xl font-bold hover:bg-[#5c162d] transition-colors disabled:opacity-70 cursor-pointer">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center text-xl text-red-500">Failed to load profile.</div>
        )}
      </div>
    </div>
  );
}