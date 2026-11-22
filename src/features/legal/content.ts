/**
 * Text of the Privacy Policy and Terms of Use (public pages /privacy and /terms).
 *
 * DRAFT written from what the app actually does. It must be reviewed by a lawyer in Kenya and in the
 * USA (Indiana) before launch, and the company details below filled in. When it has been reviewed, set
 * LEGAL_IS_DRAFT to false and update LEGAL_UPDATED.
 */
export const LEGAL_IS_DRAFT = true;
export const LEGAL_UPDATED = '22 November 2026';
export const LEGAL = {
  company: 'Lift Me', // TODO: the registered company name(s) in Kenya and the USA
  website: 'https://rideliftme.com',
  email: 'support@rideliftme.com',
};

export type Block = string | { list: string[] };
export type Section = { id?: string; title: string; body: Block[] };

export const PRIVACY: Section[] = [
  {
    title: 'Who we are',
    body: [
      `${LEGAL.company} ("Lift Me", "we") runs the Lift Me app and website at ${LEGAL.website}. Lift Me connects passengers with independent drivers and boda riders in Kenya, and with independent drivers in the United States.`,
      `We decide how your personal data is used, so we are its "data controller". Questions about your data: ${LEGAL.email}.`,
    ],
  },
  {
    title: 'What we collect',
    body: [
      'Everyone:',
      {
        list: [
          'Your phone number (to log you in with a one-time SMS code) and your name.',
          'Your trips: pickup and drop-off places, the route, distance and time, the price, the ride type, ratings and comments, cancellations and support messages.',
          'Payment details: how you paid (cash, M-Pesa, and in the USA card), the M-Pesa phone number and receipt number. We never see or store your M-Pesa PIN. Card numbers (when cards are available) are handled by our payment provider, not stored by us.',
          'Your location: when you book, to set your pickup and find drivers near you.',
          'Notifications: if you turn them on, a technical address for your phone or browser so we can send ride updates.',
          'Technical information when something goes wrong: the error, the screen, the type of phone or browser and an anonymous account number. These error reports never include your name, phone number or what you typed.',
        ],
      },
      'Drivers and riders also give us:',
      {
        list: [
          'A profile photo, ID or passport number, driving licence number and copies of documents we ask for (for example ID, licence, PSV badge, logbook, insurance, registration).',
          'Vehicle details: make, model, year, colour, number plate and type (car or motorbike, electric or fuel).',
          'Live location while you are online or on a trip, so passengers can be matched with you and can follow their ride.',
          'Earnings, commission, payouts and payments to Lift Me.',
        ],
      },
    ],
  },
  {
    title: 'How we use it',
    body: [
      {
        list: [
          'To provide rides: log you in, calculate prices, match passengers and drivers, show live trip progress and take payment.',
          'Safety and trust: check drivers before approval, share the driver\'s name, photo, vehicle and location with the passenger during a trip (and the passenger\'s first name and pickup with the driver), handle complaints and emergencies, and prevent fraud.',
          'Driver money: work out earnings, commission, payouts and balances.',
          'Support and service messages, for example ride updates and account notices.',
          'To fix problems and improve the app.',
          'To meet legal duties, for example tax records and requests from authorities where the law requires it.',
        ],
      },
      'We do not sell your personal data and we do not use it for advertising.',
    ],
  },
  {
    title: 'Who we share it with',
    body: [
      'Only what each needs, under contracts that protect your data:',
      {
        list: [
          'The other person on your trip (see above).',
          'Supabase: hosts our database and login system (servers in the European Union).',
          'Cloudflare: hosts the website.',
          'SMS providers: send your login codes.',
          'Safaricom (M-Pesa) and, in the USA, our card payment provider: process payments.',
          'Map services: OpenStreetMap-based services (Photon for address search, OSRM for routes, OpenFreeMap for map images) and, when enabled, Google Maps. Address searches go from your phone to the search service.',
          'Apple, Google and browser makers: deliver notifications you turned on.',
          'Sentry: receives error reports (anonymous, see above).',
          'Authorities, courts or insurers when the law requires it or to protect someone\'s safety.',
        ],
      },
      'Some of these providers are outside your country (for example in the European Union or the USA). When data leaves Kenya we use providers and contracts that keep it protected as the Kenya Data Protection Act requires.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      {
        list: [
          'Your account: while you use Lift Me.',
          'Trip and payment records: as long as tax and other laws require (usually up to 7 years), then deleted.',
          'Driver documents: while you drive with Lift Me and for up to 2 years after, in case of claims, unless the law requires longer.',
          'Live driver locations: only the latest position is kept for matching; trip routes are kept with the trip.',
          'Error reports: about 90 days.',
        ],
      },
    ],
  },
  {
    id: 'delete',
    title: 'Deleting your account',
    body: [
      'In the app, open Account and tap "Request account deletion". Or email ' + LEGAL.email + ' (we will ask you to confirm the account is yours).',
      'We delete your account and personal data within 30 days, except records we must keep by law (for example payments and trips for tax), which we keep only as long as required and then delete.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'You can ask to see the data we hold about you, correct it, delete it, get a copy, or object to or restrict how we use it. Email ' + LEGAL.email + '. We reply within the time the law allows (usually 30 days).',
      'Kenya: you can also complain to the Office of the Data Protection Commissioner (www.odpc.go.ke).',
      'USA: depending on your state, you may have similar rights under state privacy laws. We do not sell or "share" personal data for targeted advertising.',
    ],
  },
  {
    title: 'Security',
    body: [
      'Data is encrypted in transit. Access is limited by strict rules in our database (each person sees only their own data; driver documents are private). Staff access is limited to what their work needs. No system is perfectly secure; if a breach affects you, we will tell you and the authorities as the law requires.',
    ],
  },
  {
    title: 'Children',
    body: ['Lift Me is for people aged 18 or over. Children may ride only with an adult who books and travels with them.'],
  },
  {
    title: 'Changes',
    body: ['We may update this policy. We will show the new date at the top and tell you in the app about important changes.'],
  },
];

