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

  // D1.4 & D1.5 States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVenue, setFilterVenue] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  const [filterUserType, setFilterUserType] = useState('All'); 

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
            profiles ( full_name, matric_no, role ), 
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

  // --- REAL VERIFICATION LOGIC ---
  const runOCRVerification = (request) => {
    if (!request || !request.approval_letter_url) return null;

    const mockAIData = {
      extracted_club_name: request.profiles?.full_name || 'Unknown Club',
      extracted_venue_name: request.venues?.venue_name || 'Unknown Venue',
      extracted_date: request.start_time.split('T')[0],
      extracted_issue_date: new Date().toISOString().split('T')[0],
      extracted_attendees: request.expected_attendees,
      extracted_signatory: "Dean of Faculty" 
    };

    const ai = mockAIData;
    const clubMatch = ai.extracted_club_name.toLowerCase().includes(request.profiles?.full_name?.toLowerCase() || '');
    const reqDate = request.start_time.split('T')[0];
    const dateMatch = ai.extracted_date === reqDate;
    const venueMatch = ai.extracted_venue_name.toLowerCase().includes(request.venues?.venue_name?.toLowerCase() || '');
    
    const validSignatories = ['dean', 'head of faculty', 'mpp president', 'professor', 'dr.'];
    const signatoryMatch = validSignatories.some(title => ai.extracted_signatory.toLowerCase().includes(title));

    const letterDate = new Date(ai.extracted_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validityMatch = letterDate.getTime() >= today.getTime();

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

  // =====================================================================
  // FILTERING AND SORTING
  // =====================================================================
  const filteredAndSortedRequests = requests
    .filter(req => {
      const role = req.profiles?.role;
      if (filterUserType === 'Student' && role !== 'student') return false;
      if (filterUserType === 'Club' && role !== 'club_representative') return false;

      const matchesSearch = 
        (req.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.event_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVenue = filterVenue === 'All' || req.venues?.venue_name === filterVenue;

      return matchesSearch && matchesVenue;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.submitted_at) - new Date(a.submitted_at);
      if (sortOrder === 'oldest') return new Date(a.submitted_at) - new Date(b.submitted_at);
      if (sortOrder === 'date_asc') return new Date(a.start_time) - new Date(b.start_time);
      if (sortOrder === 'date_desc') return new Date(b.start_time) - new Date(a.start_time);
      return 0;
    });

  const uniqueVenues = ['All', ...new Set(requests.map(r => r.venues?.venue_name).filter(Boolean))];

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
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
            
            {/* LEFT: Requests List */}
            <div className="rounded-xl border border-[#E3DEE0] bg-white p-4">
              <h2 className="text-sm font-bold mb-4">Pending requests ({requests.filter(r => r.status === 'pending_approval').length})</h2>
              
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
                  <p className="text-xs text-[#6B6468] italic text-center py-4">No matching requests found.</p>
                ) : (
                  filteredAndSortedRequests.map((req) => (
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
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: Details Panel */}
            {selectedRequest && (
              <div className="rounded-xl border border-[#E3DEE0] bg-white p-6 md:p-8 max-w-3xl">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#1F1A1C]">
                    {selectedRequest.profiles?.full_name} – {selectedRequest.venues?.venue_name}
                  </h2>
                  
                  <div className="mt-1 flex items-center gap-2">
                     <span className="text-xs font-semibold text-[#6B6468] uppercase tracking-wider">
                        {selectedRequest.profiles?.role === 'club_representative' ? 'Club Representative' : 'Student'}
                     </span>
                  </div>

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
                  
                  {/* DYNAMIC RATE & TOTAL CALCULATION */}
                  {(() => {
                    const rate = Number(selectedRequest.quoted_rate || 0);
                    const deposit = Number(selectedRequest.quoted_deposit || 0);
                    
                    // Calculate duration
                    let multiplier = 1;
                    let unitLabel = '';

                    if (selectedRequest.booking_type === 'daily') {
                      // For daily, count the number of days (rough calculation based on start/end dates)
                      const start = new Date(selectedRequest.start_time);
                      const end = new Date(selectedRequest.end_time);
                      const diffTime = Math.abs(end - start);
                      multiplier = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                      unitLabel = 'Daily Rate';
                    } else {
                      // For hourly, calculate the difference in hours
                      const start = new Date(selectedRequest.start_time);
                      const end = new Date(selectedRequest.end_time);
                      const diffTime = Math.abs(end - start);
                      multiplier = Math.round(diffTime / (1000 * 60 * 60)) || 1;
                      unitLabel = 'Hourly Rate';
                    }

                    const totalRental = rate * multiplier;
                    const total = totalRental + deposit;

                    return (
                      <>
                        <p>
                          <strong>{unitLabel}:</strong> RM {rate.toFixed(2)} 
                          {multiplier > 1 && <span className="text-[#6B6468]"> × {multiplier} {selectedRequest.booking_type === 'daily' ? 'days' : 'hours'}</span>}
                        </p>
                        <p><strong>Deposit:</strong> RM {deposit.toFixed(2)}</p>
                        <p className="font-bold text-[#7A1F3D] mt-2 text-base">
                          Total: RM {total.toFixed(2)}
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Document & OCR Check */}
                <div className="rounded-xl bg-[#F3EEF0] p-5 mb-8">
                  <h3 className="text-sm font-bold text-[#1F1A1C] mb-3">
                    {selectedRequest.status === 'pending_approval' ? 'Uploaded approval letter + AI OCR check' : 'Payment window (24 hours)'}
                  </h3>
                  
                  {selectedRequest.status === 'pending_approval' && (
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