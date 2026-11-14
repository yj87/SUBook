import { useEffect, useState } from 'react';
import ProfileModal from '../components/ProfileModal';
import MPPSidebar from '../components/MPPSidebar';
import { supabase } from '../supabaseClient';

const PENDING           = 'pending_approval';
const AWAITING_PAYMENT  = 'approved_awaiting_payment';
const CONFIRMED         = 'confirmed';
const REJECTED          = 'rejected';
const CANCELLED         = 'cancelled';
const EXPIRED           = 'expired';

const DEADLINE_FORMATTER = new Intl.DateTimeFormat('en-MY', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true,
  timeZone: 'Asia/Kuala_Lumpur',
});

export default function MPPPendingRequests() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVenue, setFilterVenue] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  const [filterUserType, setFilterUserType] = useState('All');

  // Action state
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchRequests = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            booking_id,
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
            venues ( venue_name, is_shared, capacity )
          `)
          .in('status', [
            PENDING,
            AWAITING_PAYMENT,
            CONFIRMED,
            REJECTED,
            CANCELLED,
            EXPIRED,
          ])
          .order('submitted_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (!cancelled) {
          setRequests(data || []);
          if (data && data.length > 0) setSelectedRequest(data[0]);
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

  // ── Formatters ────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-MY', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur',
    }).format(new Date(dateString));
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-MY', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur',
    }).format(new Date(dateString));
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return DEADLINE_FORMATTER.format(new Date(dateString));
  };

  const handleViewDocument = () => {
    if (selectedRequest?.approval_letter_url) {
      window.open(selectedRequest.approval_letter_url, '_blank', 'noopener,noreferrer');
    }
  };

  // ── OCR mock ──────────────────────────────────────────────────────
  const runOCRVerification = (request) => {
    if (!request || !request.approval_letter_url) return null;

    const mockAIData = {
      extracted_club_name:  request.profiles?.full_name || 'Unknown Club',
      extracted_venue_name: request.venues?.venue_name || 'Unknown Venue',
      extracted_date:       request.start_time.split('T')[0],
      extracted_issue_date: new Date().toISOString().split('T')[0],
      extracted_attendees:  request.expected_attendees,
      extracted_signatory:  'Dean of Faculty',
    };

    const ai = mockAIData;
    const clubMatch = ai.extracted_club_name.toLowerCase()
      .includes(request.profiles?.full_name?.toLowerCase() || '');
    const reqDate   = request.start_time.split('T')[0];
    const dateMatch = ai.extracted_date === reqDate;
    const venueMatch = ai.extracted_venue_name.toLowerCase()
      .includes(request.venues?.venue_name?.toLowerCase() || '');

    const validSignatories = ['dean', 'head of faculty', 'mpp president', 'professor', 'dr.'];
    const signatoryMatch = validSignatories.some(t =>
      ai.extracted_signatory.toLowerCase().includes(t));

    const letterDate = new Date(ai.extracted_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validityMatch = letterDate.getTime() >= today.getTime();

    const capacityMatch = ai.extracted_attendees <= (request.venues?.capacity || 0);

    return { clubMatch, dateMatch, venueMatch, signatoryMatch, validityMatch, capacityMatch };
  };

  const ocrResult = selectedRequest ? runOCRVerification(selectedRequest) : null;

  const renderCheck = (label, status, type = 'match') => {
    if (status === null) return <p className="text-[#6B6468] italic">Pending OCR...</p>;
    if (type === 'warning') {
      return (
        <p className={status ? 'text-[#17703A]' : 'text-[#D97706]'}>
          {status ? '✔' : '⚠️'} {label}
        </p>
      );
    }
    return (
      <p className={status ? 'text-[#17703A]' : 'text-[#D57171]'}>
        {status ? '✔' : '✖'} {label}
      </p>
    );
  };

  // ── Approve (backend RPC) ─────────────────────────────────────────
  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('approve_booking', {
        p_booking_id: selectedRequest.booking_id,
      });
      if (error) throw error;

      const patch = { status: AWAITING_PAYMENT };
      setRequests(requests.map(r =>
        r.booking_id === selectedRequest.booking_id ? { ...r, ...patch } : r));
      setSelectedRequest({ ...selectedRequest, ...patch });
    } catch (err) {
      alert('Error approving: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────
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

    const patch = {
      status: REJECTED,
      rejection_reason: data.rejection_reason ?? trimmed,
    };
    setRequests(requests.map(r =>
      r.booking_id === selectedRequest.booking_id ? { ...r, ...patch } : r));
    setSelectedRequest({ ...selectedRequest, ...patch });
    setShowRejectDialog(false);
    setRejectReason('');
  } catch (err) {
    setRejectError(err.message);
  } finally {
    setIsProcessing(false);
  }
};

  // ── Filter + sort ─────────────────────────────────────────────────
  const filteredAndSortedRequests = requests
    .filter(req => {
      const role = req.profiles?.role;
      if (filterUserType === 'Student' && role !== 'student') return false;
      if (filterUserType === 'Club'    && role !== 'club_representative') return false;

      const matchesSearch =
        (req.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.event_name || '').toLowerCase().includes(searchQuery.toLowerCase());

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
    Number(selectedRequest?.quoted_rate || 0) +
    Number(selectedRequest?.quoted_deposit || 0);

  return (
    <div className="flex h-screen bg-[#F6F4F5] overflow-hidden relative">
      <MPPSidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setIsProfileOpen={setIsProfileOpen}
      />

      <main className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto h-full">
        <div className="flex items-center gap-3 md:hidden mb-6">
          <button
            className="text-[#1F1A1C] p-1 -ml-1 cursor-pointer"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl md:text-[28px] font-bold text-[#1F1A1C]">My Approval</h1>
          <p className="text-sm text-[#6B6468]">Review booking requests</p>
        </div>

        {loading ? ( 
          <p className="mt-10 text-[#6B6468]">Loading requests...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-[#E3DEE0] bg-white p-8 text-center text-[#6B6468]">
            No booking requests at the moment. You're all caught up!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            {/* LEFT: Requests List */}
            <div className="rounded-xl border border-[#E3DEE0] bg-white p-4">
              <h2 className="text-sm font-bold mb-4">
                Pending requests ({requests.filter(r => r.status === PENDING).length})
              </h2>

              <div className="flex flex-col gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search applicant or event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filterUserType}
                    onChange={(e) => setFilterUserType(e.target.value)}
                    className="col-span-2 p-2 border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none bg-white cursor-pointer"
                  >
                    <option value="All">All Users</option>
                    <option value="Student">Students Only</option>
                    <option value="Club">Clubs Only</option>
                  </select>

                  <select
                    value={filterVenue}
                    onChange={(e) => setFilterVenue(e.target.value)}
                    className="p-2 border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none bg-white cursor-pointer"
                  >
                    {uniqueVenues.map(v => (
                      <option key={v} value={v}>{v === 'All' ? 'All Venues' : v}</option>
                    ))}
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="p-2 border border-[#E3DEE0] rounded-lg text-[13px] focus:border-[#7A1F3D] outline-none bg-white cursor-pointer"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="date_asc">Date (Asc)</option>
                    <option value="date_desc">Date (Desc)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {filteredAndSortedRequests.length === 0 ? (
                  <p className="text-xs text-[#6B6468] italic text-center py-4">
                    No matching requests found.
                  </p>
                ) : (
                  filteredAndSortedRequests.map((req) => (
                    <button
                      key={req.booking_id}
                      onClick={() => {
                        setSelectedRequest(req);
                        setRejectReason('');
                        setRejectError('');
                      }}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        selectedRequest?.booking_id === req.booking_id
                          ? 'bg-[#F6E9EE] border-[#7A1F3D]'
                          : 'bg-[#FAF8F9] border-[#E3DEE0] hover:bg-[#F3EEF0]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-[#1F1A1C] truncate">
                          {req.profiles?.full_name || 'Unknown User'}
                        </p>
                        {req.status !== PENDING && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold
                            ${req.status === AWAITING_PAYMENT ? 'bg-[#DCE8FF] text-[#1F4FA3]' : ''}
                            ${req.status === CONFIRMED        ? 'bg-[#CDEFD6] text-[#17703A]' : ''}
                            ${req.status === REJECTED         ? 'bg-[#FFCDCD] text-[#D57171]' : ''}
                            ${req.status === CANCELLED        ? 'bg-[#EDEDED] text-[#6B6468]' : ''}
                            ${req.status === EXPIRED          ? 'bg-[#F2E3CC] text-[#8A6D00]' : ''}
                          `}>
                            {req.status === AWAITING_PAYMENT && 'Awaiting Pay'}
                            {req.status === CONFIRMED        && 'Confirmed'}
                            {req.status === REJECTED         && 'Rejected'}
                            {req.status === CANCELLED        && 'Cancelled'}
                            {req.status === EXPIRED          && 'Expired'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B6468] truncate mt-1">
                        {req.venues?.venue_name} · {formatDate(req.start_time)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: Details Panel */}
            {selectedRequest && (
              <div className="rounded-xl border border-[#E3DEE0] bg-white p-6 md:p-8 w-full max-w-3xl">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#1F1A1C]">
                    {selectedRequest.profiles?.full_name} – {selectedRequest.venues?.venue_name}
                  </h2>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#6B6468] uppercase tracking-wider">
                      {selectedRequest.profiles?.role === 'club_representative'
                        ? 'Club Representative'
                        : 'Student'}
                    </span>
                  </div>

                  <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
                    ${selectedRequest.status === PENDING          ? 'bg-[#FFF3CD] text-[#8A6D00]' : ''}
                    ${selectedRequest.status === AWAITING_PAYMENT ? 'bg-[#DCE8FF] text-[#1F4FA3]' : ''}
                    ${selectedRequest.status === CONFIRMED        ? 'bg-[#CDEFD6] text-[#17703A]' : ''}
                    ${selectedRequest.status === REJECTED         ? 'bg-[#FFCDCD] text-[#D57171]' : ''}
                    ${selectedRequest.status === CANCELLED        ? 'bg-[#EDEDED] text-[#6B6468]' : ''}
                    ${selectedRequest.status === EXPIRED          ? 'bg-[#F2E3CC] text-[#8A6D00]' : ''}
                  `}>
                    {selectedRequest.status === PENDING          && 'Pending Approval'}
                    {selectedRequest.status === AWAITING_PAYMENT && 'Approved – Awaiting Payment'}
                    {selectedRequest.status === CONFIRMED        && 'Confirmed'}
                    {selectedRequest.status === REJECTED         && 'Rejected'}
                    {selectedRequest.status === CANCELLED        && 'Cancelled'}
                    {selectedRequest.status === EXPIRED          && 'Expired'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-8">
                  <div>
                    <p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Applicant</p>
                    <p className="font-semibold text-sm text-[#1F1A1C]">
                      {selectedRequest.profiles?.full_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Date & Time</p>
                    <p className="font-semibold text-sm text-[#1F1A1C]">
                      {formatDate(selectedRequest.start_time)}
                      {selectedRequest.booking_type === 'daily'
                        ? ' (Whole Day)'
                        : `, ${formatTime(selectedRequest.start_time)} – ${formatTime(selectedRequest.end_time)}`}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Matric No</p>
                    <p className="font-semibold text-sm text-[#1F1A1C]">
                      {selectedRequest.profiles?.matric_no || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">
                      {selectedRequest.booking_type === 'daily' ? 'Daily Subtotal' : 'Hourly Subtotal'}
                    </p>
                    <p className="font-semibold text-sm text-[#1F1A1C]">
                      RM {Number(selectedRequest.quoted_rate || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Purpose</p>
                    <p className="font-semibold text-sm text-[#1F1A1C]">{selectedRequest.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Deposit</p>
                    <p className="font-semibold text-sm text-[#1F1A1C]">
                      RM {Number(selectedRequest.quoted_deposit || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#6B6468] uppercase mb-1">Attendees</p>
                    <p className="font-semibold text-sm text-[#1F1A1C]">
                      {selectedRequest.expected_attendees} people
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#7A1F3D] uppercase mb-1">Total Amount</p>
                    <p className="font-bold text-base text-[#7A1F3D]">
                      RM {totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-[#F3EEF0] p-5 mb-8">
                  <h3 className="text-sm font-bold text-[#1F1A1C] mb-3">
                    {selectedRequest.status === PENDING          && 'Uploaded approval letter + AI OCR check'}
                    {selectedRequest.status === AWAITING_PAYMENT && 'Payment window (24 hours)'}
                    {selectedRequest.status === CONFIRMED        && 'Booking summary'}
                    {selectedRequest.status === REJECTED         && 'Rejection details'}
                    {selectedRequest.status === CANCELLED        && 'Cancellation details'}
                    {selectedRequest.status === EXPIRED          && 'Expired'}
                  </h3>

                  {selectedRequest.status === PENDING && (
                    <div className="text-sm space-y-1.5">
                      {selectedRequest.approval_letter_url ? (
                        ocrResult && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                            {renderCheck('Club name matches', ocrResult.clubMatch)}
                            {renderCheck('Event date matches request', ocrResult.dateMatch)}
                            {renderCheck('Venue matches selection', ocrResult.venueMatch)}
                            {renderCheck('Valid signatory detected', ocrResult.signatoryMatch, 'warning')}
                            {renderCheck('Letter date is valid (Today or Future)', ocrResult.validityMatch, 'warning')}
                            {renderCheck(`Attendees within capacity (${selectedRequest.venues?.capacity})`, ocrResult.capacityMatch, 'warning')}
                          </div>
                        )
                      ) : (
                        <p className="text-[#6B6468] italic mb-3">
                          Not Applicable (No document needed for shared venues)
                        </p>
                      )}

                      {selectedRequest.approval_letter_url && (
                        <div className="mt-3 pt-3 border-t border-[#E3DEE0]">
                          <button
                            onClick={handleViewDocument}
                            className="inline-flex items-center gap-1 text-[#7A1F3D] font-semibold hover:underline cursor-pointer"
                          >
                            View Uploaded Document
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRequest.status === AWAITING_PAYMENT && (
                    <div className="text-sm text-[#6B6468]">
                      <p>Waiting for the applicant to make payment. The slot is held for 24 hours.</p>
                      <p className="mt-2">
                        Amount due:{' '}
                        <span className="font-semibold text-[#1F1A1C]">
                          RM {totalAmount.toFixed(2)}
                        </span>
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === CONFIRMED && (
                    <div className="text-sm text-[#17703A] font-semibold">
                      <p>This booking is fully confirmed.</p>
                      {selectedRequest.paid_at && (
                        <p className="mt-1 text-xs font-normal text-[#6B6468]">
                          Paid on {formatDateTime(selectedRequest.paid_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedRequest.status === REJECTED && (
                    <div className="text-sm text-[#6B6468]">
                      <p className="font-semibold text-[#1F1A1C] mb-1">Reject Reason</p>
                      <p>{selectedRequest.rejection_reason || '—'}</p>
                    </div>
                  )}

                  {selectedRequest.status === CANCELLED && (
                    <div className="text-sm text-[#6B6468]">
                      <p>This booking was cancelled.</p>
                    </div>
                  )}

                  {selectedRequest.status === EXPIRED && (
                    <div className="text-sm text-[#6B6468]">
                      <p>
                        The payment deadline passed without a successful payment.
                        The slot has been released.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  {selectedRequest.status === PENDING && (
                    <>
                      <button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="rounded-lg bg-[#17703A] px-8 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectReason('');
                          setRejectError('');
                          setShowRejectDialog(true);
                        }}
                        disabled={isProcessing}
                        className="rounded-lg bg-[#A12632] px-8 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {selectedRequest.status === AWAITING_PAYMENT && (
                    <button
                      onClick={() => alert('Reminder sent to applicant!')}
                      className="rounded-lg bg-[#F2B705] px-6 py-3 text-sm font-semibold text-[#1F1A1C] hover:bg-yellow-500 cursor-pointer"
                    >
                      Send Reminder
                    </button>
                  )}

                  {(selectedRequest.status === CONFIRMED ||
                    selectedRequest.status === REJECTED ||
                    selectedRequest.status === CANCELLED ||
                    selectedRequest.status === EXPIRED) && (
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="rounded-lg border border-[#7A1F3D] bg-white px-6 py-3 text-sm font-semibold text-[#7A1F3D] hover:bg-[#FAF3F6] cursor-pointer"
                    >
                      ← Back to List
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#6B6468] mt-6 leading-relaxed">
                  Approve → Applicant has 24 hours to pay, otherwise the booking expires.
                  Reject → enter reason, slot reopens.
                  Payment is confirmed automatically on the applicant side.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Reject Confirmation Dialog ─────────────────────────────── */}
      {showRejectDialog && selectedRequest && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isProcessing) {
              setShowRejectDialog(false);
              setRejectError('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !isProcessing) {
              setShowRejectDialog(false);
              setRejectError('');
            }
          }}
          tabIndex={-1}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-dialog-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E3DEE0] bg-[#FAF9FA] p-5">
              <div>
                <h2 id="reject-dialog-title" className="text-lg font-bold text-[#1F1A1C]">
                  Reject Booking Request
                </h2>
                <p className="mt-1 text-xs text-[#6B6468]">
                  This will notify the applicant and release the slot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isProcessing) return;
                  setShowRejectDialog(false);
                  setRejectError('');
                }}
                disabled={isProcessing}
                className="rounded-full p-1 text-[#6B6468] hover:bg-white hover:text-[#A12632] disabled:opacity-50 cursor-pointer"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <div className="mb-4 rounded-lg border border-[#E3DEE0] bg-[#FAF9FA] p-3">
                <p className="text-sm font-semibold text-[#1F1A1C]">
                  {selectedRequest.profiles?.full_name} · {selectedRequest.venues?.venue_name}
                </p>
                <p className="mt-0.5 text-xs text-[#6B6468]">
                  {formatDate(selectedRequest.start_time)}
                  {selectedRequest.booking_type === 'daily'
                    ? ' (Whole Day)'
                    : `, ${formatTime(selectedRequest.start_time)} – ${formatTime(selectedRequest.end_time)}`}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#7A1F3D]">
                  RM {totalAmount.toFixed(2)}
                </p>
              </div>

              <label htmlFor="reject-reason" className="mb-1 block text-xs font-semibold text-[#6B6468]">
                Reason for rejection <span className="text-[#A12632]">*</span>
              </label>
              <textarea
                id="reject-reason"
                autoFocus
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value.slice(0, 500));
                  if (rejectError) setRejectError('');
                }}
                placeholder="e.g. Venue already reserved for a faculty event on this date."
                rows={5}
                disabled={isProcessing}
                className="w-full resize-none rounded-lg border border-[#E3DEE0] px-3 py-2 text-sm text-[#1F1A1C] outline-none focus:border-[#7A1F3D] disabled:bg-gray-50"
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={rejectError ? 'text-[#A12632]' : 'text-[#6B6468]'}>
                  {rejectError || 'Minimum 10 characters'}
                </span>
                <span className="text-[#6B6468]">{rejectReason.length} / 500</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-[#E3DEE0] bg-white p-4">
              <button
                type="button"
                onClick={() => {
                  if (isProcessing) return;
                  setShowRejectDialog(false);
                  setRejectError('');
                }}
                disabled={isProcessing}
                className="flex-1 rounded-lg border border-[#E3DEE0] bg-white py-2.5 text-sm font-semibold text-[#1F1A1C] hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessing || rejectReason.trim().length < 10}
                className="flex-1 rounded-lg bg-[#A12632] py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
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