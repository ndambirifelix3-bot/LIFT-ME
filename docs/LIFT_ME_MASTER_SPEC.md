LIFT ME
 MASTER PRODUCT, ARCHITECTURE, UI/UX, SECURITY &
 DEVELOPMENT SPECIFICATION
Project: Lift Me
Product category: Ride-hailing and mobility platform
Initial market: Kenya
Future expansion: United States of America
Platforms: Android, iOS and Web Admin Dashboard
Brand identity: Luxury — Black, Gold and White
Tagline: Move with confidence.
Development approach: Phased, step-by-step development
Document purpose: Master source of truth for product planning, software architecture,
development, testing and launch.



TABLE OF CONTENTS
   1. Project Overview
   2. Product Vision and Objectives
   3. Target Users and User Roles
   4. Product Requirements
   5. MVP Features and Future Features
   6. Business Model
   7. Technology Stack
   8. System Architecture
   9. Architecture Essentials
  10. Passenger Application — Screen-by-Screen Specification
  11. Driver Application — Screen-by-Screen Specification
  12. Admin Dashboard — Screen-by-Screen Specification
  13. UI/UX Design System
  14. User Journeys and Ride Lifecycle
  15. Maps, Location and Dispatch Architecture
  16. Payment Architecture
  17. Database and Data Architecture
  18. Security Requirements
  19. API Architecture
  20. Notifications and Real-Time Communication
  21. Kenya-First and USA-Ready Requirements
  22. Testing and Quality Assurance
  23. Deployment and Infrastructure
  24. Development Roadmap
  25. Developer Master Instructions
  26. Phase-by-Phase Development Prompts
  27. Definition of Done
  28. Launch Readiness Checklist
  29. Important Product and Engineering Rules



1. PROJECT OVERVIEW
Lift Me is a technology-driven ride-hailing platform designed to connect passengers with verified
drivers through a reliable, secure and convenient mobile application.
The platform will provide functionality comparable in category to established mobility services
such as Uber and Bolt, while establishing its own brand identity, customer experience and
operational model.
Lift Me will initially launch in Kenya, with its architecture designed to support future expansion into
the United States.
The platform will consist of three main applications:
   1. Passenger mobile application.
   2. Driver mobile application.
   3. Administrative web dashboard.
The passenger application allows customers to request rides, receive fare estimates, track drivers,
pay for trips and access customer support.
The driver application allows drivers to register, submit verification documents, receive ride
requests, navigate to passengers, complete trips and monitor earnings.
The administrative dashboard gives authorized staff the ability to manage users, drivers, vehicles,
trips, payments, pricing, service areas, complaints and operational performance.
The system must be designed as a real production-oriented application, not merely a visual
demonstration.

 Core Product Principles
      Safety first.
      Premium user experience.
      Reliable ride matching.
      Transparent pricing.
      Secure payments.
      Verified drivers.
      Accurate real-time trip information.
      Scalable architecture.
      Market-specific configuration.
      Privacy by design.
      Maintainable and testable software.



2. PRODUCT VISION AND OBJECTIVES
 2.1 Vision
To build a trusted, premium and accessible mobility platform that makes transportation easier, safer
and more convenient.

 2.2 Mission
To connect passengers and professional drivers through technology that prioritizes reliability,
transparency, safety and excellent customer experience.

 2.3 Product Objectives
   1. Enable passengers to request rides from their smartphones.
   2. Allow drivers to register and receive trip requests.
   3. Provide real-time driver and trip tracking.
   4. Calculate transparent ride estimates.
   5. Support locally appropriate payment methods.
   6. Provide efficient driver onboarding and verification.
   7. Give administrators control over platform operations.
   8. Build a scalable foundation for international expansion.
   9. Protect personal, financial and location information.
  10. Establish a premium and recognizable brand.

 2.4 Initial Launch Strategy
Kenya will be the first operating market.
The initial pilot should focus on a clearly defined service area rather than launching nationwide
immediately.
The selected pilot city and service zones must be configured through the administration system.
The architecture must support additional cities, countries and currencies without rewriting the core
ride-hailing logic.
3. TARGET USERS AND USER ROLES
 3.1 Passengers
Passengers are individuals who use Lift Me to request transportation.
They should be able to:
      Register and log in.
      Manage their profiles.
      Set pickup and destination locations.
      View estimated fares.
      Select available ride categories.
      Request rides.
      Track assigned drivers.
      Contact drivers through supported communication channels.
      Complete payments.
      View ride history.
      Rate completed trips.
      Report issues.
      Access safety features.

 3.2 Drivers
Drivers are approved service providers who use Lift Me to receive and complete ride requests.
They should be able to:
      Register.
      Submit personal information.
      Upload identification documents.
      Register vehicle details.
      Complete verification.
      View application status.
      Go online and offline when eligible.
      Receive ride requests.
      Accept or reject offers.
      Navigate to passengers.
      Start and complete trips.
      View earnings.
      Access trip history.
      Receive support.

 3.3 Administrators
Administrators manage platform operations.
They should be able to:
     View operational statistics.
     Manage passengers.
     Review driver applications.
     Approve or reject driver documents.
     Manage vehicles.
     Monitor live rides.
     Investigate complaints.
     Manage pricing.
     Configure service areas.
     Monitor payments and payouts.
     Review audit logs.
     Manage support and safety cases.

 3.4 Internal Roles
Implement role-based access control.
Suggested roles:
     Super Administrator
     Operations Administrator
     Driver Verification Officer
     Customer Support Agent
     Finance Officer
     Safety Officer
     Read-only Analyst
Every role must have clearly defined permissions.
Administrative access must be restricted according to the user's assigned permissions and market
scope.



4. PRODUCT REQUIREMENTS
 4.1 Passenger Requirements
The passenger app must provide:

Account Management
     Phone number registration.
     OTP verification.
     Secure login.
     Profile management.
     Session management.
     Account recovery.
     Account deletion request.

Ride Booking
     Current location detection.
     Manual pickup selection.
     Destination search.
     Map-based location selection.
     Saved addresses.
     Pickup instructions.
     Fare estimation.
     Ride category selection.
     Payment method selection.
     Ride request confirmation.

Trip Management
     Driver matching.
     Driver details.
     Vehicle details.
     Driver arrival estimate.
     Live location updates.
     Trip progress.
     Trip completion.
     Digital receipt.
     Trip cancellation where permitted.

Customer Experience
     Ride history.
     Ratings.
     Support.
     Safety information.
     Payment history.
     Notifications.
     Account settings.

 4.2 Driver Requirements
Registration
     Phone verification.
     Personal information.
     Driver identification.
    Driving licence information.
    Profile photograph.
    Vehicle information.
    Vehicle documents.
    Required verification checks.

Driver Operations
    Online/offline availability.
    Location updates.
    Incoming trip offers.
    Accept/reject functionality.
    Navigation to pickup.
    Passenger arrival confirmation.
    Trip start confirmation.
    Active trip management.
    Trip completion.
    Earnings overview.

Driver Account
    Profile.
    Verification status.
    Document expiry.
    Vehicle management.
    Trip history.
    Earnings.
    Payout information.
    Support.

 4.3 Admin Requirements
    Secure administrator login.
    Multi-factor authentication.
    Dashboard analytics.
    Live ride monitoring.
    Passenger management.
    Driver management.
    Driver verification.
    Vehicle management.
    Payment monitoring.
    Refund management.
    Support management.
    Safety case management.
    Pricing configuration.
    Service area configuration.
    Market configuration.
      Audit logs.
      Reports.



5. MVP FEATURES AND FUTURE FEATURES
 5.1 Minimum Viable Product
The first version should prioritize the features necessary to operate a real pilot.

Passenger MVP
      Registration and login.
      Phone verification.
      Passenger profile.
      Pickup selection.
      Destination search.
      Fare estimates.
      Ride category selection.
      Ride request.
      Driver matching.
      Driver details.
      Live tracking.
      Trip completion.
      Payment integration in sandbox and controlled production rollout.
      Ride history.
      Basic support.

Driver MVP
      Registration.
      Document submission.
      Admin verification.
      Driver availability.
      Ride offers.
      Accept/reject.
      Pickup navigation.
      Trip start.
      Trip completion.
      Earnings summary.
      Trip history.

