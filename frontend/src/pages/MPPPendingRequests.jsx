import { useEffect, useState } from 'react';
import ProfileModal from '../components/ProfileModal';
import MPPSidebar from '../components/MPPSidebar';
import { supabase } from '../supabaseClient';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PENDING           = 'pending_approval';
const AWAITING_PAYMENT  = 'approved_awaiting_payment';
const PAYMENT_SUBMITTED = 'payment_submitted';
const CONFIRMED         = 'confirmed';
const REJECTED          = 'rejected';
const CANCELLED         = 'cancelled';
const EXPIRED           = 'expired';

const VERIFY_MATCHED    = 'matched';
const VERIFY_MISMATCH   = 'mismatch';
const VERIFY_UNREADABLE = 'unreadable';

const BLOCK_APPROVE_WITHOUT_VERIFICATION = false;

const DEADLINE_FORMATTER = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true,
  timeZone: 'Asia/Kuala_Lumpur',
});

export default function MPPPendingRequests() {
  console.log('[RENDER] MPPPendingRequests mounted at', window.location.pathname);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVenue, setFilterVenue] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  const [filterUserType, setFilterUserType] = useState('All');
  
  // Status Filter (Defaults to showing all 3 active statuses)
  const [filterStatus, setFilterStatus] = useState('All Active');

  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // OCR — fresh run only. Saved values are read from the DB row (ocr_verifications[0]).
  const [ocrData, setOcrData] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');

  // Verification form (transient edits)
  const [decision, setDecision] = useState('');
  const [remarks, setRemarks] = useState('');
  const [savingVerification, setSavingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // MPP overrides — keyed to the current selection
  const [reviewFields, setReviewFields] = useState({});

  // Normalize so callers always get a single verification row (or null).
  const getVerification = (req) => {
    if (!req?.ocr_verifications) return null;
    return Array.isArray(req.ocr_verifications)
      ? (req.ocr_verifications[0] ?? null)
      : req.ocr_verifications;
  };

  // ── Fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchRequests = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            booking_id,
            booking_ref,
            event_name,
            purpose,
            start_time,
            end_time,
            booking_type,
            expected_attendees,
            approval_letter_url,
            submitted_at,
            status,
            quoted_rate,
            quoted_deposit,
            paid_at,
            rejection_reason,
            profiles!bookings_profile_id_fkey ( profile_id, full_name, matric_no, role ),
            venues ( venue_name, is_shared, capacity ),
            ocr_verifications (
              id, status, remarks, extracted, mismatches, created_at, updated_at,
              verifier:verified_by ( profile_id, full_name, role )
            )
          `)
          // ONLY fetch the 3 active statuses
          .in('status', [PENDING, AWAITING_PAYMENT, PAYMENT_SUBMITTED])
          .order('submitted_at', { ascending: false });

        if (fetchError) throw fetchError;

        if (!cancelled) {
          setRequests(data || []);
          
          // Auto-select the first PENDING request if it exists
          if (data && data.length > 0) {
            const firstPending = data.find(r => r.status === PENDING);
            setSelectedRequest(firstPending || data[0]);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRequests();
    return () => { cancelled = true; };
  }, []);

  // Reset transient UI when the selected booking changes.
  useEffect(() => {
    setOcrData(null);
    setOcrError('');
    setOcrLoading(false);
    setVerificationError('');

    const v = getVerification(selectedRequest);
    setDecision(v?.status || '');
    setRemarks(v?.remarks || '');
    setReviewFields({});
  }, [selectedRequest?.booking_id]);

  // ── Formatters ────────────────────────────────────────────────────
  const formatDate = (d) => d ? new Intl.DateTimeFormat('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(d)) : '—';

  const formatTime = (d) => d ? new Intl.DateTimeFormat('en-MY', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(d)) : '—';

  const formatDateTime = (d) => d ? DEADLINE_FORMATTER.format(new Date(d)) : '—';

  const handleViewDocument = () => {
    if (selectedRequest?.approval_letter_url) {
      window.open(selectedRequest.approval_letter_url, '_blank', 'noopener,noreferrer');
    }
  };

  const getSubmittedTime = (req = selectedRequest) => {
    if (!req) return '—';
    if (req.booking_type === 'daily') return 'Whole Day';
    return `${formatTime(req.start_time)} – ${formatTime(req.end_time)}`;
  };

  // ── Derived values from the DB row ────────────────────────────────
  const savedVerification = getVerification(selectedRequest);
  const verificationStatus = savedVerification?.status;

  // "effective" OCR = a fresh scan if one was run, otherwise the saved extracted payload
  const effectiveOcr = ocrData || savedVerification?.extracted || null;

  const eq = (a, b) =>
    String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

  const buildComparison = () => {
    if (!effectiveOcr) return [];
    const submittedVenue = selectedRequest?.venues?.venue_name;
    const submittedDate  = selectedRequest?.start_time?.split('T')[0];
    const submittedTime  = getSubmittedTime();
    const submittedClub  = selectedRequest?.profiles?.full_name;

    return [
      { key:'clubName',  label:'Club name', submitted:submittedClub,               ocr:effectiveOcr.clubName,  match:eq(effectiveOcr.clubName,  submittedClub) },
      { key:'eventName', label:'Event name',submitted:selectedRequest?.event_name, ocr:effectiveOcr.eventName, match:eq(effectiveOcr.eventName, selectedRequest?.event_name) },
      { key:'eventDate', label:'Event date',submitted:submittedDate,               ocr:effectiveOcr.eventDate, match:eq(effectiveOcr.eventDate, submittedDate) },
      { key:'eventTime', label:'Time',      submitted:submittedTime,               ocr:effectiveOcr.eventTime, match:eq(effectiveOcr.eventTime, submittedTime) },
      { key:'venue',     label:'Venue',     submitted:submittedVenue,              ocr:effectiveOcr.venue,     match:eq(effectiveOcr.venue,     submittedVenue) },
      { key:'attendees', label:'Attendees', submitted:selectedRequest?.expected_attendees, ocr:effectiveOcr.attendees, match:Number(effectiveOcr.attendees) === Number(selectedRequest?.expected_attendees) },
      { key:'signatory', label:'Signatory', submitted:'—',                         ocr:effectiveOcr.signatory, match:!!effectiveOcr.signatory },
    ];
  };

  // ── OCR ───────────────────────────────────────────────────────────
  const handleExtractOcr = async () => {
    if (!selectedRequest?.approval_letter_url) return;
    setOcrLoading(true);
    setOcrError('');
    setOcrData(null);
    setDecision('');
    setVerificationError('');

    try {
      const res = await fetch(`${API}/api/ocr-from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedRequest.approval_letter_url }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `OCR failed (${res.status})`);
      }
      const extracted = await res.json();
      setOcrData(extracted);

      const allEmpty = ['clubName','eventName','eventDate','eventTime','venue','attendees','signatory']
        .every(k => extracted[k] == null || extracted[k] === '');
      if (allEmpty) {
        setOcrError('OCR could not read any fields. You can still mark the document as Unreadable.');
        setDecision(VERIFY_UNREADABLE);
      } else {
        const submittedClub  = selectedRequest?.profiles?.full_name;
        const submittedDate  = selectedRequest?.start_time?.split('T')[0];
        const submittedTime  = getSubmittedTime();
        const submittedVenue = selectedRequest?.venues?.venue_name;
        const anyMismatch =
          !eq(extracted.clubName,  submittedClub)  ||
          !eq(extracted.eventName, selectedRequest?.event_name) ||
          !eq(extracted.eventDate, submittedDate)  ||
          !eq(extracted.eventTime, submittedTime)  ||
          !eq(extracted.venue,     submittedVenue) ||
          Number(extracted.attendees) !== Number(selectedRequest?.expected_attendees);
        setDecision(anyMismatch ? VERIFY_MISMATCH : VERIFY_MATCHED);
      }
    } catch (err) {
      setOcrError(err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  // ── Save verification — UPSERT one row per booking ────────────────
  const handleSaveVerification = async () => {
    if (!selectedRequest) return;

    const fields = buildComparison();
    const mismatchRows = fields
      .filter(f => !f.match)
      .map(f => ({ field: f.key, submitted: f.submitted ?? null, ocr: f.ocr ?? null }));

    const autoStatus = mismatchRows.length > 0 ? VERIFY_MISMATCH : VERIFY_MATCHED;
    const status = decision || autoStatus;

    if ((status === VERIFY_MISMATCH || status === VERIFY_UNREADABLE) && remarks.trim().length < 10) {
      setVerificationError(`Please explain the ${status === VERIFY_UNREADABLE ? 'unreadable document' : 'mismatch'} (min 10 characters).`);
      return;
    }

    setVerificationError('');
    setSavingVerification(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        booking_id: selectedRequest.booking_id,
        verified_by: user.id,
        status,
        remarks: remarks.trim() || null,
        extracted: effectiveOcr || null,
        mismatches: mismatchRows,
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error: upErr } = await supabase
        .from('ocr_verifications')
        .upsert(payload, { onConflict: 'booking_id' })
        .select(`
          id, status, remarks, extracted, mismatches, created_at, updated_at,
          verifier:verified_by ( profile_id, full_name, role )
        `)
        .single();
      if (upErr) throw upErr;

      setSelectedRequest(prev => prev ? { ...prev, ocr_verifications: [saved] } : prev);
      setRequests(prev => prev.map(r =>
        r.booking_id === selectedRequest.booking_id
          ? { ...r, ocr_verifications: [saved] }
          : r));
      setOcrData(null);
    } catch (err) {
      setVerificationError(err.message);
    } finally {
      setSavingVerification(false);
    }
  };

  // ── Approve / Reject ──────────────────────────────────────────────
  const handleApprove = async () => {
    if (BLOCK_APPROVE_WITHOUT_VERIFICATION && !getVerification(selectedRequest)) {
      alert('Please save an OCR verification before approving.');
      return;
    }
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('approve_booking', {
        p_booking_id: selectedRequest.booking_id,
      });
      if (error) throw error;
      
      const patch = { status: AWAITING_PAYMENT };
      setRequests(prev => prev.map(r =>
        r.booking_id === selectedRequest.booking_id ? { ...r, ...patch } : r));
      setSelectedRequest(prev => ({ ...prev, ...patch }));
      
      // Deselect to clear the right panel and hide it from pending list
      setSelectedRequest(null);
    } catch (err) {
      alert('Error approving: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    const trimmed = rejectReason.trim();
    if (trimmed.length < 10) {
      setRejectError('Please enter at least 10 characters explaining the reason.');
      return;
    }
    setRejectError('');
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_booking', {
        p_booking_id: selectedRequest.booking_id,
        p_reason: trimmed,
      });
      if (error) throw error;
      
      const patch = { status: REJECTED, rejection_reason: data.rejection_reason ?? trimmed };
      setRequests(prev => prev.map(r =>
        r.booking_id === selectedRequest.booking_id ? { ...r, ...patch } : r));
      setSelectedRequest(prev => ({ ...prev, ...patch }));
      
      setShowRejectDialog(false);
      setRejectReason('');
      
      // Deselect to clear the right panel
      setSelectedRequest(null);
    } catch (err) {
      setRejectError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewChange = (key, value) =>
    setReviewFields(prev => ({ ...prev, [key]: value }));

  // ── Filters ───────────────────────────────────────────────────────
  const filteredAndSortedRequests = requests
    .filter(req => {
      // 1. Status Filter
      if (filterStatus === 'Pending') {
        if (req.status !== PENDING) return false;
      } else if (filterStatus === 'Awaiting Payment') {
        if (req.status !== AWAITING_PAYMENT) return false;
      } else if (filterStatus === 'Payment Submitted') {
        if (req.status !== PAYMENT_SUBMITTED) return false;
      }
      // If 'All Active', it passes through

      // 2. User Type Filter
      const role = req.profiles?.role;
      if (filterUserType === 'Student' && role !== 'student') return false;
      if (filterUserType === 'Club'    && role !== 'club_representative') return false;

      // 3. Search Query (Matches Ref, Applicant, Event Name, AND Venue Name)
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (req.profiles?.full_name || '').toLowerCase().includes(q) ||
        (req.event_name || '').toLowerCase().includes(q) ||
        (req.booking_ref || '').toLowerCase().includes(q) ||
        (req.venues?.venue_name || '').toLowerCase().includes(q);

      // 4. Venue Filter (Dropdown)
      const matchesVenue = filterVenue === 'All' || req.venues?.venue_name === filterVenue;

      return matchesSearch && matchesVenue;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest')    return new Date(b.submitted_at) - new Date(a.submitted_at);
      if (sortOrder === 'oldest')    return new Date(a.submitted_at) - new Date(b.submitted_at);
      if (sortOrder === 'date_asc')  return new Date(a.start_time) - new Date(b.start_time);
      if (sortOrder === 'date_desc') return new Date(b.start_time) - new Date(a.start_time);
      return 0;
    });

  const uniqueVenues = ['All', ...new Set(requests.map(r => r.venues?.venue_name).filter(Boolean))];
  const totalAmount =
    Number(selectedRequest?.quoted_rate || 0) + Number(selectedRequest?.quoted_deposit || 0);

  const suggestedStatus = (() => {
    if (!effectiveOcr) return '';
    const fields = buildComparison();
    return fields.some(f => !f.match) ? VERIFY_MISMATCH : VERIFY_MATCHED;
  })();

  const decisionOptions = [
    { value: VERIFY_MATCHED,    label: '✔ Verified (matches booking)', activeCls: 'border-[#17703A] bg-[#CDEFD6] text-[#17703A]' },
    { value: VERIFY_MISMATCH,   label: '⚠ Mismatch',                    activeCls: 'border-[#8A6D00] bg-[#FFF3CD] text-[#8A6D00]' },
    { value: VERIFY_UNREADABLE, label: '✖ Unreadable',                  activeCls: 'border-[#A12632] bg-[#FFCDCD] text-[#A12632]' },
  ];

  // Helper to render the status badge inside the list items
  const renderStatusBadge = (status) => {
    let colorClass = '';
    let label = '';
    
    switch (status) {
      case PENDING:
        colorClass = 'bg-[#FFF3CD] text-[#8A6D00]';
        label = 'Pending Approval';
        break;
      case AWAITING_PAYMENT:
        colorClass = 'bg-[#DCE8FF] text-[#1F4FA3]';
        label = 'Awaiting Pay';
        break;
      case PAYMENT_SUBMITTED:
        colorClass = 'bg-[#E6F4EA] text-[#17703A]';
        label = 'Payment Sub';
        break;
      default:
        return null;
    }

    return (
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-[#F6F4F5] overflow-hidden relative">
      <MPPSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setIsProfileOpen={setIsProfileOpen}
      />

      <main className="flex-1 flex flex-col p-4 md:p-10 h-full overflow-hidden">
        <div className="flex items-center gap-3 md:hidden mb-6">
          <button className="text-[#1F1A1C] p-1 -ml-1 cursor-pointer" onClick={() => setIsMobileMenuOpen(true)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="mb-8 shrink-0">
          <h1 className="text-2xl md:text-[28px] font-bold text-[#1F1A1C]">My Approval</h1>
          <p className="text-sm text-[#6B6468]">Review booking requests</p>
        </div>

        {loading ? (
          <p className="mt-10 text-[#6B6468]">Loading requests...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-[#E3DEE0] bg-white p-8 text-center text-[#6B6468]">
            No active booking requests at the moment. You're all caught up!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10 items-start h-full min-h-0">
            {/* LEFT LIST */}
            <div className="rounded-xl border border-[#E3DEE0] bg-white flex flex-col h-full overflow-hidden">
              {/* STICKY HEADER (Search & Filters) */}
              <div className="shrink-0 bg-white p-4 border-b border-[#E3DEE0] rounded-t-xl z-10">
                <h2 className="text-sm font-bold mb-4">
                  Active Requests ({filteredAndSortedRequests.length})
                </h2>

                <div className="flex flex-col gap-3">
                  {/* Status Filter */}
                  <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-2 border border-[#E3DEE0] rounded-lg text-[13px] font-semibold bg-[#F9F7F8] cursor-pointer"
                  >
                    <option value="All Active">All Active Requests</option>
                    <option value="Pending">Pending Approval</option>
                    <option value="Awaiting Payment">Awaiting Payment</option>
                    <option value="Payment Submitted">Payment Submitted</option>
                  </select>

                  <input 
                    type="text" 
                    placeholder="Search ref, applicant, event, or venue..."
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none" 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={filterUserType} 
                      onChange={(e) => setFilterUserType(e.target.value)}
                      className="col-span-2 p-2 border border-[#E3DEE0] rounded-lg text-[13px] bg-white cursor-pointer"
                    >
                      <option value="All">All Users</option>
                      <option value="Student">Students Only</option>
                      <option value="Club">Clubs Only</option>
                    </select>
                    <select 
                      value={filterVenue} 
                      onChange={(e) => setFilterVenue(e.target.value)}
                      className="p-2 border border-[#E3DEE0] rounded-lg text-[13px] bg-white cursor-pointer"
                    >
                      {uniqueVenues.map(v => <option key={v} value={v}>{v === 'All' ? 'All Venues' : v}</option>)}
                    </select>
                    <select 
                      value={sortOrder} 
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="p-2 border border-[#E3DEE0] rounded-lg text-[13px] bg-white cursor-pointer"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="date_asc">Date (Asc)</option>
                      <option value="date_desc">Date (Desc)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SCROLLABLE LIST */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {filteredAndSortedRequests.length === 0 ? (
                  <p className="text-xs text-[#6B6468] italic text-center py-4">No requests match the current filter.</p>
                ) : (
                  filteredAndSortedRequests.map((req) => {
                    const v = getVerification(req);
                    return (
                      <button key={req.booking_id}
                        onClick={() => { setSelectedRequest(req); setRejectReason(''); setRejectError(''); }}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          selectedRequest?.booking_id === req.booking_id
                            ? 'bg-[#F6E9EE] border-[#7A1F3D]'
                            : 'bg-[#FAF8F9] border-[#E3DEE0] hover:bg-[#F3EEF0]'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-[#1F1A1C] truncate">
                              {req.booking_ref || 'Unknown Ref'}
                          </p>
                          {/* Render status for EVERY request */}
                          {renderStatusBadge(req.status)}
                        </div>
                      
                        <p className="text-xs text-[#6B6468] truncate mt-1">
                          {req.venues?.venue_name} · {formatDate(req.start_time)}
                        </p>
                        {v && (
                          <p className={`mt-1 text-[10px] font-semibold ${
                            v.status === 'matched'   ? 'text-[#17703A]' :
                            v.status === 'mismatch'  ? 'text-[#8A6D00]' :
                            v.status === 'unreadable'? 'text-[#A12632]' :
                                                       'text-[#6B6468]'
                          }`}>
                            OCR: {v.status}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT DETAILS */}
            {selectedRequest && (
              <div className="rounded-xl border border-[#E3DEE0] bg-white p-6 md:p-8 w-full max-w-5xl h-full overflow-y-auto">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#1F1A1C]">
                    {selectedRequest.booking_ref} – {selectedRequest.venues?.venue_name}
                  </h2>
                  <div className="mt-1">
                    <span className="text-xs font-semibold text-[#6B6468] uppercase tracking-wider">
                      {selectedRequest.profiles?.role === 'club_representative' ? 'Club Representative' : 'Student'}
                    </span>
                  </div>

                  <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
                    ${selectedRequest.status === PENDING          ? 'bg-[#FFF3CD] text-[#8A6D00]' : ''}
                    ${selectedRequest.status === AWAITING_PAYMENT ? 'bg-[#DCE8FF] text-[#1F4FA3]' : ''}
                    ${selectedRequest.status === PAYMENT_SUBMITTED ? 'bg-[#E6F4EA] text-[#17703A]' : ''}
                  `}>
                    {selectedRequest.status === PENDING          && 'Pending Approval'}
                    {selectedRequest.status === AWAITING_PAYMENT && 'Approved – Awaiting Payment'}
                    {selectedRequest.status === PAYMENT_SUBMITTED && 'Payment Submitted'}
                  </div>

                  {/* OCR label — ONLY when a verification exists in the DB */}
                  {savedVerification && (
                    <div className="mt-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
                        verificationStatus === 'matched'    ? 'bg-[#CDEFD6] text-[#17703A]' :
                        verificationStatus === 'mismatch'   ? 'bg-[#FFF3CD] text-[#8A6D00]' :
                        verificationStatus === 'unreadable' ? 'bg-[#FFCDCD] text-[#A12632]' :
                                                              'bg-[#EDEDED] text-[#6B6468]'
                      }`}>
                        OCR: {verificationStatus}
                      </span>
                      {savedVerification.verifier?.full_name && (
                        <span className="ml-2 text-[#6B6468]">by {savedVerification.verifier.full_name}</span>
                      )}
                      {savedVerification.updated_at && (
                        <span className="ml-2 text-[#6B6468]">· {formatDateTime(savedVerification.updated_at)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-8">
                  <div><p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Applicant</p><p className="font-semibold text-sm text-[#1F1A1C]">{selectedRequest.profiles?.full_name}</p></div>
                  <div><p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Date & Time</p><p className="font-semibold text-sm text-[#1F1A1C]">
                    {formatDate(selectedRequest.start_time)}
                    {selectedRequest.booking_type === 'daily' ? ' (Whole Day)' : `, ${formatTime(selectedRequest.start_time)} – ${formatTime(selectedRequest.end_time)}`}
                  </p></div>
                  <div><p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Matric No</p><p className="font-semibold text-sm text-[#1F1A1C]">{selectedRequest.profiles?.matric_no || '—'}</p></div>
                  <div><p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">{selectedRequest.booking_type === 'daily' ? 'Daily Subtotal' : 'Hourly Subtotal'}</p><p className="font-semibold text-sm text-[#1F1A1C]">RM {Number(selectedRequest.quoted_rate || 0).toFixed(2)}</p></div>
                  <div><p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Purpose</p><p className="font-semibold text-sm text-[#1F1A1C]">{selectedRequest.purpose}</p></div>
                  <div><p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Deposit</p><p className="font-semibold text-sm text-[#1F1A1C]">RM {Number(selectedRequest.quoted_deposit || 0).toFixed(2)}</p></div>
                  <div><p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Attendees</p><p className="font-semibold text-sm text-[#1F1A1C]">{selectedRequest.expected_attendees} people</p></div>
                  <div><p className="text-xs font-semibold text-[#7A1F3D] uppercase mb-1">Total Amount</p><p className="font-bold text-base text-[#7A1F3D]">RM {totalAmount.toFixed(2)}</p></div>
                </div>

                {/* OCR block */}
                <div className="rounded-xl bg-[#F3EEF0] p-5 mb-8">
                  <h3 className="text-sm font-bold text-[#1F1A1C] mb-3">Approval letter + AI OCR check</h3>

                  {selectedRequest.approval_letter_url ? (
                    <div className="text-sm space-y-3">
                      <div className="flex flex-wrap gap-3 items-center">
                        <button onClick={handleViewDocument}
                          className="inline-flex items-center gap-1 text-[#7A1F3D] font-semibold hover:underline cursor-pointer">
                          📄 View Uploaded Document
                        </button>
                        <button onClick={handleExtractOcr} disabled={ocrLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#7A1F3D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#651830] disabled:opacity-50 cursor-pointer">
                          {ocrLoading ? (
                            <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Extracting…</>
                          ) : (<>🤖 {effectiveOcr ? 'Re-extract with AI' : 'Extract with AI'}</>)}
                        </button>
                      </div>

                      {ocrError && (
                        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{ocrError}</p>
                      )}

                      {/* Comparison table — only when there's OCR data (fresh or saved) */}
                      {effectiveOcr && decision !== VERIFY_UNREADABLE && (() => {
                        const fields = buildComparison();
                        const mismatches = fields.filter(f => !f.match).length;
                        return (
                          <div className="rounded-xl border border-[#E3DEE0] bg-white overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[#E3DEE0] bg-[#FAF9FA] px-4 py-3">
                              <h4 className="text-sm font-bold text-[#1F1A1C]">AI OCR Verification</h4>
                              {mismatches > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3CD] px-2.5 py-1 text-[11px] font-semibold text-[#8A6D00]">
                                  ⚠ {mismatches} mismatch{mismatches === 1 ? '' : 'es'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#CDEFD6] px-2.5 py-1 text-[11px] font-semibold text-[#17703A]">✔ All matched</span>
                              )}
                            </div>
                            <div className="grid grid-cols-[90px_1.1fr_1.1fr_1fr_28px] gap-3 border-b border-[#E3DEE0] bg-[#FAF9FA] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B6468]">
                              <span>Field</span><span>Submitted (DB)</span><span>OCR Extracted</span><span>MPP Review</span><span />
                            </div>
                            <div className="divide-y divide-[#E3DEE0]">
                              {fields.map(f => (
                                <div key={f.key} className={`grid grid-cols-[90px_1.1fr_1.1fr_1fr_28px] gap-3 px-4 py-2.5 text-[13px] items-center ${f.match ? '' : 'bg-[#FFF9E6]'}`}>
                                  <span className="font-medium text-[#6B6468]">{f.label}</span>
                                  <span className="text-[#1F1A1C] truncate min-w-0" title={String(f.submitted)}>{String(f.submitted ?? '—')}</span>
                                  <span className="text-[#1F1A1C] truncate min-w-0" title={String(f.ocr)}>{String(f.ocr ?? '—')}</span>
                                  <input type="text"
                                    value={reviewFields[f.key] ?? (f.ocr ?? '')}
                                    onChange={(e) => handleReviewChange(f.key, e.target.value)}
                                    className="w-full rounded border border-[#E3DEE0] bg-white px-2 py-1 text-[13px] outline-none focus:border-[#7A1F3D]" />
                                  <span className={`text-center ${f.match ? 'text-[#17703A]' : 'text-[#D97706]'}`}>{f.match ? '✔' : '⚠'}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-[#E3DEE0] bg-[#FAF9FA] px-4 py-2 text-[11px] text-[#6B6468]">
                              ✔ / ⚠ compares OCR against what the applicant submitted. The MPP Review column is for corrections only.
                            </div>
                          </div>
                        );
                      })()}

                      {/* Inline verification — only when there's OCR data (fresh or saved) */}
                      {effectiveOcr && (
                        <div className="rounded-xl border border-[#E3DEE0] bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-[#1F1A1C]">Mark verification</h4>
                            {verificationStatus && (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                verificationStatus === 'matched'    ? 'bg-[#CDEFD6] text-[#17703A]' :
                                verificationStatus === 'mismatch'   ? 'bg-[#FFF3CD] text-[#8A6D00]' :
                                verificationStatus === 'unreadable' ? 'bg-[#FFCDCD] text-[#A12632]' :
                                                                      'bg-[#EDEDED] text-[#6B6468]'
                              }`}>
                                Saved: {verificationStatus}
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-[#6B6468] mb-2">
                              Mark as
                              {suggestedStatus && (
                                <span className="ml-1 font-normal text-[#6B6468]">
                                  (system suggests: <strong className="text-[#1F1A1C]">{suggestedStatus}</strong>)
                                </span>
                              )}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {decisionOptions.map(opt => (
                                <label key={opt.value}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                                    decision === opt.value
                                      ? opt.activeCls
                                      : 'border-[#E3DEE0] bg-white text-[#1F1A1C] hover:bg-[#FAF8F9]'
                                  }`}>
                                  <input type="radio" name="verify-decision" value={opt.value}
                                    checked={decision === opt.value}
                                    onChange={() => { setDecision(opt.value); if (verificationError) setVerificationError(''); }}
                                    className="cursor-pointer" />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label htmlFor="verify-remarks" className="block text-xs font-semibold text-[#6B6468] mb-1">
                              Remarks for mismatched / unclear information
                              {(decision === VERIFY_MISMATCH || decision === VERIFY_UNREADABLE) && <span className="text-[#A12632]"> *</span>}
                            </label>
                            <textarea id="verify-remarks" rows={3} value={remarks}
                              onChange={(e) => { setRemarks(e.target.value.slice(0, 1000)); if (verificationError) setVerificationError(''); }}
                              placeholder="e.g. Letter states 120 attendees but booking is 100. Venue matches. Signatory unclear."
                              className="w-full resize-none rounded-lg border border-[#E3DEE0] px-3 py-2 text-sm outline-none focus:border-[#7A1F3D]" />
                            <div className="flex justify-between text-[11px] text-[#6B6468] mt-1">
                              <span className={verificationError ? 'text-[#A12632]' : ''}>
                                {verificationError || ((decision === VERIFY_MISMATCH || decision === VERIFY_UNREADABLE) ? 'Required (min 10 characters)' : 'Optional')}
                              </span>
                              <span>{remarks.length} / 1000</span>
                            </div>
                          </div>

                          <button onClick={handleSaveVerification}
                            disabled={savingVerification || !decision}
                            className="rounded-lg bg-[#7A1F3D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#651830] disabled:opacity-50 cursor-pointer">
                            {savingVerification ? 'Saving…' : 'Save verification'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[#6B6468] italic">Not Applicable (No document needed for shared venues)</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                  {selectedRequest.status === PENDING && (
                    <>
                      <button onClick={handleApprove} disabled={isProcessing}
                        className="rounded-lg bg-[#17703A] px-8 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 cursor-pointer">
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const latestRemarks = getVerification(selectedRequest)?.remarks;
                          setRejectReason(latestRemarks || '');
                          setRejectError('');
                          setShowRejectDialog(true);
                        }}
                        disabled={isProcessing}
                        className="rounded-lg bg-[#A12632] px-8 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer">
                        Reject
                      </button>
                    </>
                  )}
                  {selectedRequest.status === AWAITING_PAYMENT && (
                    <button onClick={() => alert('Reminder sent to applicant!')}
                      className="rounded-lg bg-[#F2B705] px-6 py-3 text-sm font-semibold text-[#1F1A1C] hover:bg-yellow-500 cursor-pointer">
                      Send Reminder
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#6B6468] mt-6 leading-relaxed">
                  Approve → Applicant has 24 hours to pay, otherwise the booking expires.
                  Reject → enter reason, slot reopens.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reject dialog */}
      {showRejectDialog && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => { if (!isProcessing) { setShowRejectDialog(false); setRejectError(''); } }}
          onKeyDown={(e) => { if (e.key === 'Escape' && !isProcessing) { setShowRejectDialog(false); setRejectError(''); } }}
          tabIndex={-1}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title">
            <div className="flex items-start justify-between border-b border-[#E3DEE0] bg-[#FAF9FA] p-5">
              <div>
                <h2 id="reject-dialog-title" className="text-lg font-bold text-[#1F1A1C]">Reject Booking Request</h2>
                <p className="mt-1 text-xs text-[#6B6468]">This will notify the applicant and release the slot.</p>
              </div>
              <button type="button" onClick={() => { if (isProcessing) return; setShowRejectDialog(false); setRejectError(''); }}
                disabled={isProcessing}
                className="rounded-full p-1 text-[#6B6468] hover:bg-white hover:text-[#A12632] disabled:opacity-50 cursor-pointer" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4 rounded-lg border border-[#E3DEE0] bg-[#FAF9FA] p-3">
                <p className="text-[11px] font-mono text-[#6B6468]">Ref: {selectedRequest.booking_ref || '—'}</p>
                <p className="text-sm font-semibold text-[#1F1A1C] mt-0.5">
                  {selectedRequest.profiles?.full_name} · {selectedRequest.venues?.venue_name}
                </p>
                <p className="mt-0.5 text-xs text-[#6B6468]">
                  {formatDate(selectedRequest.start_time)}
                  {selectedRequest.booking_type === 'daily' ? ' (Whole Day)' : `, ${formatTime(selectedRequest.start_time)} – ${formatTime(selectedRequest.end_time)}`}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#7A1F3D]">RM {totalAmount.toFixed(2)}</p>
              </div>
              <label htmlFor="reject-reason" className="mb-1 block text-xs font-semibold text-[#6B6468]">
                Reason for rejection <span className="text-[#A12632]">*</span>
              </label>
              <textarea id="reject-reason" autoFocus value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value.slice(0, 500)); if (rejectError) setRejectError(''); }}
                placeholder="e.g. Venue already reserved for a faculty event on this date."
                rows={5} disabled={isProcessing}
                className="w-full resize-none rounded-lg border border-[#E3DEE0] px-3 py-2 text-sm outline-none focus:border-[#7A1F3D] disabled:bg-gray-50" />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={rejectError ? 'text-[#A12632]' : 'text-[#6B6468]'}>{rejectError || 'Minimum 10 characters'}</span>
                <span className="text-[#6B6468]">{rejectReason.length} / 500</span>
              </div>
            </div>
            <div className="flex gap-3 border-t border-[#E3DEE0] bg-white p-4">
              <button type="button" onClick={() => { if (isProcessing) return; setShowRejectDialog(false); setRejectError(''); }}
                disabled={isProcessing}
                className="flex-1 rounded-lg border border-[#E3DEE0] bg-white py-2.5 text-sm font-semibold text-[#1F1A1C] hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleReject}
                disabled={isProcessing || rejectReason.trim().length < 10}
                className="flex-1 rounded-lg bg-[#A12632] py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                {isProcessing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}