export const TERMS: Section[] = [
  {
    title: 'About these terms',
    body: [
      `These terms are an agreement between you and ${LEGAL.company} ("Lift Me", "we") for using the Lift Me app and website. By creating an account or booking a ride you accept them. Please also read our Privacy Policy.`,
    ],
  },
  {
    title: 'What Lift Me does',
    body: [
      'Lift Me is a technology platform. It lets passengers request rides and lets independent drivers and boda riders accept them. Drivers are independent and are not Lift Me employees. Lift Me does not own the vehicles.',
      'Lift Me is available only in its service areas (currently Kenya and the United States). Boda rides are available in Kenya only.',
    ],
  },
  {
    title: 'Your account',
    body: [
      {
        list: [
          'You must be 18 or older and give true details.',
          'Keep your phone and login codes private; you are responsible for activity on your account.',
          'One person, one account. Do not share or sell accounts.',
          'We may suspend or close accounts that break these terms, put others at risk, or are used for fraud.',
        ],
      },
    ],
  },
  {
    title: 'Prices and payment',
    body: [
      {
        list: [
          'The app shows the price before you request a ride. Prices are calculated by Lift Me from distance and time and may differ by city and ride type.',
          'You pay the price shown for the trip you booked. If the trip changes a lot (for example a different destination), the price may change.',
          'Payment methods depend on the city: cash and M-Pesa in Kenya; cash (and card when available) in the USA. With cash, pay the driver at the end of the trip.',
          'Receipts are in the app.',
        ],
      },
    ],
  },
  {
    title: 'Cancellations and no-shows',
    body: [
      'You can cancel before the trip starts. Cancelling repeatedly, or not showing up, may lead to a fee (when we introduce one we will show it before you cancel) or suspension.',
    ],
  },
  {
    title: 'Safety and behaviour',
    body: [
      {
        list: [
          'Treat everyone with respect. No violence, threats, harassment, discrimination or illegal items.',
          'Passengers: wear a seat belt. Boda passengers: wear the helmet provided; one passenger only.',
          'Drivers and riders: follow traffic laws, carry only the passengers the vehicle allows, and keep your documents, licence and insurance valid.',
          'In an emergency, call the local emergency number shown in the app (999 or 112 in Kenya, 911 in the USA).',
        ],
      },
    ],
  },
  {
    title: 'Extra terms for drivers and riders',
    body: [
      {
        list: [
          'You may drive only after Lift Me approves your application. The vehicle type you drive decides which requests you get.',
          'You decide when to go online. While online, keep the app open so your location is shared; if the app stops sending your location you may be set offline.',
          'Lift Me charges a commission on each completed trip (shown in the app; currently 15%). For cash trips you collect the fare and owe the commission to Lift Me; for M-Pesa or card trips Lift Me collects the fare and pays you your share.',
          'Your balance is shown in Earnings. If you owe more than your city\'s limit you cannot go online until you pay.',
          'You are responsible for your own taxes, licences, permits and vehicle insurance as required by law.',
        ],
      },
    ],
  },
  {
    title: 'Ratings',
    body: ['Passengers and drivers can rate each other. Low ratings or serious complaints may lead to a review and suspension.'],
  },
  {
    title: 'Liability',
    body: [
      'We work hard to keep Lift Me available and safe, but the app is provided "as is" and may sometimes be unavailable. As far as the law allows, Lift Me is not liable for indirect losses, or for the acts of drivers, riders or passengers. Nothing in these terms limits rights you have under consumer protection law that cannot be limited.',
    ],
  },
  {
    title: 'Changes and ending',
    body: [
      'We may update these terms; we will show the new date and tell you about important changes in the app. You can stop using Lift Me and delete your account at any time.',
    ],
  },
  {
    title: 'Law and disputes',
    body: [
      'Rides in Kenya are governed by the laws of Kenya; rides in the USA by the laws of the State of Indiana and applicable US federal law. Please contact us first at ' + LEGAL.email + ' so we can try to solve any problem.',
    ],
  },
];