Admin MVP
      Admin authentication.
      Dashboard.
      Driver approval.
      Passenger management.
      Live ride management.
      Trip history.
      Payment monitoring.
      Basic pricing and service-area configuration.
      Support case management.
      Audit logs.

 5.2 Future Features
The architecture should allow future implementation of:
      Scheduled rides.
      Multiple stops.
      Airport transfers.
      Business accounts.
      Corporate billing.
      Family accounts.
      Promo codes.
      Loyalty programmes.
      Subscription plans.
      Ride sharing.
      Premium vehicle categories.
      Delivery services.
      Driver incentives.
      Advanced fraud detection.
      Automated support.
      Automated demand forecasting.
      Advanced analytics.
      Multi-language support.
      Driver referral programmes.
Do not implement every future feature in the first release.
Prioritize a reliable and safe core ride-hailing experience.



6. BUSINESS MODEL
Potential revenue streams include:
   1. Commission on completed rides.
   2. Booking or service fees where legally and commercially appropriate.
   3. Premium ride categories.
   4. Corporate transportation agreements.
   5. Business accounts.
   6. Future subscription services.
   7. Other approved mobility services.
The platform must allow administrators to configure commission rates and applicable fees by
market and ride category.
Do not hard-code commission percentages into the mobile applications.
All financial calculations must be performed or validated by the backend.
The company must obtain appropriate legal, tax, insurance and business advice before operating
commercially.



7. TECHNOLOGY STACK
Use a modern, maintainable TypeScript-based technology stack.

 7.1 Passenger Mobile Application
Recommended:
       React Native.
       Expo.
       TypeScript.
       Expo Router or an equivalent typed navigation solution.
       React Query/TanStack Query for server-state management.
       Zustand or another lightweight state manager where needed.
       React Hook Form.
       Zod validation.
The passenger application must support:
       Android.
       iOS.
       Responsive layouts.
       Location permissions.
       Maps.
       Push notifications.
       Secure session handling.

 7.2 Driver Mobile Application
Use:
      React Native.
      Expo.
      TypeScript.
      Typed navigation.
      TanStack Query.
      Secure local credential storage.
      Location services.
      Push notifications.
      WebSocket communication where appropriate.
The driver experience must minimize distraction while driving.
Investigate platform-specific background location requirements before implementation. Do not
assume ordinary foreground GPS functionality is sufficient for background trip tracking.

 7.3 Admin Dashboard
Recommended:
      Next.js.
      TypeScript.
      React.
      Tailwind CSS.
      A consistent accessible component library.
      Typed API client.
      Role-based interface permissions.
The dashboard should be responsive and optimized for desktop operations.

 7.4 Backend
Recommended:
      Node.js.
      NestJS.
      TypeScript.
      REST API.
      WebSockets for real-time communication.
      PostgreSQL.
      PostGIS.
      Redis.
      Database migrations.
      OpenAPI documentation.
Begin with a modular monolith.
Do not begin with microservices unless a measured technical or operational requirement justifies
them.
 7.5 Infrastructure
Potential infrastructure:
      Managed PostgreSQL.
      Redis service.
      Private object storage.
      Containerized backend.
      CI/CD pipeline.
      Centralized logging.
      Monitoring and alerting.
      Automated backups.
      Secrets manager.
Choose cloud services based on cost, regional availability, reliability and compliance.



8. SYSTEM ARCHITECTURE
 8.1 High-Level Architecture
The system consists of three client applications communicating with a central backend.
                    LIFT ME PLATFORM

         ┌─────────────────────────────┐
         │       MOBILE CLIENTS        │
         │                              │
         │   Passenger App Driver App   │
         │      Android / iOS           │
         └──────────────┬──────────────┘
                        │
                        │ HTTPS / WebSocket
                        ▼
         ┌─────────────────────────────┐
         │       API / BACKEND         │
         │                             │
         │ Authentication              │
         │ User Management              │
         │ Driver Management            │
         │ Ride Management               │
         │ Dispatch Engine               │
         │ Fare Calculation              │
         │ Payments                      │
         │ Notifications                 │
         │ Safety and Support            │
         └──────────────┬──────────────┘
                        │
            ┌───────────┼─────────────┐
            ▼           ▼             ▼
     PostgreSQL       Redis      External Providers
     + PostGIS                     Maps / Payments
                                   SMS / Push
            ▲
            │
         ┌──┴──────────────────────┐
         │      ADMIN DASHBOARD    │
         │          Next.js        │
         └─────────────────────────┘




 8.2 Backend Modules
Organize the backend into independent business modules:
   1. Authentication Module
   2. Users Module
   3. Passengers Module
   4. Drivers Module
   5. Vehicles Module
   6. Driver Verification Module
   7. Markets Module
   8. Service Areas Module
   9. Maps Module
  10. Pricing Module
  11. Ride Quotes Module
  12. Rides Module
  13. Dispatch Module
  14. Location Module
  15. Payments Module
  16. Refunds Module
  17. Payouts Module
  18. Notifications Module
  19. Ratings Module
  20. Support Module
  21. Safety Module
  22. Admin Module
  23. Reporting Module
  24. Audit Module
Each module must have clear responsibilities and typed interfaces.
Avoid unnecessary dependencies between modules.
 8.3 Recommended Project Structure
  lift-me/
  │
  ├── apps/
  │   ├── passenger-mobile/
  │   ├── driver-mobile/
  │   └── admin-web/
  │
  ├── services/
  │   └── api/
  │
  ├── packages/
  │   ├── shared-types/
  │   ├── validation/
  │   ├── api-client/
  │   ├── design-system/
  │   ├── configuration/
  │   └── utilities/
  │
  ├── infrastructure/
  │   ├── docker/
  │   ├── deployment/
  │   ├── monitoring/
  │   └── scripts/
  │
  ├── docs/
  │   ├── PRODUCT_REQUIREMENTS.md
  │   ├── ARCHITECTURE.md
  │   ├── ARCHITECTURE_ESSENTIALS.md
  │   ├── UI_UX_BLUEPRINT.md
  │   ├── SECURITY.md
  │   ├── DATA.md
  │   ├── API_SPECIFICATION.md
  │   ├── DEVELOPMENT_ROADMAP.md
  │   └── DEVELOPER_INSTRUCTIONS.md
  │
  ├── .env.example
  ├── .gitignore
  ├── README.md
  └── package.json


The developer may recommend a different structure after inspecting the repository. Any structural
change must be justified and documented.
9. ARCHITECTURE ESSENTIALS
 9.1 Architecture Style
Use a modular monolith for the first production version.
Benefits:
      Easier development.
      Simpler deployment.
      Lower infrastructure costs.
      Easier debugging.
      Clear module boundaries.
      Easier testing.
      Future migration options.

 9.2 Core Architecture Rules
   1. The backend is the source of truth.
   2. Mobile applications must not independently determine authoritative fares.
   3. The backend determines whether a driver is eligible to receive rides.
   4. The backend controls ride-state transitions.
   5. Payment confirmation must come from verified payment-provider events.
   6. Sensitive documents must be stored privately.
   7. All administrative actions must be authorized and audited.
   8. All financial operations must be traceable.
   9. Market-specific behavior must be configurable.
  10. Real-time messages must be authenticated and authorized.
  11. APIs must be versioned.
  12. Database changes must use migrations.
  13. Important operations must be idempotent.
  14. Ride dispatch must handle simultaneous requests safely.
 9.3 Suggested Ride States
  REQUESTED
      |
      ▼
  SEARCHING
      |
      ▼
  DRIVER_ASSIGNED
      |
      ▼
  DRIVER_ARRIVING
      |
      ▼
  DRIVER_ARRIVED
      |
      ▼
  IN_PROGRESS
      |
      ▼
  COMPLETED


Additional states:
      CANCELLED
      EXPIRED
      NO_DRIVER_FOUND
      PAYMENT_PENDING
      PAYMENT_FAILED
Payment state must remain separate from ride state.
For example, a trip can be completed while payment remains pending.
Only valid state transitions should be accepted by the backend.

 9.4 Scalability
Prepare the system for future horizontal scaling through:
      Stateless API instances where possible.
      Redis for temporary coordination and presence.
      Database indexing.
      Efficient location queries.
      Queue-based background jobs where needed.
      Monitoring.
      Rate limiting.
      Database connection management.
Do not introduce unnecessary complexity before traffic requires it.
10. PASSENGER APPLICATION — SCREEN-BY-
SCREEN SPECIFICATION
The passenger app must use a premium, simple and intuitive design.

 P01 — Splash Screen
