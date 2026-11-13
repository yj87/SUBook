import { useEffect, useState } from 'react';
import ProfileModal from '../components/ProfileModal';
import MPPSidebar from '../components/MPPSidebar';
import { supabase } from '../supabaseClient';

export default function MPPPendingRequests() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

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
            profiles ( full_name, matric_no ),
            venues ( venue_name, is_shared, capacity )
          `)
          .in('status', ['pending_approval', 'payment_submitted', 'approved', 'rejected'])
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

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateString));
  };
  const formatTime = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-MY', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(dateString));
  };

  const handleViewDocument = () => {
    if (selectedRequest?.approval_letter_url) {
      window.open(selectedRequest.approval_letter_url, '_blank', 'noopener,noreferrer');
    }
  };

  // =====================================================================
  // THE REAL VERIFICATION ENGINE
  // =====================================================================
  const runOCRVerification = (request) => {
    if (!request || !request.approval_letter_url) return null;

    // --- TEAMMATE TODO: REPLACE THIS WITH REAL AI OCR API CALL ---
    const mockAIData = {
      extracted_club_name: request.profiles?.full_name || 'Unknown Club',
      extracted_venue_name: request.venues?.venue_name || 'Unknown Venue',
      extracted_date: request.start_time.split('T')[0], // Matches booking
      extracted_issue_date: new Date().toISOString().split('T')[0], // Issued today
      extracted_attendees: request.expected_attendees,
      extracted_signatory: "Dean of Faculty" 
    };
    // -------------------------------------------------------------

    const ai = mockAIData;

    // 1. Club Name Matches
    const clubMatch = ai.extracted_club_name.toLowerCase().includes(request.profiles?.full_name?.toLowerCase() || '');

    // 2. Event Date Matches Requested Date
    const reqDate = request.start_time.split('T')[0];
    const dateMatch = ai.extracted_date === reqDate;

    // 3. Venue Alias Check
    const venueMatch = ai.extracted_venue_name.toLowerCase().includes(request.venues?.venue_name?.toLowerCase() || '');

    // 4. Signatory Check
    const validSignatories = ['dean', 'head of faculty', 'mpp president', 'professor', 'dr.'];
    const signatoryMatch = validSignatories.some(title => ai.extracted_signatory.toLowerCase().includes(title));

    // 5. Validity Window Check (Must be today or in the future)
    const letterDate = new Date(ai.extracted_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate day comparison
    
    // Check if the letter's date is today or later
    const validityMatch = letterDate.getTime() >= today.getTime();

    // 6. Attendee Capacity Check
    const capacityMatch = ai.extracted_attendees <= (request.venues?.capacity || 0);

    return {
      clubMatch,
      dateMatch,
      venueMatch,
      signatoryMatch,
      validityMatch,
      capacityMatch
    };
  };

  const ocrResult = selectedRequest ? runOCRVerification(selectedRequest) : null;

  // UI Helper to render a checkmark, warning, or cross
  const renderCheck = (label, status, type = 'match') => {
    if (status === null) return <p className="text-[#6B6468] italic">Pending OCR...</p>;
    
    if (type === 'warning') {
      return (
        <p className={status ? "text-[#17703A]" : "text-[#D97706]"}>
          {status ? '✔' : '⚠️'} {label}
        </p>
      );
    }
    
    return (
      <p className={status ? "text-[#17703A]" : "text-[#D57171]"}>
        {status ? '✔' : '✖'} {label}
      </p>
    );
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'payment_submitted' })
        .eq('booking_id', selectedRequest.booking_id);
      
      if (error) throw error;
      
      setRequests(requests.map(r => r.booking_id === selectedRequest.booking_id ? { ...r, status: 'payment_submitted' } : r));
      setSelectedRequest({ ...selectedRequest, status: 'payment_submitted' });
    } catch (err) {
      alert('Error approving: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please enter a reason for rejection.');
      return;
    }
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected', rejection_reason: rejectReason })
        .eq('booking_id', selectedRequest.booking_id);
      
      if (error) throw error;
      
      setRequests(requests.map(r => r.booking_id === selectedRequest.booking_id ? { ...r, status: 'rejected' } : r));
      setSelectedRequest({ ...selectedRequest, status: 'rejected', rejection_reason: rejectReason });
      setShowRejectInput(false);
      setRejectReason('');
    } catch (err) {
      alert('Error rejecting: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('booking_id', selectedRequest.booking_id);
      
      if (error) throw error;
      
      setRequests(requests.map(r => r.booking_id === selectedRequest.booking_id ? { ...r, status: 'confirmed' } : r));
      setSelectedRequest({ ...selectedRequest, status: 'confirmed' });
    } catch (err) {
      alert('Error confirming payment: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F6F4F5] overflow-hidden relative">
      
      <MPPSidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
        setIsProfileOpen={setIsProfileOpen} 
      />

      <main className="flex-1 flex flex-col p-4 md:p-10 overflow-y-auto h-full">
        <div className="flex items-center gap-3 md:hidden mb-6">
          <button className="text-[#1F1A1C] p-1 -ml-1 cursor-pointer" onClick={() => setIsMobileMenuOpen(true)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
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
            No pending requests at the moment. You're all caught up!
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 items-start">
            
            {/* LEFT: Requests List */}
            <div className="rounded-xl border border-[#E3DEE0] bg-white p-4">
              <h2 className="text-sm font-bold mb-4">Pending requests ({requests.filter(r => r.status === 'pending_approval').length})</h2>
              <div className="flex flex-col gap-3">
                {requests.map((req) => (
                  <button
                    key={req.booking_id}
                    onClick={() => {
                      setSelectedRequest(req);
                      setShowRejectInput(false);
                      setRejectReason('');
                    }}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      selectedRequest?.booking_id === req.booking_id 
                        ? 'bg-[#F6E9EE] border-[#7A1F3D]' 
                        : 'bg-[#FAF8F9] border-[#E3DEE0] hover:bg-[#F3EEF0]'
                    }`}
                  >
                    <p className="font-semibold text-sm text-[#1F1A1C] truncate">
                      {req.profiles?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-[#6B6468] truncate mt-1">
                      {req.venues?.venue_name} · {formatDate(req.start_time)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: Details Panel */}
            {selectedRequest && (
              <div className="rounded-xl border border-[#E3DEE0] bg-white p-6 md:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#1F1A1C]">
                    {selectedRequest.profiles?.full_name} – {selectedRequest.venues?.venue_name}
                  </h2>
                  
                  {/* Status Badge */}
                  <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
                    ${selectedRequest.status === 'pending_approval' ? 'bg-[#FFF3CD] text-[#8A6D00]' : ''}
                    ${selectedRequest.status === 'payment_submitted' ? 'bg-[#DCE8FF] text-[#1F4FA3]' : ''}
                    ${selectedRequest.status === 'confirmed' ? 'bg-[#CDEFD6] text-[#17703A]' : ''}
                    ${selectedRequest.status === 'rejected' ? 'bg-[#FFCDCD] text-[#D57171]' : ''}
                  `}>
                    {selectedRequest.status === 'pending_approval' && 'Pending Approval'}
                    {selectedRequest.status === 'payment_submitted' && 'Approved – Awaiting Payment'}
                    {selectedRequest.status === 'confirmed' && 'Confirmed'}
                    {selectedRequest.status === 'rejected' && 'Rejected'}
                  </div>
                </div>

                {/* Booking Info */}
                <div className="text-sm text-[#1F1A1C] space-y-1 mb-6">
                  <p><strong>Matric No:</strong> {selectedRequest.profiles?.matric_no || '—'}</p>
                  <p><strong>Date & Time:</strong> {formatDate(selectedRequest.start_time)}, {selectedRequest.booking_type === 'daily' ? 'Whole Day' : `${formatTime(selectedRequest.start_time)} – ${formatTime(selectedRequest.end_time)}`}</p>
                  <p><strong>Purpose:</strong> {selectedRequest.purpose}</p>
                  <p><strong>Attendees:</strong> {selectedRequest.expected_attendees}</p>
                  <p><strong>Rate:</strong> RM {Number(selectedRequest.quoted_rate || 0).toFixed(2)} fee + RM {Number(selectedRequest.quoted_deposit || 0).toFixed(2)} deposit</p>
                </div>

                {/* Document & OCR Check */}
                <div className="rounded-xl bg-[#F3EEF0] p-5 mb-8">
                  <h3 className="text-sm font-bold text-[#1F1A1C] mb-3">
                    {selectedRequest.status === 'pending_approval' ? 'Uploaded approval letter + AI OCR check' : 'Payment window (24 hours)'}
                  </h3>
                  
                  {selectedRequest.status === 'pending_approval' && (
                    <div className="text-sm space-y-1.5">
                      
                      {/* THE 6 SMART CHECKS */}
                      {selectedRequest.approval_letter_url ? (
                        ocrResult && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                            {/* 1 & 2: Club & Date */}
                            {renderCheck('Club name matches', ocrResult.clubMatch)}
                            {renderCheck('Event date matches request', ocrResult.dateMatch)}
                            
                            {/* 3: Venue */}
                            {renderCheck('Venue matches selection', ocrResult.venueMatch)}
                            
                            {/* 4: Signatory (Warning style) */}
                            {renderCheck('Valid signatory detected', ocrResult.signatoryMatch, 'warning')}
                            
                            {/* 5: Validity Window (Warning style) */}
                            {renderCheck('Letter date is valid (Today or Future)', ocrResult.validityMatch, 'warning')}
                            
                            {/* 6: Capacity (Warning style) */}
                            {renderCheck(`Attendees within capacity (${selectedRequest.venues?.capacity})`, ocrResult.capacityMatch, 'warning')}
                          </div>
                        )
                      ) : (
                        <p className="text-[#6B6468] italic mb-3">Not Applicable (No document needed for shared venues)</p>
                      )}

                      {selectedRequest.approval_letter_url && (
                        <div className="mt-3 pt-3 border-t border-[#E3DEE0]">
                          <button 
                            onClick={handleViewDocument}
                            className="inline-flex items-center gap-1 text-[#7A1F3D] font-semibold hover:underline cursor-pointer"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            View Uploaded Document
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRequest.status === 'payment_submitted' && (
                    <div className="text-sm text-[#6B6468]">
                      <p>Waiting for the club to make payment. The slot is held for 24 hours.</p>
                    </div>
                  )}

                  {selectedRequest.status === 'rejected' && (
                    <div className="text-sm text-[#6B6468]">
                      <p className="font-semibold text-[#1F1A1C] mb-1">Reject Reason</p>
                      <p>{selectedRequest.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  {selectedRequest.status === 'pending_approval' && !showRejectInput && (
                    <>
                      <button onClick={handleApprove} disabled={isProcessing} className="rounded-lg bg-[#17703A] px-8 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 cursor-pointer">Approve</button>
                      <button onClick={() => setShowRejectInput(true)} disabled={isProcessing} className="rounded-lg bg-[#A12632] px-8 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer">Reject</button>
                    </>
                  )}

                  {showRejectInput && (
                    <div className="w-full">
                      <textarea
                        placeholder="Enter reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full p-3 border border-[#E3DEE0] rounded-lg mb-3 text-sm focus:border-[#7A1F3D] outline-none"
                        rows={3}
                      />
                      <div className="flex gap-3">
                        <button onClick={handleReject} disabled={isProcessing} className="rounded-lg bg-[#A12632] px-6 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 cursor-pointer">Confirm Reject</button>
                        <button onClick={() => setShowRejectInput(false)} className="rounded-lg bg-gray-200 px-6 py-2 text-sm font-semibold text-[#1F1A1C] hover:bg-gray-300 cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  )}

                  {selectedRequest.status === 'payment_submitted' && (
                    <>
                      <button onClick={() => alert('Reminder sent to club!')} className="rounded-lg bg-[#F2B705] px-6 py-3 text-sm font-semibold text-[#1F1A1C] hover:bg-yellow-500 cursor-pointer">Send Reminder</button>
                      <button onClick={handleConfirmPayment} disabled={isProcessing} className="rounded-lg bg-[#17703A] px-6 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 cursor-pointer">Paid → Confirm</button>
                    </>
                  )}

                  {selectedRequest.status === 'rejected' && (
                    <button onClick={() => setSelectedRequest(null)} className="rounded-lg bg-[#A12632] px-8 py-3 text-sm font-semibold text-white hover:bg-red-800 cursor-pointer">← Back to List</button>
                  )}

                  {selectedRequest.status === 'confirmed' && (
                    <p className="text-sm text-[#17703A] font-semibold w-full">This booking is fully confirmed.</p>
                  )}
                </div>

                <p className="text-xs text-[#6B6468] mt-6 leading-relaxed">
                  Approve → Approved – Awaiting Payment (24h window, else Auto-Cancelled – Unpaid).
                  Reject → enter reason, slot reopens.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}