export const BOOKING_STATUS_STYLES = {
  pending: { label: 'Pending', tone: 'amber', dot: 'bg-amber-500' },
  pending_approval: { label: 'Pending', tone: 'amber', dot: 'bg-amber-500' },
  approved_awaiting_payment: { label: 'Awaiting payment', tone: 'red', dot: 'bg-[#DC2626]' },
  confirmed: { label: 'Confirmed', tone: 'green', dot: 'bg-emerald-500' },
  expired: { label: 'Expired', tone: 'gray', dot: 'bg-slate-500' },
  rejected: { label: 'Rejected', tone: 'red', dot: 'bg-red-600' },
};

export const BOOKING_STATUS_TONE_CLASSES = {
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  red: 'border-red-300 bg-red-50 text-red-900',
  green: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  gray: 'border-slate-300 bg-slate-100 text-slate-700',
  blue: 'border-blue-300 bg-blue-50 text-blue-900',
};

export const getBookingStatusStyle = (status) => (
  BOOKING_STATUS_STYLES[status] || { label: status, tone: 'blue', dot: 'bg-slate-500' }
);