Purpose: Introduce the Lift Me brand.
Elements:
     Lift Me logo.
     Black background.
     Gold brand accent.
     Loading indicator where necessary.

 P02 — Welcome and Onboarding
Elements:
     Brand message.
     Short explanation of the service.
     Sign in.
     Create account.

 P03 — Registration and Login
Elements:
     Country code selector.
     Phone number input.
     Continue button.
     Privacy and terms links.
Use E.164-compatible phone number normalization.

 P04 — OTP Verification
Elements:
     OTP input.
     Resend timer.
     Verification status.
     Error handling.
Never log verification codes.

 P05 — Profile Setup
Elements:
      Full name.
      Email where required.
      Profile photograph optional.
      Profile completion.

 P06 — Home and Booking
Elements:
      Map.
      Current location.
      Pickup address.
      Destination search.
      Saved locations.
      Booking entry point.

 P07 — Destination Search
Elements:
      Search field.
      Search suggestions.
      Recent locations.
      Saved places.
      Map selection.

 P08 — Confirm Pickup
Elements:
      Draggable pickup marker.
      Address display.
      Landmark instructions.
      Confirm pickup.
Validate that the pickup is within an enabled service area.

 P09 — Ride Options and Fare Estimate
Elements:
      Ride categories.
      Estimated arrival.
      Fare estimate.
      Payment selection.
      Fare breakdown.
      Confirm ride.
The backend must generate the authoritative fare quote.

 P10 — Finding a Driver
Elements:
      Matching animation.
      Search status.
      Cancellation option where permitted.
      Recovery if no driver is available.
Never display invented drivers or false matching results.

 P11 — Driver Assigned
Elements:
      Driver's name.
      Approved profile image.
      Vehicle details.
      Registration plate.
      Verified rating if available.
      Estimated arrival.
      Contact options.
      Pickup PIN where configured.

 P12 — Active Trip
Elements:
      Live trip map.
      Trip status.
      Destination.
      Safety access.
      Share trip.
      Support.

 P13 — Trip Completed
Elements:
     Trip summary.
     Final fare.
     Payment status.
     Receipt.
     Rating.
     Report issue.

 P14 — Activity and Ride History
Elements:
     Previous rides.
     Date.
     Pickup.
     Destination.
     Fare.
     Ride status.
     Receipt access.

 P15 — Wallet and Payment Methods
Elements:
     Available payment methods.
     Transaction history.
     Payment status.
For Kenya:
     M-Pesa integration when configured.
     Supported card payment provider.
For the USA:
     Supported local card and wallet methods, subject to provider availability.
Never store raw card numbers or CVVs.

 P16 — Account and Settings
Elements:
     Profile.
     Phone number.
     Email.
     Saved locations.
     Language.
     Notifications.
     Privacy.
     Terms.
     Logout.
     Account deletion request.

 P17 — Help and Safety
Elements:
     Frequently asked questions.
     Report a problem.
     Contact support.
     Trip-related assistance.
     Safety guidance.



11. DRIVER APPLICATION — SCREEN-BY-
SCREEN SPECIFICATION
 D01 — Driver Welcome
Elements:
     Lift Me branding.
     Driver onboarding introduction.
     Register.
     Sign in.

 D02 — Driver Registration
Elements:
     Phone number.
     OTP verification.
     Account creation.

 D03 — Personal Details
Elements:
     Full name.
     Contact information.
     Identification details as legally required.
     Profile photograph.
 D04 — Document Submission
Possible documents depending on market requirements:
      Government identification.
      Driving licence.
      Vehicle registration.
      Insurance.
      Inspection documentation.
      Other legally required documents.
Use private object storage.
Documents must not be publicly accessible.

 D05 — Vehicle Information
Elements:
      Make.
      Model.
      Year.
      Colour.
      Registration plate.
      Vehicle category.
      Supporting documents.

 D06 — Application Status
Possible statuses:
      INCOMPLETE
      SUBMITTED
      UNDER_REVIEW
      APPROVED
      REJECTED
      EXPIRED
      SUSPENDED
Display the reason for rejected or incomplete applications where appropriate.

 D07 — Driver Home
Elements:
      Online/offline switch.
      Availability status.
      Map.
      Current location.
      Earnings summary.
      Driver eligibility status.
The backend must determine eligibility.

 D08 — Incoming Ride Offer
Elements:
      Pickup location.
      Destination information according to product policy.
      Estimated distance.
      Estimated trip information.
      Offer expiry.
      Accept.
      Reject.
Offer expiration must be controlled by the server.

 D09 — Navigate to Pickup
Elements:
      Navigation integration.
      Pickup address.
      Passenger instructions.
      Contact option.

 D10 — Arrived at Pickup
Elements:
      Arrival confirmation.
      Passenger pickup instructions.
      Wait status.

 D11 — Start Trip
Elements:
      Pickup PIN verification where configured.
      Start trip confirmation.
The backend must validate the trip-start action.
 D12 — Active Trip
Elements:
     Navigation.
     Trip progress.
     Passenger details necessary for the trip.
     Safety and support access.

 D13 — Complete Trip
Elements:
     End trip confirmation.
     Final trip summary.
     Payment status.
     Earnings information.

 D14 — Earnings
Elements:
     Daily earnings.
     Weekly earnings.
     Completed rides.
     Commission.
     Payout status.
     Transaction details.

 D15 — Driver Activity
Elements:
     Completed trips.
     Cancelled trips.
     Trip details.
     Dates.
     Earnings.

 D16 — Driver Account
Elements:
     Profile.
     Vehicle.
     Documents.
     Verification status.
     Settings.
     Logout.

 D17 — Driver Support and Safety
Elements:
     Report an issue.
     Safety support.
     Emergency information.
     Trip assistance.
     Contact support.
The app must not encourage drivers to interact with unnecessary screens while driving.



12. ADMIN DASHBOARD — SCREEN-BY-
SCREEN SPECIFICATION
The admin dashboard should use a clean, professional desktop-first interface.

 A01 — Admin Login
     Email or approved identity login.
     Password.
     MFA.
     Session controls.

 A02 — Operations Overview
     Active rides.
     Completed rides.
     Pending driver applications.
     Online drivers.
     Payment statistics.
     Support cases.
     Service-area performance.
Use actual backend data only.

 A03 — Live Rides
     Active trip list.
     Map.
      Driver assignment.
      Trip state.
      Filters.
      Search.

 A04 — Ride Detail
      Ride identifier.
      Passenger.
      Driver.
      Vehicle.
      Pickup.
      Destination.
      Timeline.
      Payment state.
      Support history.

 A05 — Driver Applications
      Application list.
      Documents.
      Verification status.
      Approve.
      Reject.
      Request more information.
All decisions must be audited.

 A06 — Drivers and Vehicles
      Driver profile.
      Vehicle information.
      Document expiry.
      Approval state.
      Suspension controls.

 A07 — Payments and Payouts
      Transactions.
      Payment status.
      Refund status.
      Reconciliation.
      Driver payouts.
      Financial reporting.
 A08 — Support and Safety
      Customer complaints.
      Incident reports.
      Assigned officer.
      Priority.
      Status.
      Resolution notes.
Restrict sensitive case information to authorized staff.

 A09 — Pricing and Service Areas
      Base fare.
      Distance rate.
      Time rate.
      Minimum fare.
      Waiting charges.
      Applicable fees.
      Service-area boundaries.
      Ride category configuration.
Changes must be versioned and auditable.

 A10 — Market Configuration
      Country.
      City.
      Currency.
      Timezone.
      Language.
      Payment providers.
      Maps provider.
      Pricing rules.
      Enabled features.
      Compliance configuration.

 A11 — Reports and Audit Logs
      Ride reports.
      Driver reports.
      Revenue reports.
      Payment reports.
      Administrative activity.
      Export permissions.
13. UI/UX DESIGN SYSTEM
 13.1 Brand Identity
Lift Me should feel:
         Premium.
         Modern.
         Elegant.
         Trustworthy.
         Minimal.
         Professional.
         Accessible.
The interface must not copy Uber or Bolt's proprietary visual assets or branding.

 13.2 Colour Palette
