import { useState } from 'react';
import TopNavbar from '../components/TopNavbar';
import ProfileModal from '../components/ProfileModal';

const studentFaqs = [
  {
    id: 1,
    question: "How do I book a venue at the Student Union Building (SUB)?",
    answer: "Booking a venue is simple. Go to the 'Venue & Booking' menu and click 'Book Venue'. Browse the list of available venues, check the real-time availability calendar, and select your preferred date and time slot. Fill out the booking form with your event details, purpose, and expected attendance. Since you are booking as an individual student, you do not need to upload an approval letter. Once submitted, your request will be sent to the MPP Admin for review.",
  },
  {
    id: 2,
    question: "How do I register for an event listed on the website?",
    answer: "To register for a club or society event, go to the 'Events' page from the main navigation bar. Browse the upcoming events and click 'View Details' on the one you like. If registration is still open, you will see a 'Register Now' button. Clicking this will redirect you to the organizer's external platform (like Google Forms) to complete your registration and any associated payments. If the button says 'Registration Closed', you can still view the event details, but you can no longer sign up.",
  },
  {
    id: 3,
    question: "How can I check the status of my venue booking?",
    answer: "You can track all your bookings in real-time by going to your dashboard and clicking 'Booking History'. The table will show the venue, date, time, and the current status of each request. A 'Pending Approval' status means MPP is reviewing it. 'Approved – Awaiting Payment' means you need to pay. 'Confirmed' means the venue is secured. If rejected, you can view the MPP's reason in the details.",
  },
  {
    id: 4,
    question: "When do I need to pay for my venue booking?",
    answer: "Payment is required only for certain venues or bookings, depending on the MPP's current policies. If payment is required, once your booking is approved, the system will update the status to 'Approved – Awaiting Payment'. You will receive a notification with the payment instructions and a strict 24-hour deadline. Click 'Proceed to Payment' to complete your transaction through our secure gateway. Your booking will only be confirmed after successful payment verification. If you fail to pay within the 24-hour window, the system will automatically cancel your booking and release the slot to other students.",
  },
  {
    id: 5,
    question: "What happens if I don't pay within the 24-hour deadline?",
    answer: "Our system enforces a strict 24-hour payment window after MPP approval to ensure venues are not held up unnecessarily. If you fail to complete the payment within this timeframe, the system will automatically transition your booking to 'Cancelled – Unpaid'. The time slot will instantly be released back to the public calendar for other students or clubs to book. You will receive an automated notification informing you of the cancellation.",
  },
  {
    id: 6,
    question: "Can I cancel my booking after it is confirmed?",
    answer: "Currently, the system does not support automated self-cancellation for confirmed bookings. If you have an emergency and absolutely must cancel a confirmed venue booking, you must contact the MPP administration directly via the Help & Support contact channels. Please note that cancellation policies, including potential deposit forfeitures, will be handled on a case-by-case basis by the MPP.",
  },
  {
    id: 7,
    question: "How do I update my profile picture and personal info?",
    answer: "Click on the 'Student' dropdown in the top right corner of your dashboard and select 'Profile Settings'. From there, you can update your full name, phone number, and matric number. To change your profile picture, click 'Change Profile' and choose to either upload a new image from your device, take a photo using your webcam, or revert to your default Google profile picture.",
  },
  {
    id: 8,
    question: "What should I do if the venue is already booked?",
    answer: "If a venue is already booked for your desired time, the system will automatically grey out that time slot on the calendar, preventing you from selecting it. If you have an urgent event and the venue is unavailable, we recommend checking alternative venues like the Activity Hall or Seminar Hall, or contacting the club that booked it to see if they are willing to share the space.",
  }
];

export default function StudentFAQ() {
  const [openId, setOpenId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleFAQ = (id) => {
    if (openId === id) setOpenId(null);
    else setOpenId(id);
  };

  const leftFaqs = studentFaqs.slice(0, 4);
  const rightFaqs = studentFaqs.slice(4, 8);

  const renderFaqCard = (faq) => {
    const isOpen = openId === faq.id;
    return (
      <div key={faq.id} className="bg-white rounded-[8px] shadow-[0_15px_45px_-10px_rgba(0,0,0,0.15)] transition-all duration-300 w-full">
        <button onClick={() => toggleFAQ(faq.id)} className="w-full flex items-start justify-between p-6 text-left focus:outline-none group">
          <span className="text-[#1B1139] font-semibold text-[16px] pr-4 leading-snug">{faq.question}</span>
          <div className="shrink-0 mt-0.5">
            {isOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12H19" stroke="#7A1F3D" strokeWidth="3" strokeLinecap="round"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="#1B1139" strokeWidth="3" strokeLinecap="round"/></svg>
            )}
          </div>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <p className="px-6 pb-6 text-[#6B6468] text-sm leading-relaxed">{faq.answer}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFF] flex flex-col relative overflow-x-hidden font-inter h-screen overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="absolute right-[-100px] top-[50px] w-[400px] h-[400px] bg-[#DB6D6F] rounded-full opacity-10 blur-3xl pointer-events-none"></div>

      <TopNavbar role="student" onProfileOpen={setIsProfileOpen} />

      <main className="flex-1 max-w-[1100px] mx-auto w-full px-4 md:px-8 py-10 md:py-20 relative z-10">
        <h1 className="text-[#7A1F3D] font-bold text-3xl md:text-[40px] text-center mb-10 md:mb-16 tracking-wide">
          Frequently Ask Questions
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
          <div className="flex flex-col gap-4 md:gap-8">{leftFaqs.map(renderFaqCard)}</div>
          <div className="flex flex-col gap-4 md:gap-8">{rightFaqs.map(renderFaqCard)}</div>
        </div>
      </main>

      <button className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-[#7A1F3D] w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-[#5c162d] transition-colors z-50">
        <span className="text-white text-base md:text-lg font-bold">AI</span>
      </button>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}