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
  const ocrAbortRef = useRef(null);

  const venueId = searchParams.get('venueId');
  const dateParam = searchParams.get('date');
  const datesParam = searchParams.get('dates'); 
  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  const bookingType = searchParams.get('bookingType');
  const durationParam = searchParams.get('duration');

  const rawDate = datesParam ? datesParam.split(',')[0] : dateParam;
  const dbDate = rawDate ? `${rawDate}T00:00:00+08:00` : new Date().toISOString();

  const [venue, setVenue] = useState(null);
  const [loadingVenue, setLoadingVenue] = useState(true);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Normalise OCR status to English
const normalizeStatus = (s) => {
  if (!s) return null;
  const up = String(s).trim().toUpperCase();
  if (['APPROVED', 'DILULUSKAN', 'DILULUS', 'LULUS', 'APPROVED BY'].some((v) => up === v)) return 'APPROVED';
  if (['PENDING', 'MENUNGGU', 'BELUM DILULUSKAN'].some((v) => up === v)) return 'PENDING';
  if (['REJECTED', 'DITOLAK', 'GAGAL'].some((v) => up === v)) return 'REJECTED';
  return up;
};

// Normalise time to a comparable format
const normalizeTime = (s) => {
  if (!s) return '';
  const str = String(s).trim().toLowerCase();
  if (str === 'whole day' || str === 'whole-day') return 'whole day';
  const matches = str.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/g) || [];
  return matches
    .map((m) => {
      const [, hStr, mStr, ap] = m.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/) || [];
      if (!hStr) return null;
      let h = Number(hStr);
      const min = Number(mStr || 0);
      const ampm = (ap || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    })
    .filter(Boolean)
    .sort()
    .join('–');
};

  const [ocrError, setOcrError] = useState('');
  
  const [eventDetails, setEventDetails] = useState({
    clubName: '',
    eventName: '',
    eventPurpose: ''
  });

  const [ocrResult, setOcrResult] = useState(null);
  const [ocrRawFields, setOcrRawFields] = useState({}); 
  
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
    runOcrOnFile(uploadedFile);
  };

  const runOcrOnFile = async (uploadedFile) => {
  
  if (ocrAbortRef.current) ocrAbortRef.current.abort();
  const controller = new AbortController();
  ocrAbortRef.current = controller;

  setIsScanning(true);
  setScanComplete(false);
  setOcrError('');
  setOcrResult(null);

  try {
    const formData = new FormData();
    formData.append('file', uploadedFile);

    const res = await fetch(`${API}/api/ocr`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `OCR failed (${res.status})`);

    setOcrResult(body);

    setEventDetails((prev) => ({
      clubName:     body.clubName  ?? prev.clubName,
      eventName:    body.eventName ?? prev.eventName,
      eventPurpose: body.eventPurpose ?? prev.eventPurpose,
    }));

    if (body.attendees != null) setAttendees(String(body.attendees));

    setOcrRawFields({
      venue:     body.venue,
      eventDate: body.eventDate,
      eventTime: body.eventTime,
      signatory: body.signatory,
      eventPurpose: body.eventPurpose,
    });

    const allEmpty = ['clubName','eventName','eventDate','eventTime','venue','attendees','signatory']
      .every(k => body[k] == null || body[k] === '');
    if (allEmpty) {
      setOcrError('We couldn\'t read any details from this letter. Please fill the form manually, or upload a clearer copy.');
    }
  } catch (err) {
    
    if (err.name === 'AbortError') return;
    console.error('OCR error:', err);
    setOcrError(err.message);
  } finally {
    
    if (ocrAbortRef.current === controller) {
      setIsScanning(false);
      setScanComplete(true);
      ocrAbortRef.current = null;
    }
  }
};