Primary colours:

 Token                                                           Colour
 Midnight Black                                                  #101010
 Champagne Gold                                                  #D6B45B
 Gold Pressed                                                    #B9953F
 Pure White                                                      #FFFFFF
 Warm Ivory                                                      #F4F4F1
 Primary Text                                                    #171717
 Secondary Text                                                  #666666
 Subtle Border                                                   #E5E5E0

Semantic colours:

 Purpose                                               Colour
 Success                                               #237A50
 Warning                                               #A66A13
 Error                                                 #B3261E
 Information                                           #2463A6
Gold should be used as an accent for important actions and brand details, not as the background
for every element.
Maintain sufficient text contrast.

 13.3 Typography
Recommended:
      Inter.
      Native system fallback.
Suggested sizes:
      Display: 28–32 px.
      Screen title: 22–26 px.
      Section heading: 16–18 px.
      Body: 14–16 px.
      Caption: 12–13 px.
      Button text: 15–16 px.

 13.4 Component Design
Recommended:
      Cards: 16–20 px radius.
      Buttons: 14–16 px radius.
      Bottom sheets: 24 px top radius.
      Touch targets: minimum 44–48 dp.
      Consistent 8 dp spacing scale.

 13.5 Navigation
Passenger bottom navigation:
   1. Home
   2. Activity
   3. Wallet
   4. Account
Driver bottom navigation:
   1. Home
   2. Earnings
   3. Activity
   4. Account
Admin navigation:
   1. Overview
   2. Live Rides
   3. Drivers
   4. Passengers
   5. Vehicles and Documents
   6. Payments and Payouts
   7. Support and Safety
   8. Pricing and Service Areas
   9. Reports
  10. Audit Logs
  11. Settings

 13.6 Shared UI Components
Build reusable components:
     LiftMeLogo
     PrimaryButton
     SecondaryButton
     TextInput
     PhoneInput
     OTPInput
     SearchInput
     ScreenHeader
     BottomNavigation
     MapView
     MapPin
     RecenterButton
     BottomSheet
     AddressRow
     SavedPlaceCard
     RideCategoryCard
     FareBreakdown
     DriverIdentityCard
     VehicleCard
     RideStatusBanner
     ETAIndicator
     PaymentMethodRow
     PaymentStatus
     DocumentUpload
     DocumentStatus
     SafetyButton
     SupportEntry
     ConfirmationDialog
     Toast
     InlineAlert
     EmptyState
      LoadingState
      ErrorState
      OfflineState

 13.7 Accessibility
Support:
      Screen readers.
      Dynamic text sizes.
      Accessible touch targets.
      Keyboard navigation on web.
      Reduced-motion settings.
      Clear error messages.
      Colour contrast.
      Safe-area layouts.
Every interactive component must have an accessible label.

 13.8 Required Screen States
Every applicable screen must handle:
      Loading.
      Success.
      Empty state.
      Validation error.
      Server error.
      Offline state.
      Network timeout.
      Permission denied.
      Unauthorized.
      Expired session.
      Retry and recovery.
Do not build screens that only look correct when data is available.
14. USER JOURNEYS AND RIDE LIFECYCLE
14.1 Passenger Journey
Open App
   ↓
Sign Up / Sign In
   ↓
Verify Phone
   ↓
Open Home
   ↓
Select Pickup
   ↓
Select Destination
   ↓
Receive Fare Quote
   ↓
Choose Ride Category
   ↓
Select Payment Method
   ↓
Request Ride
   ↓
Driver Matching
   ↓
Driver Assigned
   ↓
Driver Arrives
   ↓
Pickup Confirmation
   ↓
Trip Starts
   ↓
Trip Completed
   ↓
Payment Processing
   ↓
Receipt and Rating
 14.2 Driver Journey
  Register
     ↓
  Verify Phone
     ↓
  Submit Personal Details
     ↓
  Submit Documents
     ↓
  Add Vehicle
     ↓
  Application Review
     ↓
  Approval
     ↓
  Go Online
     ↓
  Receive Ride Offer
     ↓
  Accept Ride
     ↓
  Navigate to Pickup
     ↓
  Arrive
     ↓
  Confirm Passenger
     ↓
  Start Trip
     ↓
  Complete Trip
     ↓
  Review Earnings




 14.3 Dispatch Rules
The dispatch engine must:
     Identify eligible drivers.
     Check driver availability.
     Check driver location freshness.
     Check service-area eligibility.
     Apply configurable matching rules.
     Prevent assignment of the same ride to multiple drivers.
     Handle driver rejection.
     Handle offer expiry.
     Expand the search area according to configured rules.
     Stop matching when a ride is cancelled or expired.
Use database transactions and appropriate locking or atomic assignment operations.
The backend must be authoritative.



15. MAPS, LOCATION AND DISPATCH
ARCHITECTURE
Maps and location services are core platform capabilities.

 15.1 Maps Provider Abstraction
Implement a provider adapter so the platform can change map providers without rewriting booking
logic.
Potential providers:
      Google Maps Platform.
      Mapbox.
      Other suitable regional providers.
The final provider must be selected based on:
      Kenya coverage.
      USA coverage.
      Geocoding quality.
      Navigation quality.
      Pricing.
      Licensing.
      SDK support.

 15.2 Location Features
      Current location.
      Pickup selection.
      Destination search.
      Reverse geocoding.
      Driver location updates.
      Route estimation.
      Distance estimation.
      Live tracking.
      Service-area validation.

 15.3 Driver Presence
Use Redis or another suitable low-latency store for temporary driver presence.
Presence information may include:
      Driver ID.
      Latitude.
      Longitude.
      Last update timestamp.
      Availability.
      Relevant market/service area.
Do not treat stale location data as reliable.
PostgreSQL/PostGIS should store durable business data and trip records.

 15.4 Location Privacy
      Collect location only when needed for a legitimate product purpose.
      Request platform permissions transparently.
      Minimize retention.
      Restrict access.
      Avoid exposing driver or passenger location to unauthorized users.
      Protect location data in logs and analytics.
      Explain background location use clearly.



16. PAYMENT ARCHITECTURE
 16.1 Payment Principles
The platform must use payment-provider integrations through backend adapters.
The frontend must never decide that a payment succeeded merely because a customer returned
from a payment screen.
Payment confirmation must be based on verified provider responses or webhooks.

 16.2 Kenya Payment Support
Plan for:
      M-Pesa through an appropriate authorized provider integration.
      Supported card payments.
      Other methods only when approved and configured.
M-Pesa integration must support the relevant payment lifecycle, including initiation, provider
callback, verification, status reconciliation and failure handling.
 16.3 USA Payment Support
Prepare for:
      Supported card payment processing.
      Approved digital wallets where commercially appropriate.
      Market-specific payment and payout providers.
Provider selection must be reviewed before launch.

 16.4 Payment States
      INITIATED
      PENDING
      AUTHORIZED
      SUCCEEDED
      FAILED
      CANCELLED
      REFUNDED
      PARTIALLY_REFUNDED

 16.5 Financial Data
Use a proper financial ledger or auditable transaction model.
Store money using integer minor units or an equivalent precise decimal representation.
Never use floating-point arithmetic for financial calculations.
Every payment must be traceable to:
      Ride.
      Passenger.
      Payment provider.
      Provider transaction reference.
      Currency.
      Amount.
      Status.
      Relevant timestamps.
Implement idempotency to prevent duplicate charges.
17. DATA.MD — DATABASE AND DATA
ARCHITECTURE
 17.1 Database Strategy
Use PostgreSQL as the primary relational database.
Use PostGIS for geospatial queries.
Use Redis for temporary, high-frequency information such as driver presence, short-lived
coordination data, rate-limit counters and cache entries.
Redis must not become the only source of truth for financial or ride records.

 17.2 Main Entities
Users
Fields:
      id
      phone_number
      email
      password_hash or external_auth_identifier where applicable
      account_status
      created_at
      updated_at
Use unique constraints on normalized identity fields where required.

User Roles
Fields:
      id
      user_id
      role
      market_scope
      created_at
A user may have more than one authorized role if the business rules permit it.

Passenger Profiles
Fields:
      id
      user_id
      full_name
      profile_photo
      preferences
      created_at
      updated_at

Driver Profiles
Fields:
      id
      user_id
      full_name
      verification_status
      availability_status
      rating_summary
      created_at
      updated_at

Vehicles
Fields:
      id
      driver_id
      make
      model
      year
      colour
      registration_number
      category
      status
      created_at
      updated_at

