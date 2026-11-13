import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/LoginPage';
import Onboarding from './pages/OnboardingPage';
import AuthCallback from './pages/AuthCallback';
import StudentDashboard from './pages/StudentDashboard';
import MPPDashboard from './pages/MPPDashboard';
import ClubDashboard from './pages/ClubDashboard';
import VenueCatalogue from './pages/VenueCatalogue';
import VenueDetails from './pages/VenueDetails';
import AvailabilityPlaceholder from './pages/AvailabilityPlaceholder';
import BookingRequestPlaceholder from './pages/BookingRequestPlaceholder';
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'
import Contact from './pages/Contact'
import AdminLoginPage from './pages/AdminLoginPage'
import ClubRepLoginPage from './pages/ClubRepLoginPage'
import StudentFAQPage from './pages/StudentFAQ'; 
import ClubFAQPage from './pages/ClubFAQ';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import ClubBookingApproval from './pages/ClubBookingApproval';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login/admin" element={<AdminLoginPage />} />
        <Route path="/login/club" element={<ClubRepLoginPage />} />

        {/* ONBOARDING (Any logged-in user) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>
        {/* STUDENT AND CLUB REPRESENTATIVE VENUE BROWSING */}
        <Route element={<ProtectedRoute allowedRoles={['student', 'club_representative']} />}>
          <Route path="/venues" element={<VenueCatalogue />} />
          <Route path="/venues/:venueId" element={<VenueDetails />} />
          <Route path="/venues/:venueId/availability" element={<AvailabilityPlaceholder />} />
          <Route path="/booking-request" element={<BookingRequestPlaceholder />} />
          <Route path="/booking-request/success" element={<BookingConfirmationPage />} />
        </Route>

        {/* STUDENT ROUTES ONLY */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-faq" element={<StudentFAQPage />} />

        </Route>

        {/* CLUB REPRESENTATIVE ROUTES ONLY */}
        <Route element={<ProtectedRoute allowedRoles={['club_representative']} />}>
          <Route path="/club-dashboard" element={<ClubDashboard />} />
          <Route path="/club-faq" element={<ClubFAQPage />} />
          <Route path="/booking-request/approval" element={<ClubBookingApproval />} />
        </Route>

        {/* MPP ADMIN ROUTES ONLY */}
        <Route element={<ProtectedRoute allowedRoles={['mpp_admin']} />}>
          <Route path="/mpp-dashboard" element={<MPPDashboard />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
