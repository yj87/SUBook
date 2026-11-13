import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import TopNavbar from '../components/TopNavbar';
import ProfileModal from '../components/ProfileModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ClubBookingApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const fileInputRef = useRef(null);

  const venueId = searchParams.get('venueId');
  const dateParam = searchParams.get('date');
  const datesParam = searchParams.get('dates'); 
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  const bookingType = searchParams.get('bookingType');

  const rawDate = datesParam ? datesParam.split(',')[0] : dateParam;
  const dbDate = rawDate ? `${rawDate}T00:00:00+08:00` : new Date().toISOString();

  const [venue, setVenue] = useState(null);
  const [loadingVenue, setLoadingVenue] = useState(true);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [eventDetails, setEventDetails] = useState({
    clubName: '',
    eventName: '',
    eventPurpose: ''
  });
  
  const [attendees, setAttendees] = useState('1');

  useEffect(() => {
    const fetchVenue = async () => {
      if (!venueId) return setLoadingVenue(false);
      try {
        const res = await fetch(`${API}/api/venues/${encodeURIComponent(venueId)}`);
        if (res.ok) {
          const body = await res.json();
          setVenue(body.data);
        }
      } catch (err) {
        console.error("Failed to load venue", err);
      } finally {
        setLoadingVenue(false);
      }
    };
    fetchVenue();
  }, [venueId]);

  const requiresLetter = venue?.is_shared === false;

  const handleFileUpload = (e) => {
    setFileError('');
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(uploadedFile.type)) {
      setFileError('Please upload a PDF, JPG, or PNG file.');
      return;
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setFileError('File size must be less than 5MB.');
      return;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    const objectUrl = URL.createObjectURL(uploadedFile);
    setPreviewUrl(objectUrl);
    triggerAIPlaceholder(uploadedFile); 
  };

  const triggerAIPlaceholder = (uploadedFile) => {
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      setEventDetails({
        clubName: 'Computing Society',
        eventName: 'Tech Talk: AI in Industry',
        eventPurpose: 'Industry talk for students'
      });
    }, 2000);
  };

  const removeFile = () => {
    setFile(null);
    setFileName('');
    setPreviewUrl(null);
    setScanComplete(false);
    setFileError('');
    setEventDetails({ clubName: '', eventName: '', eventPurpose: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDetailChange = (e) => {
    setEventDetails({ ...eventDetails, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (requiresLetter && !file) {
      setFileError('Approval letter is required for this venue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session. Please log in again.");

      let publicUrl = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const uniqueFileName = `${session.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${venueId}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('approval-letters')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data: { publicUrl: url } } = supabase.storage
          .from('approval-letters')
          .getPublicUrl(filePath);
          
        publicUrl = url;
      }

      // --- DYNAMIC RATE CALCULATION ---
      // Fetch rates from the 'venue' object instead of hardcoding 0
      let finalRate = 0;
      let finalDeposit = 0;
      
      if (venue) {
        if (bookingType === 'daily') {
          finalRate = Number(venue.daily_rate || 0);
          finalDeposit = Number(venue.daily_deposit || 0);
        } else {
          finalRate = Number(venue.hourly_rate || 0);
          finalDeposit = Number(venue.hourly_deposit || 0);
        }
      }

      // --- DIRECT SUPABASE INSERT ---
      const { data: bookingData, error: insertError } = await supabase
        .from('bookings')
        .insert({
          profile_id: session.user.id,
          venue_id: venueId,
          booking_type: bookingType,
          purpose: eventDetails.eventPurpose || 'Club Event',
          start_time: startTime,
          end_time: endTime,
          event_name: eventDetails.eventName,
          date: dbDate, 
          expected_attendees: Number(attendees), 
          approval_letter_url: publicUrl, 
          status: 'pending_approval',
          quoted_rate: finalRate,
          quoted_deposit: finalDeposit,
        })
        .select('booking_id')
        .single();

      if (insertError) throw insertError;

      navigate(`/booking-request/success?bookingId=${bookingData.booking_id}`, { replace: true });
      
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Failed to submit booking. ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = rawDate 
    ? new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(`${rawDate}T00:00:00+08:00`)) 
    : '—';

  let timeLabel = '—';
  if (bookingType === 'daily') {
    timeLabel = '8:00 am – 12:00 am';
  } else if (startTime && endTime) {
    const formattedStart = new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(startTime));
    const formattedEnd = new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(endTime));
    timeLabel = `${formattedStart} – ${formattedEnd}`;
  }

  const venueName = loadingVenue ? 'Loading venue...' : (venue?.venue_name || 'Venue');
  
  let rateLabel = 'Rate';
  if (venue) {
    if (bookingType === 'daily') rateLabel = `Daily Rate: RM${Number(venue.daily_rate || 0).toFixed(2)}`;
    else rateLabel = `Hourly Rate: RM${Number(venue.hourly_rate || 0).toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-[#F6F4F5] font-inter text-[#1F1A1C]">
      <TopNavbar role="club_representative" onProfileOpen={setIsProfileOpen} />

      <div className="mx-auto max-w-[1280px] px-5 pt-7 pb-12 sm:px-[60px]">
        
        <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[#6B6468] hover:text-[#7A1F3D] cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg> 
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#1F1A1C] mb-1">
            Club Booking – {requiresLetter ? 'Upload Approval Letter' : 'Confirm Details'}
          </h1>
          <p className="text-sm text-[#6B6468]">
            {venueName} · {formattedDate} · {timeLabel} · {rateLabel}
          </p>
        </div>

        <div className={`grid grid-cols-1 ${requiresLetter ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]' : 'max-w-2xl mx-auto'} gap-6`}>
          
          {requiresLetter && (
            <div className="bg-white p-6 rounded-xl border border-[#E3DEE0]">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />

              {!file ? (
                <div onClick={() => fileInputRef.current?.click()} className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${fileError ? 'border-red-400 bg-red-50' : 'border-[#E3DEE0] bg-[#FAF9FA] hover:bg-[#FAF3F6]'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-[#A39BA0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="mb-2 text-sm text-[#6B6468]"><span className="font-semibold text-[#7A1F3D]">Drag & drop</span> approval letter</p>
                    <p className="text-xs text-[#A39BA0]">(PDF / JPG / PNG, Max 5MB)</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-[#1F1A1C] truncate">{fileName}</span>
                  </div>

                  <div onClick={() => setIsPreviewOpen(true)} className="mb-4 border border-[#E3DEE0] rounded-lg overflow-hidden bg-gray-50 h-40 flex items-center justify-center relative cursor-pointer hover:opacity-90">
                    {file.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                      <iframe src={previewUrl} title="PDF Preview" className="w-full h-full border-none pointer-events-none" />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {isScanning && (
                      <div className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        <div className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Scanning...
                      </div>
                    )}
                    {scanComplete && (
                      <div className="inline-flex w-fit items-center rounded-full bg-[#E6F4EA] px-3 py-1 text-xs font-semibold text-[#17703A]">
                        AI OCR scan complete
                      </div>
                    )}
                  </div>

                  <p className="text-[13px] text-[#6B6468] mt-3 leading-relaxed">
                    Letter required for this venue. Extracted details are pre-filled for you to verify.
                  </p>
                  
                  <div className="mt-4 flex gap-4">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[#7A1F3D] text-[13px] font-semibold hover:underline cursor-pointer">Replace file</button>
                    <button type="button" onClick={removeFile} className="text-red-500 text-[13px] font-semibold hover:underline cursor-pointer">Remove</button>
                  </div>
                </div>
              )}
              
              {fileError && <p className="mt-3 text-sm text-red-600 font-semibold">{fileError}</p>}
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-[#E3DEE0]">
            <h2 className="text-base font-bold text-[#1F1A1C] mb-4">Verify details</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">Club/Society name</label>
                  <input type="text" name="clubName" value={eventDetails.clubName} onChange={handleDetailChange} placeholder="Enter club name" className="w-full h-10 px-3 bg-white border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">Event name</label>
                  <input type="text" name="eventName" value={eventDetails.eventName} onChange={handleDetailChange} placeholder="Enter event name" className="w-full h-10 px-3 bg-white border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">Booking date</label>
                  <input type="text" value={formattedDate} readOnly className="w-full h-10 px-3 bg-[#F9F7F8] border border-[#E3DEE0] rounded-lg text-[13px] text-gray-500 outline-none cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">Booking time</label>
                  <input type="text" value={timeLabel} readOnly className="w-full h-10 px-3 bg-[#F9F7F8] border border-[#E3DEE0] rounded-lg text-[13px] text-gray-500 outline-none cursor-not-allowed" />
                </div>
                
                {venue?.is_shared ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6468] mb-1">Attendees (Max: {venue.capacity})</label>
                    <input type="number" min="1" max={Number(venue.capacity)} value={attendees} onChange={(e) => setAttendees(e.target.value)} className="w-full h-10 px-3 bg-white border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none" required />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#6B6468] mb-1">Event purpose</label>
                    <input type="text" name="eventPurpose" value={eventDetails.eventPurpose} onChange={handleDetailChange} placeholder="Enter event purpose" className="w-full h-10 px-3 bg-white border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none" required />
                  </div>
                )}
              </div>

              {venue?.is_shared && (
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">Event purpose</label>
                  <input type="text" name="eventPurpose" value={eventDetails.eventPurpose} onChange={handleDetailChange} placeholder="Enter event purpose" className="w-full h-10 px-3 bg-white border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none" required />
                </div>
              )}

              <p className="text-xs text-red-500">*Edit any incorrect field before confirming.</p>

              <div className="flex items-center gap-4 mt-2">
                <button type="submit" disabled={isSubmitting || (requiresLetter && !file)} className="h-11 px-6 bg-[#7A1F3D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#5a162d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
                </button>
                <span className="text-xs text-[#6B6468] max-w-[200px]">
                  Submit your request and wait for MPP to review.
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 sm:p-10 backdrop-blur-sm cursor-zoom-out" onClick={() => setIsPreviewOpen(false)}>
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-[#E3DEE0] bg-[#FAF9FA]">
              <h3 className="text-sm font-bold text-[#1F1A1C] truncate">{fileName}</h3>
              <button onClick={() => setIsPreviewOpen(false)} className="text-[#6B6468] hover:text-red-500 bg-white p-1 rounded-full shadow-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-2">
              {file?.type.startsWith('image/') ? (
                <img src={previewUrl} alt="Full Preview" className="max-w-full max-h-full object-contain shadow-sm" />
              ) : (
                <iframe src={previewUrl} title="Full PDF Preview" className="w-full h-[75vh] border-none shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}