Driver Documents
Fields:
      id
      driver_id
      document_type
      private_storage_key
      status
      expiry_date
      review_notes
      reviewed_by
      created_at
      updated_at
Never store public document URLs for sensitive identity files.

Markets
Fields:
      id
      country_code
      market_name
      currency_code
      timezone
      default_language
      enabled
      configuration

Service Areas
Fields:
      id
      market_id
      name
      boundary_geometry
      status
      configuration
Use PostGIS for geographic boundaries.

Pricing Rules
Fields:
      id
      market_id
      service_area_id
      ride_category
      base_fare_minor
      distance_rate_minor
      time_rate_minor
      minimum_fare_minor
      currency_code
      effective_from
      effective_until
      status
Pricing must be versioned.
Ride Quotes
Fields:
      id
      passenger_id
      market_id
      pickup_location
      destination_location
      ride_category
      estimated_distance
      estimated_duration
      estimated_fare_minor
      currency_code
      expires_at
      created_at
A quote should have a defined expiry.

Rides
Fields:
      id
      passenger_id
      driver_id
      vehicle_id
      market_id
      pickup_location
      destination_location
      requested_at
      assigned_at
      started_at
      completed_at
      ride_status
      quoted_fare_minor
      final_fare_minor
      currency_code
      cancellation_reason
      created_at
      updated_at

Ride Events
Fields:
      id
      ride_id
      event_type
      previous_state
      new_state
      actor_id
      metadata
      created_at
Use this to preserve a traceable ride timeline.

Ride Offers
Fields:
      id
      ride_id
      driver_id
      offer_status
      offered_at
      expires_at
      responded_at
Enforce assignment rules to prevent duplicate driver assignment.

Payments
Fields:
      id
      ride_id
      passenger_id
      provider
      provider_reference
      amount_minor
      currency_code
      payment_status
      created_at
      updated_at

Refunds
Fields:
      id
      payment_id
      amount_minor
      currency_code
      provider_reference
      status
      reason
      created_at
Payouts
Fields:
      id
      driver_id
      amount_minor
      currency_code
      payout_provider
      provider_reference
      payout_status
      created_at
      updated_at

Financial Ledger
Fields:
      id
      transaction_reference
      account_reference
      entry_type
      debit_minor
      credit_minor
      currency_code
      related_ride_id
      created_at
Financial entries must be immutable or corrected through properly traceable reversal entries.

Ratings
Fields:
      id
      ride_id
      reviewer_id
      reviewed_user_id
      rating
      comment
      created_at

Support Cases
Fields:
      id
      user_id
      ride_id
      case_type
      priority
      status
      assigned_to
      description
      created_at
      updated_at

Safety Incidents
Fields:
      id
      ride_id
      reporter_id
      incident_type
      priority
      restricted_details_reference
      status
      created_at
      updated_at
Restrict sensitive incident data to authorized personnel.

Notifications
Fields:
      id
      user_id
      notification_type
      delivery_channel
      status
      sent_at
      created_at

Audit Logs
Fields:
      id
      actor_id
      action
      resource_type
      resource_id
      market_id
      timestamp
      metadata
Do not place passwords, OTPs, access tokens or full sensitive document contents in audit logs.

 17.3 Database Relationships
Core relationships:
      One user may have a passenger profile.
      One user may have a driver profile.
      One driver may own or be associated with multiple vehicles, subject to policy.
      One driver may submit multiple documents.
      One passenger may request multiple rides.
      One ride may have multiple driver offers.
      One completed ride may have a payment record and associated financial ledger entries.
      One ride may have ratings and support cases.
      One market may have multiple service areas and pricing configurations.

 17.4 Indexing
Create indexes for:
      Normalized phone number.
      Email where used.
      User role.
      Driver verification status.
      Driver availability.
      Ride status.
      Passenger ride history.
      Driver ride history.
      Ride creation date.
      Payment status.
      Provider reference.
      Document expiry.
      Service-area geometry.
      Geospatial driver searches.
Use query plans to validate performance.

 17.5 Data Ownership
      Passengers own their profile information.
      Drivers own their submitted profile information, subject to platform verification and legal
      obligations.
      The platform owns operational ride and transaction records, subject to applicable laws.
      Administrators only access data necessary for their role.
      Third-party providers only receive the data required for their contracted service.
 17.6 Data Retention
Create a documented retention policy for:
      Account records.
      Trip records.
      Financial records.
      Identity documents.
      Location history.
      Support records.
      Safety records.
      Audit records.
Retention periods must be determined by legal, tax, contractual and operational requirements for
each market.
Do not keep precise location history indefinitely by default.
Support user data access, correction and deletion workflows where applicable. Legal retention
obligations may require some records to remain.

 17.7 Backups and Recovery
Implement:
      Automated database backups.
      Point-in-time recovery where supported.
      Encrypted backups.
      Backup retention policies.
      Restore testing.
      Documented disaster recovery procedures.
      Recovery objectives for critical services.
A backup is not proven useful until restoration has been tested.



18. SECURITY.MD — SECURITY
ARCHITECTURE AND POLICIES
 18.1 Security Objective
Lift Me must protect passenger, driver, employee and business information from unauthorized
access, loss, manipulation and disclosure.
Security must be incorporated into the system from the beginning.
 18.2 Authentication
Implement secure authentication.
Requirements:
      Phone verification using OTP.
      Secure session management.
      Short-lived access tokens where token-based authentication is used.
      Secure refresh-token rotation.
      Session revocation.
      Rate limits on authentication endpoints.
      Protection against OTP brute force.
      Account recovery controls.
      MFA for administrators.
Do not store passwords in plaintext.
Use a reputable password hashing algorithm such as Argon2id if password authentication is
implemented.
Use established authentication libraries rather than writing cryptographic logic from scratch.

 18.3 Authorization
Implement role-based access control.
Authorization must be enforced by the backend, not only by hiding frontend controls.
Examples:
      Passengers may access only their own profile and authorized trip information.
      Drivers may access only their own driver information and assigned trips.
      Support agents may access only the information needed for their work.
      Finance staff may access permitted financial operations.
      Verification officers may review relevant driver documents.
      Super administrators may have broader access with enhanced audit requirements.
Use market-level permissions where applicable.

 18.4 API Security
Implement:
      HTTPS in all production environments.
      Input validation.
      Output validation where appropriate.
      Rate limiting.
      Request size limits.
      Authentication middleware.
      Authorization checks.
      CORS restrictions.
      Secure error handling.
      API versioning.
      Protection against injection attacks.
      Idempotency for sensitive operations.
      Request correlation IDs.
Never trust client-supplied prices, roles, payment status or ride status.

 18.5 Data Encryption
Use encryption:
      In transit through TLS.
      At rest through managed database and storage encryption.
      For backups.
      For sensitive stored secrets where appropriate.
Restrict access to encryption keys.
Use a managed secrets service where available.

 18.6 Sensitive Information
Sensitive information includes:
      Identity documents.
      Phone numbers.
      Email addresses.
      Driver licence information.
      Vehicle documents.
      Precise location.
      Payment references.
      Safety reports.
      Authentication credentials.
Do not expose sensitive information through public URLs, debug screens, analytics events or logs.

 18.7 File Upload Security
Driver document uploads must:
      Use authenticated upload workflows.
      Validate file types.
      Enforce file-size limits.
      Use private storage.
     Generate secure short-lived access links where needed.
     Scan uploaded files where practical.
     Prevent executable content from being served.
     Restrict access to authorized reviewers.
     Record document access and review actions.

 18.8 Payment Security
     Use a compliant payment provider.
     Do not store raw card details.
     Verify provider webhooks.
     Validate signatures using the provider's official method.
     Prevent replay attacks.
     Use idempotency keys.
     Reconcile transactions.
     Separate payment state from ride state.
     Maintain an auditable financial ledger.

 18.9 Location Security
     Authenticate real-time connections.
     Authorize subscriptions to ride-specific location channels.
     Do not broadcast every driver's location to every passenger.
     Restrict precise location access to legitimate active-trip workflows.
     Use appropriate location retention.
     Protect location data in monitoring and logs.

 18.10 WebSocket Security