const removeFile = () => {
  if (ocrAbortRef.current) ocrAbortRef.current.abort();
  ocrAbortRef.current = null; 
  setFile(null);
  setFileName('');
  setPreviewUrl(null);
  setScanComplete(false);
  setFileError('');
  setOcrError('');
  setOcrResult(null);
  setOcrRawFields({});
  setEventDetails({ clubName: '', eventName: '', eventPurpose: '' });
  if (fileInputRef.current) fileInputRef.current.value = '';
  setIsScanning(false);
};

  const handleDetailChange = (e) => {
    setEventDetails({ ...eventDetails, [e.target.name]: e.target.value });
  };

  const handleReviewRequest = (e) => {
    e.preventDefault();
    if (requiresLetter && !file) {
      setFileError('Approval letter is required for this venue.');
      return;
    }
    setShowSummaryModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    setShowSummaryModal(false);

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

      const payload = {
        venueId,
        bookingType,
        purpose: eventDetails.eventPurpose?.trim() || 'Club Event',
        event_name: eventDetails.eventName?.trim() || null,
        expected_attendees: Number(attendees),
        start_time: startTime,
        end_time: endTime,
        approval_letter_url: publicUrl,
      };

      if (bookingType === 'daily') {
        payload.dates = (datesParam || '').split(',').filter(Boolean);
      }

      const res = await fetch(`${API}/api/bookings/create-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || `Server responded ${res.status}`);
      }

      if (!body.booking?.booking_id) {
        throw new Error('Server did not return a booking ID.');
      }

      navigate(`/booking-request/success?bookingId=${body.booking.booking_id}`, { replace: true });
      
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSubmitError(error.message);
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

  const displayRate = bookingType === 'daily' ? Number(venue?.daily_rate || 0) : Number(venue?.hourly_rate || 0);
  const displayDeposit = bookingType === 'daily' ? Number(venue?.daily_deposit || 0) : Number(venue?.hourly_deposit || 0);
  
  let calculatedRental = displayRate;
  if (bookingType === 'daily') {
    const numDays = datesParam ? datesParam.split(',').length : 1;
    calculatedRental = displayRate * numDays;
  } else {
    const durationHours = Number(durationParam) || 1;
    calculatedRental = displayRate * durationHours;
  }
  
  const totalAmount = calculatedRental + displayDeposit;

// Compare OCR-extracted details against the booking the rep is making
const ocrWarnings = (() => {
  if (!ocrResult) return [];
  const warnings = [];

  // 1. Approval status
  const status = normalizeStatus(ocrResult.approvalStatus);
  if (status && status !== 'APPROVED') {
    warnings.push({
      field: 'Approval status',
      message: `The letter shows "${ocrResult.approvalStatus}" — not APPROVED. MPP will see this and may reject the request.`,
    });
  } else if (!status) {
    warnings.push({
      field: 'Approval status',
      message: 'No approval status found in the letter. Please confirm with MPP.',
      info: true,
    });
  }

  // 2. Date mismatch (OCR date must match the booking's first date)
  if (ocrResult.eventDate && rawDate && ocrResult.eventDate !== rawDate) {
    warnings.push({
      field: 'Date',
      message: `You're booking ${formattedDate}, but the letter says ${ocrResult.eventDate}.`,
    });
  }

  // 3. Time mismatch
  if (ocrResult.eventTime && timeLabel !== '—') {
    if (normalizeTime(ocrResult.eventTime) !== normalizeTime(timeLabel)) {
      warnings.push({
        field: 'Time',
        message: `You're booking ${timeLabel}, but the letter says ${ocrResult.eventTime}.`,
      });
    }
  }

  // 4. Attendees mismatch
  if (ocrResult.attendees != null && Number(attendees) !== Number(ocrResult.attendees)) {
    warnings.push({
      field: 'Attendees',
      message: `The letter says ${ocrResult.attendees}, but you've entered ${attendees}. MPP will compare against the letter.`,
    });
  }

  return warnings;
})();

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

        {submitError && (
          <div className="mb-6 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#7A1F3D]">
            <strong>Could not submit:</strong> {submitError}
          </div>
        )}

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

                  {ocrError && (
                    <p className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                      {ocrError}
                    </p>
                  )}

                  {ocrWarnings.length > 0 && (
                    <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
                      <p className="text-sm font-bold text-yellow-800">
                        ⚠ The letter doesn't fully match your booking
                      </p>
                        <ul className="mt-2 space-y-1.5 text-xs text-yellow-800">
                          {ocrWarnings.map((w, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="shrink-0">•</span>
                              <span>
                                <strong>{w.field}:</strong> {w.message}
                              </span>
                            </li>
                          ))}
                        </ul>
                      <p className="mt-2 text-xs text-yellow-700 leading-relaxed">
                        You can still submit — MPP will review this. If you're unsure, verify the letter you uploaded is correct.
                      </p>
                      </div>
                  )}

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
            
            <form onSubmit={handleReviewRequest} className="flex flex-col gap-5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">Booking date</label>
                  <input type="text" value={formattedDate} readOnly className="w-full h-10 px-3 bg-[#F9F7F8] border border-[#E3DEE0] rounded-lg text-[13px] text-gray-500 outline-none cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">Booking time</label>
                  <input type="text" value={timeLabel} readOnly className="w-full h-10 px-3 bg-[#F9F7F8] border border-[#E3DEE0] rounded-lg text-[13px] text-gray-500 outline-none cursor-not-allowed" />
                </div>
              </div>

              {/* ALWAYS SHOW ATTENDEES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#6B6468] mb-1">
                    Expected Attendees {venue?.capacity ? `(Max: ${venue.capacity})` : ''}
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max={venue?.capacity ? Number(venue.capacity) : undefined} 
                    value={attendees} 
                    onChange={(e) => setAttendees(e.target.value)} 
                    className="w-full h-10 px-3 bg-white border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none" 
                    required 
                  />
                </div>
                
                <div>
                <label className="block text-xs font-semibold text-[#6B6468] mb-1">Event purpose</label>
                  <textarea
                    name="eventPurpose"
                    value={eventDetails.eventPurpose}
                    onChange={handleDetailChange}
                    placeholder="Enter event purpose"
                    rows={3}
                    className="w-full resize-none px-3 py-2 bg-white border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none"
                    required
                  />
                </div>
              </div>

              <p className="text-xs text-red-500">*Edit any incorrect field before confirming.</p>

              <div className="flex items-center gap-4 mt-2">
                <button type="submit" disabled={isSubmitting || (requiresLetter && !file)} className="h-11 px-6 bg-[#7A1F3D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#5a162d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  {isSubmitting ? 'Processing...' : 'Review Request'}
                </button>
                <span className="text-xs text-[#6B6468] max-w-[200px]">
                  Review your details before submitting.
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* --- PREVIEW FILE MODAL --- */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 sm:p-10 backdrop-blur-sm cursor-zoom-out" onClick={() => setIsPreviewOpen(false)}>
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-[#E3DEE0] bg-[#FAF9FA]">
              <h3 className="text-sm font-bold text-[#1F1A1C] truncate">{fileName}</h3>
              <button onClick={() => setIsPreviewOpen(false)} className="text-[#6B6468] hover:text-red-500 bg-white p-1 rounded-full shadow-sm cursor-pointer">
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

      {/* --- BOOKING SUMMARY POP-UP --- */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSummaryModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col cursor-default" onClick={(e) => e.stopPropagation()}>
            
            <div className="bg-[#FAF9FA] border-b border-[#E3DEE0] p-5">
              <h2 className="text-xl font-bold text-[#1F1A1C]">Confirm Booking</h2>
              <p className="text-sm text-[#6B6468]">Please review your request details.</p>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#6B6468] uppercase">Venue</p>
                  <p className="text-sm font-bold text-[#1F1A1C]">{venueName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#6B6468] uppercase">Date</p>
                  <p className="text-sm font-bold text-[#1F1A1C]">{formattedDate}</p>
                </div>
              </div>

              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#6B6468] uppercase">Event Name</p>
                  <p className="text-sm font-semibold text-[#1F1A1C]">{eventDetails.eventName || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#6B6468] uppercase">Time</p>
                  <p className="text-sm font-semibold text-[#1F1A1C]">{timeLabel}</p>
                </div>
              </div>

              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#6B6468] uppercase">Purpose</p>
                  <p className="text-sm font-semibold text-[#1F1A1C] leading-snug">{eventDetails.eventPurpose || '—'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-[#6B6468] uppercase">Attendees</p>
                  <p className="text-sm font-semibold text-[#1F1A1C]">{attendees} pax</p>
                </div>
              </div>

              <div className="mt-2 bg-[#F9F7F8] p-4 rounded-xl border border-[#E3DEE0]">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-[#6B6468]">
                    {bookingType === 'daily' ? 'Daily Rate' : 'Hourly Rate'}
                  </span>
                  <span className="font-semibold text-[#1F1A1C]">RM {displayRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-[#6B6468]">Deposit</span>
                  <span className="font-semibold text-[#1F1A1C]">RM {displayDeposit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#E3DEE0]">
                  <span className="text-sm font-bold text-[#7A1F3D]">Total</span>
                  <span className="text-base font-bold text-[#7A1F3D]">RM {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {requiresLetter && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 mt-1">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span className="text-xs font-semibold">Approval letter attached</span>
                </div>
              )}
            </div>

            <div className="border-t border-[#E3DEE0] p-5 flex gap-3">
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 py-3 bg-white border border-[#E3DEE0] text-[#1F1A1C] rounded-lg text-sm font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 bg-[#7A1F3D] text-white rounded-lg text-sm font-semibold hover:bg-[#5a162d] cursor-pointer"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}