Implement:
     Authenticated connection establishment.
     Authorization for every subscribed channel.
     Token expiry handling.
     Connection rate limits.
     Message validation.
     Reconnection controls.
     Protection against unauthorized ride subscriptions.

 18.11 Administrative Security
     Require MFA.
     Use least-privilege access.
     Audit sensitive actions.
     Apply session expiration.
     Protect high-risk operations with additional confirmation.
      Review administrator accounts regularly.
      Restrict production access.
      Log document access and financial actions.

 18.12 Security Monitoring
Monitor:
      Repeated failed logins.
      Suspicious OTP activity.
      Unusual API traffic.
      Repeated payment failures.
      Invalid webhook signatures.
      Unexpected administrative actions.
      Suspicious driver availability patterns.
      Unauthorized access attempts.
      Abnormal location activity.
Set up alerts for critical security events.

 18.13 Incident Response
Prepare an incident response procedure:
   1. Detect and report the incident.
   2. Classify severity.
   3. Contain affected systems.
   4. Preserve evidence.
   5. Investigate the cause.
   6. Recover affected services.
   7. Notify relevant stakeholders where legally required.
   8. Document lessons learned.
   9. Implement corrective controls.

 18.14 Security Testing
Perform:
      Dependency scanning.
      Static code analysis.
      Secret scanning.
      API security tests.
      Authorization tests.
      Authentication tests.
      Upload security tests.
      Payment webhook tests.
      Penetration testing before commercial launch.
Use OWASP guidance appropriate to web applications, APIs and mobile applications.

 18.15 Security Rules for Developers
     Never commit secrets.
     Never place production credentials in mobile applications.
     Never disable authorization to make a feature work.
     Never use real customer information in development fixtures.
     Never expose private documents publicly.
     Never trust frontend payment confirmation.
     Never silently ignore security errors.
     Never use weak test credentials in production.
     Never claim security testing has passed without running it.



19. API ARCHITECTURE
Use versioned REST endpoints.
Suggested base path:
/api/v1



 19.1 Authentication
     POST /auth/register
     POST /auth/send-otp
     POST /auth/verify-otp
     POST /auth/login
     POST /auth/refresh
     POST /auth/logout

 19.2 Passenger
     GET /passengers/me
     PATCH /passengers/me
     GET /passengers/me/rides
     GET /passengers/me/payment-methods

 19.3 Driver
     POST /drivers/register
     GET /drivers/me
     PATCH /drivers/me
     POST /drivers/documents
     GET /drivers/application-status
     POST /drivers/availability

 19.4 Vehicles
     POST /drivers/me/vehicles
     GET /drivers/me/vehicles
     PATCH /drivers/me/vehicles/:vehicleId

 19.5 Ride Quotes
     POST /ride-quotes
     GET /ride-quotes/:quoteId

 19.6 Rides
     POST /rides
     GET /rides/:rideId
     POST /rides/:rideId/cancel
     POST /rides/:rideId/arrive
     POST /rides/:rideId/start
     POST /rides/:rideId/complete

 19.7 Driver Offers
     GET /drivers/me/offers
     POST /driver-offers/:offerId/accept
     POST /driver-offers/:offerId/reject

 19.8 Payments
     POST /payments/initiate
     GET /payments/:paymentId
     POST /payments/:paymentId/reconcile
     POST /webhooks/payments/:provider
Webhook endpoints must use provider-specific signature verification.

 19.9 Admin
     GET /admin/overview
     GET /admin/rides
     GET /admin/drivers
     POST /admin/drivers/:driverId/approve
     POST /admin/drivers/:driverId/reject
     GET /admin/payments
     GET /admin/support-cases
     GET /admin/audit-logs

 19.10 API Requirements
Every endpoint must define:
     Request schema.
     Response schema.
     Authentication requirement.
     Authorization requirement.
     Validation.
     Error responses.
     Rate limits where appropriate.
     Idempotency requirements where appropriate.
     Relevant tests.
Publish an OpenAPI specification.



20. NOTIFICATIONS AND REAL-TIME
COMMUNICATION
 20.1 Notification Channels
Support suitable channels:
     Push notifications.
     SMS.
     In-app notifications.
     Email where appropriate.
Use provider adapters.

 20.2 Passenger Notifications
Examples:
     OTP sent.
     Driver assigned.
     Driver arriving.
     Trip started.
     Trip completed.
      Payment result.
      Support update.

 20.3 Driver Notifications
Examples:
      New ride offer.
      Ride cancellation.
      Verification update.
      Document expiry reminder.
      Payout update.
      Important service announcements.

 20.4 Real-Time Events
Suggested WebSocket events:
      ride.status.updated
      ride.driver.assigned
      ride.driver.location.updated
      ride.offer.created
      ride.offer.expired
      ride.payment.updated

Use authenticated, ride-scoped channels.
Use REST for durable state changes and WebSockets for timely event delivery.
If a connection is lost, clients must recover by fetching authoritative state from the API.



21. KENYA-FIRST AND USA-READY
REQUIREMENTS
 21.1 Kenya Configuration
Initial configuration should support:
      Country: Kenya.
      Currency: KES.
      Currency code: KES.
      Timezone: Africa/Nairobi.
      Phone numbers: E.164 normalization, including +254.
      Payment provider: M-Pesa when configured.
      Supported card payments where available.
      English.
      Swahili localization preparation.
The system should support landmark-based pickup instructions.
Users must be able to select a pickup manually when GPS is unavailable or inaccurate.
Do not assume every customer has a new smartphone, reliable data connection or a card.

 21.2 USA Configuration
Prepare for:
      USD.
      Multiple timezones.
      Country, state, city and service-area configuration.
      Local payment providers.
      Driver screening requirements.
      Insurance requirements.
      Vehicle requirements.
      Local licensing.
      Tax and receipt requirements.
      Privacy requirements.
      Accessibility requirements.
      Local customer support.
Do not activate a US city until its legal, insurance, operational and provider requirements have been
reviewed.

 21.3 Market Configuration
Do not hard-code:
      Country.
      Currency.
      Timezone.
      Phone country code.
      Payment method.
      Pricing rules.
      Commission.
      Language.
      Driver requirements.
      Tax rules.
      Service area.
Use a market configuration model.
Each ride, quote, payment and relevant financial record must retain the market and currency
applicable when it was created.
Never assume a future change to market configuration should rewrite historical transaction values.



22. TESTING AND QUALITY ASSURANCE
 22.1 Unit Testing
Test:
        Fare calculations.
        Ride state transitions.
        Driver eligibility.
        Dispatch rules.
        Payment state transitions.
        Market configuration.
        Role permissions.
        Input validation.

 22.2 Integration Testing
Test:
        Authentication.
        Database operations.
        Driver verification.
        Ride creation.
        Driver matching.
        Payment callbacks.
        Notifications.
        WebSocket events.
        Admin operations.

 22.3 End-to-End Testing
Test complete journeys:
   1. Passenger registers.
   2. Driver registers.
   3. Driver submits documents.
   4. Admin approves driver.
   5. Driver goes online.
   6. Passenger requests a ride.
   7. Driver receives offer.
   8. Driver accepts.
   9. Driver arrives.
  10. Passenger confirms pickup.
  11. Trip begins.
  12. Trip completes.
  13. Payment is processed.
  14. Receipt is generated.
  15. Rating is submitted.

 22.4 Concurrency Testing
Test:
        Multiple drivers receiving offers.
        Multiple drivers attempting to accept the same ride.
        Duplicate payment callbacks.
        Duplicate trip completion requests.
        Expired offers.
        Passenger cancellation during matching.
        Driver disconnection during a trip.

 22.5 Device Testing
Test on:
        Android physical devices.
        iPhones.
        Different screen sizes.
        Weak network connections.
        Location permission denied.
        GPS disabled.
        Background and foreground transitions.
        App termination and recovery.

 22.6 Quality Requirements
        No critical crashes.
        No unauthorized data access.
        No fake payment success.
        No duplicate ride assignment.
        No invalid ride transitions.
        No unhandled critical network failures.
        No leaked secrets.
        No unreviewed production integrations.
23. DEPLOYMENT AND INFRASTRUCTURE
 23.1 Environments
Maintain separate:
     Development.
     Testing/staging.
     Production.
Never use production credentials in development.

 23.2 CI/CD
Set up automated:
     Linting.
     Type checking.
     Unit tests.
     Integration tests.
     Build checks.
     Dependency scanning.
     Secret scanning.
Production deployment must require an authorized release process.

 23.3 Monitoring
Monitor:
     API availability.
     Response time.
     Error rate.
     Database performance.
     Redis performance.
     WebSocket connections.
     Payment success/failure.
     Dispatch latency.
     Ride completion.
     Notification delivery.
     Application crashes.

 23.4 Backups
Configure encrypted automated backups.
Test recovery regularly.

 23.5 Mobile Release
Prepare:
         Android build.
         iOS build.
         App icons.
         Splash screens.
         Privacy disclosures.
         Permission explanations.
         Store descriptions.
         Support details.
         Terms and privacy policy.
Do not publish production apps before the relevant legal and operational checks are complete.



24. DEVELOPMENT ROADMAP
Development must be performed in controlled phases.
Do not attempt to build the entire application in one giant operation.

 PHASE 0 — PROJECT INSPECTION AND FOUNDATION
Tasks:
         Inspect repository.
         Identify existing code.
         Read all project documentation.
         Identify missing requirements.
         Recommend repository structure.
         Identify environment requirements.
         Identify required provider credentials.
         Create a development plan.
Do not overwrite existing work without justification.
Stop for approval.

 PHASE 1 — BACKEND FOUNDATION
Build:
         NestJS project.
         Database connection.
         PostgreSQL configuration.
         Redis configuration.
         Environment validation.
         Authentication foundation.
         Logging.
         Error handling.
         API versioning.
         OpenAPI setup.
         Initial migrations.
Add tests.
Stop for review.

 PHASE 2 — DESIGN SYSTEM AND APP SHELLS
Build:
         Brand tokens.
         Typography.
         Buttons.
         Inputs.
         Cards.
         Navigation.
         Loading states.
         Error states.
         Passenger app shell.
         Driver app shell.
         Admin dashboard shell.
Implement the visual system before building all screens.
Stop for review.

 PHASE 3 — DRIVER ONBOARDING
Build:
         Driver registration.
         Phone verification.
         Personal profile.
         Document submission.
         Vehicle details.
         Application status.
         Admin verification workflow.
Stop for review.

 PHASE 4 — MAPS AND FARE QUOTES
Build:
         Map provider adapter.
         Location permissions.
         Pickup selection.
         Destination search.
         Geocoding.
         Service-area validation.
         Pricing configuration.
         Fare quote API.
         Passenger fare estimate interface.
Stop for review.

 PHASE 5 — RIDE STATE MACHINE AND DISPATCH
Build:
         Ride request.
         Ride state machine.
         Driver eligibility.
         Driver presence.
         Driver offer generation.
         Offer expiry.
         Accept/reject workflow.
         Atomic driver assignment.
         Cancellation.
         No-driver-found recovery.
Add concurrency tests.
Stop for review.

 PHASE 6 — REAL-TIME TRACKING
Build:
         Authenticated WebSocket connection.
         Driver location updates.
         Passenger trip tracking.
         Ride status events.
         Reconnection handling.
         State recovery.
Stop for review.

 PHASE 7 — PAYMENT INTEGRATION
Build:
         Payment adapter.
         Sandbox integration.
         Webhook verification.
         Payment state machine.
         Idempotency.
         Financial ledger.
         Payment history.
         Receipt generation.
         Reconciliation.
Do not enable live charging until the provider and business are approved for production use.
Stop for review.

 PHASE 8 — COMPLETE MVP
Complete:
         Passenger application.
         Driver application.
         Admin dashboard.
         Notifications.
         Support.
         Safety features.
         Ride history.
         Financial reporting.
Run end-to-end tests.
Stop for review.

 PHASE 9 — SECURITY AND PRODUCTION HARDENING
Complete:
         Security testing.
         Performance testing.
         Concurrency testing.
         Backup restoration tests.
         Monitoring.
         Privacy review.
         Accessibility review.
      Legal and operational readiness review.
Stop for final approval.

 PHASE 10 — CONTROLLED PILOT
Launch in a limited, approved service area.
Monitor:
      Ride completion.
      Driver availability.
      Matching performance.
      Payment success.
      Support response.
      Safety incidents.
      Customer feedback.
      Operating costs.
Only expand after the pilot demonstrates acceptable reliability and operational readiness.



25. DEVELOPER MASTER INSTRUCTIONS
 ROLE
You are the lead software architect, senior full-stack engineer, mobile developer, backend
engineer, security engineer and technical product partner responsible for building Lift Me.
You must follow this document as the primary product and engineering specification.

 PRIMARY OBJECTIVE
Build a premium, secure and reliable ride-hailing platform called Lift Me.
The initial market is Kenya.
The architecture must support future expansion into the United States without hard-coding Kenyan
assumptions into shared business logic.
The product includes:
   1. Passenger mobile app.
   2. Driver mobile app.
   3. Admin web dashboard.
   4. Backend API.
   5. Database.
   6. Real-time communication.
   7. Payment integrations.
   8. Maps and location integrations.

 NON-NEGOTIABLE RULES
   1. Read this document before coding.
   2. Inspect the existing repository before making changes.
   3. Do not overwrite existing working code without understanding it.
   4. Use TypeScript wherever appropriate.
   5. Use a modular backend architecture.
   6. Keep business logic out of UI components.
   7. Use typed API contracts.
   8. Validate all inputs.
   9. Implement proper error handling.
  10. Write tests.
  11. Never commit secrets.
  12. Never invent working integrations.
  13. Never claim a feature works unless it has been implemented and tested.
  14. Do not hard-code market-specific values.
  15. Do not trust frontend fare calculations.
  16. Do not trust frontend payment confirmation.
  17. Do not trust frontend ride-state changes.
  18. Implement server-side authorization.
  19. Audit sensitive administrative actions.
  20. Protect sensitive driver and passenger data.
  21. Do not introduce microservices unnecessarily.
  22. Do not build the entire application in one phase.
  23. Stop after each major phase and report results.
  24. Wait for approval before continuing to the next phase.

 REQUIRED WORKING STYLE
Before implementing a feature:
     Explain its purpose.
     Identify the affected modules.
     Identify required database changes.
     Identify API changes.
     Identify UI changes.
     Identify security considerations.
     Identify test requirements.
After implementing:
     Run linting.
     Run type checks.
       Run relevant tests.
       Report errors.
       Fix errors where possible.
       List incomplete items.
       Explain what is real, mocked or blocked.
       Wait for approval.

 DESIGN REQUIREMENTS
Use:
       Midnight Black: #101010
       Champagne Gold: #D6B45B
       White: #FFFFFF
       Warm Ivory: #F4F4F1
The visual experience should be premium, minimal, elegant and accessible.
Do not copy Uber or Bolt branding or proprietary assets.

 INTEGRATION REQUIREMENTS
Create provider adapters for:
       Maps.
       Payments.
       SMS.
       Push notifications.
       Identity verification where required.
       Object storage.
Use mock providers only in development and tests.
Clearly label mock integrations.
Never pretend that a mock integration is a live integration.

 DATABASE REQUIREMENTS
Use PostgreSQL and PostGIS.
Use Redis for temporary presence and coordination.
Use database migrations.
Create indexes.
Protect financial integrity.
Use transaction-safe ride assignment.
Keep an auditable ride event history.

 SECURITY REQUIREMENTS
Follow SECURITY.md.
Use server-side role-based access control.
Protect documents.
Verify payment webhooks.
Secure WebSockets.
Implement rate limits.
Use safe session management.
Keep secrets outside source control.

 DOCUMENTATION REQUIREMENTS
Keep these documents updated as the project evolves:
      PRODUCT_REQUIREMENTS.md
      ARCHITECTURE.md
      ARCHITECTURE_ESSENTIALS.md
      UI_UX_BLUEPRINT.md
      SECURITY.md
      DATA.md
      API_SPECIFICATION.md
      DEVELOPMENT_ROADMAP.md
      README.md
When an architecture decision changes, update the documentation and explain why.



26. PHASE-BY-PHASE DEVELOPMENT
PROMPTS
Use these prompts one at a time.

 PROMPT 1 — INSPECT THE PROJECT
Read the complete Lift Me Master Project Document.
Inspect the current repository.
Do not start building the entire application.
Report:
   1. Existing files and folders.
   2. Existing framework and dependencies.
   3. Existing application functionality.
   4. Missing components.
   5. Recommended architecture.
   6. Required environment variables.
   7. External integrations required.
   8. Security risks.
   9. Proposed implementation sequence.
Recommend whether passenger and driver applications should be separate Expo apps or one app
with separate roles. Explain the trade-offs.
Do not delete existing code.
Implement only necessary, low-risk project setup after explaining it.
Run available checks.
Stop and wait for approval.

 PROMPT 2 — BUILD THE DESIGN FOUNDATION
Implement the Lift Me design system.
Use the specified black, champagne gold, white and ivory colours.
Build:
         Typography.
         Spacing tokens.
         Colour tokens.
         Buttons.
         Inputs.
         Cards.
         Headers.
         Bottom navigation.
         Loading states.
         Empty states.
         Error states.
         Shared layout components.
Set up passenger and driver navigation shells.
Do not implement all product screens yet.
Show the implemented structure and test results.
Stop for review.

 PROMPT 3 — BUILD PASSENGER ONBOARDING AND HOME
Implement passenger screens P01–P08.
Requirements:
      Splash.
      Welcome.
      Registration.
      OTP.
      Profile.
      Home map.
      Destination search.
      Pickup confirmation.
Use typed API interfaces.
Handle permissions and network failures.
Do not invent real driver availability or pricing.
Write tests.
Stop for review.

 PROMPT 4 — BUILD PASSENGER BOOKING AND TRIP
Implement passenger screens P09–P14.
Requirements:
      Fare estimate.
      Ride category.
      Payment selection.
      Driver matching.
      Driver assigned.
      Active trip.
      Completed trip.
      Receipt.
      Ride history.
The backend must remain authoritative for trip state and fares.
Stop for review.
 PROMPT 5 — BUILD PASSENGER WALLET AND SUPPORT
Implement P15–P17.
Add payment method presentation, payment status, transaction history, support and safety entry
points.
Do not store raw card details.
Use sandbox payment integrations until production approval.
Stop for review.

 PROMPT 6 — BUILD DRIVER ONBOARDING
Implement D01–D06.
Include:
      Registration.
      Phone verification.
      Personal details.
      Document uploads.
      Vehicle information.
      Application status.
Secure uploaded files.
Use server-controlled verification status.
Stop for review.

 PROMPT 7 — BUILD DRIVER OPERATIONS
Implement D07–D17.
Include:
      Availability.
      Incoming offers.
      Accept/reject.
      Navigation.
      Arrival.
      Trip start.
      Active trip.
      Trip completion.
      Earnings.
      Activity.
      Account.
        Support.
Use backend-controlled trip transitions.
Minimize distraction.
Stop for review.

 PROMPT 8 — BUILD ADMIN DASHBOARD
Implement A01–A11.
Include:
        Secure authentication.
        MFA.
        Operations overview.
        Live rides.
        Ride details.
        Driver applications.
        Driver and vehicle management.
        Payments.
        Support and safety.
        Pricing.
        Market configuration.
        Reporting.
        Audit logs.
Apply backend role permissions to every protected operation.
Stop for review.

 PROMPT 9 — BUILD AND TEST DISPATCH
Implement the dispatch engine.
Test:
        Driver eligibility.
        Driver location freshness.
        Search radius.
        Offer expiration.
        Multiple simultaneous offers.
        Driver acceptance.
        Duplicate acceptance prevention.
        Cancellation.
        No-driver-found handling.
Use transactions and concurrency-safe assignment.
Do not claim dispatch is production-ready until concurrency tests pass.
Stop for review.

 PROMPT 10 — SECURITY AND RELEASE REVIEW
Review the entire codebase against SECURITY.md and DATA.md.
Check:
      Authentication.
      Authorization.
      Sensitive information.
      API security.
      Payment webhooks.
      File uploads.
      Location privacy.
      WebSocket security.
      Audit logs.
      Dependency vulnerabilities.
      Secret exposure.
      Database backups.
      Test coverage.
List all unresolved risks.
Do not deploy or activate live payments without explicit approval.
Stop for final review.



27. DEFINITION OF DONE
A feature is not complete merely because its screen looks correct.
A feature is complete only when:
   1. The user journey is implemented.
   2. UI states are handled.
   3. API contracts are defined.
   4. Backend validation exists.
   5. Authorization is enforced.
   6. Database changes are migrated.
   7. Error handling exists.
   8. Relevant tests pass.
   9. Documentation is updated.
  10. No known critical security issue remains.
  11. The feature has been reviewed.
  12. Any external integration has been correctly identified as live, sandbox or mocked.

 Feature Status Labels
Use these labels in reports:
      NOT STARTED
      IN PROGRESS
      IMPLEMENTED
      TESTED
      BLOCKED
      MOCKED
      READY FOR REVIEW
      APPROVED
Do not use READY FOR PRODUCTION unless the required release checks have actually passed.



28. LAUNCH READINESS CHECKLIST
 Product
      Passenger app completed.
      Driver app completed.
      Admin dashboard completed.
      Passenger registration tested.
      Driver onboarding tested.
      Driver approval tested.
      Booking journey tested.
      Driver matching tested.
      Trip lifecycle tested.
      Ride history tested.
      Support process tested.

 Payments
      Payment provider selected.
      Sandbox tested.
      Webhook verification implemented.
      Duplicate payment protection tested.
      Reconciliation implemented.
      Refund workflow tested.
      Financial records auditable.
      Production payment approval obtained.
Security
   Authentication tested.
   Authorization tested.
   MFA enabled for administrators.
   Sensitive documents protected.
   Secrets managed securely.
   Rate limiting implemented.
   Location access restricted.
   WebSocket authorization tested.
   Security review completed.
   Incident response plan prepared.

Operations
   Initial service area selected.
   Driver verification process established.
   Customer support process established.
   Safety escalation process established.
   Pricing reviewed.
   Driver compensation and commission reviewed.
   Insurance and licensing reviewed.
   Legal review completed.
   Privacy policy prepared.
   Terms of service prepared.

Infrastructure
   Production environment configured.
   Database backups configured.
   Recovery tested.
   Monitoring configured.
   Logging configured.
   Alerts configured.
   CI/CD reviewed.
   Mobile builds tested.
   Store requirements reviewed.

Pilot
   Pilot drivers approved.
   Passenger testing completed.
   Payment testing completed.
   Support staff trained.
   Operational monitoring active.
      Pilot success criteria defined.



29. IMPORTANT PRODUCT AND
ENGINEERING RULES
The following principles must guide every decision throughout Lift Me development.

Rule 1 — Build for Kenya first, not Kenya only.
Kenya is the initial operating market, but the system must support additional countries, currencies,
timezones, payment providers and regulatory configurations.

Rule 2 — Prioritize a reliable MVP.
Do not waste time building advanced features before the essential booking, dispatch, trip and
payment workflows work correctly.

Rule 3 — Security is a core feature.
Passenger information, driver documents, location information and payment records must be
protected from the beginning.

Rule 4 — The backend controls business logic.
The mobile applications are interfaces. The backend controls authoritative fares, ride states, driver
eligibility, payment confirmation and administrative permissions.

Rule 5 — Build reusable components.
Avoid duplicating the same business or UI logic across applications.

Rule 6 — Use real integrations carefully.
Create adapters for third-party services and clearly identify which integrations are mocked,
sandboxed or live.

Rule 7 — Never invent operational data.
Do not display fake drivers, false ETAs, invented ratings, simulated payment success or misleading
ride availability in production.

Rule 8 — Test the complete journey.
The platform must be tested from passenger registration through driver onboarding, matching, trip
completion and payment.
Rule 9 — Keep documentation current.
Update architecture, API, data and security documentation whenever significant design decisions
change.

Rule 10 — Work in phases.
The developer must implement one approved phase at a time, test it, explain what changed and
wait for approval.



FINAL PROJECT DIRECTIVE
Build Lift Me as a premium, secure, scalable and maintainable mobility platform.
The brand should be recognized through its luxury black, champagne-gold and white identity.
The passenger experience should be simple and trustworthy.
The driver experience should be efficient and safe.
The admin dashboard should provide strong operational control.
The backend should provide reliable dispatch, trip management, financial integrity and real-time
communication.
The database should support accurate, auditable and market-aware information.
The architecture should launch in Kenya while remaining ready for future United States expansion.
Most importantly: build a real product, not just an attractive prototype.
Start by reading this entire specification, inspecting the existing repository and presenting a Phase
0 implementation plan. Do not begin the next phase until the current phase has been reviewed and
approved.
LIFT ME — MOVE WITH CONFIDENCE.
