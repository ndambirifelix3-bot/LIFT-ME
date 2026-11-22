// Turns database / function error codes into plain-English messages.
const MESSAGES: Record<string, string> = {
  not_signed_in: 'Please log in again.',
  account_suspended: 'Your account is suspended. Please contact support.',
  role_already_chosen: 'You have already chosen how you use Lift Me.',
  role_not_allowed: 'That option is not available.',
  quote_expired: 'That price has expired. Please get a new price.',
  quote_already_used: 'That price was already used. Please get a new price.',
  quote_not_found: 'We could not find that price. Please try again.',
  active_ride_exists: 'You already have a ride in progress.',
  ride_no_longer_available: 'Another driver took this ride.',
  no_offer_for_this_ride: 'This request is no longer available to you.',
  driver_not_approved: 'Your driver account is not approved yet.',
  driver_offline: 'Go online to accept rides.',
  driver_has_active_ride: 'Finish your current trip first.',
  transition_not_allowed: 'That step is not possible right now. Pull down to refresh.',
  cannot_cancel_during_trip: 'A trip in progress cannot be cancelled. Use Help if you need support.',
  cannot_cancel_now: 'This ride can no longer be cancelled.',
  pickup_outside_service_area: 'Sorry, Lift Me is not available at this pickup point yet.',
  dropoff_outside_service_area: 'Sorry, this destination is outside our service area.',
  missing_personal_details: 'Please complete your personal details.',
  missing_photo: 'Please add your profile photo.',
  missing_vehicle: 'Please add your vehicle details.',
  missing_name: 'Please add your full name.',
  reason_required: 'Please give a reason.',
  application_not_submitted: 'The driver has not submitted their application yet.',
  admin_only: 'Only admins can do this.',
  ride_not_completed: 'This trip is not complete yet.',
  not_your_ride: 'This ride is not yours.',
  already_paid: 'This trip is already paid.',
  maps_unavailable: 'Maps are unavailable right now. Please try again.',
  duplicate_key: 'This already exists.',
  balance_due: 'You owe Lift Me more than the limit. Pay your balance to go online (see Earnings).',
  payout_more_than_owed: 'That is more than Lift Me owes this driver.',
  payment_more_than_owed: 'That is more than this driver owes.',
  amount_required: 'Enter an amount.',
  driver_market_required: 'Set the driver\'s city first.',
  not_a_driver: 'This is only for drivers.',
};

export function friendlyError(err: unknown): string {
  if (!err) return '';
  const e = err as { message?: string; context?: unknown; code?: string };
  const raw = typeof err === 'string' ? err : e.message ?? String(err);
  if (raw.startsWith('missing_documents:')) return `Please upload: ${raw.split(':')[1].trim()}`;
  for (const key of Object.keys(MESSAGES)) {
    if (raw.includes(key)) return MESSAGES[key];
  }
  if (raw.includes('vehicles_plate_key')) return 'This number plate is already registered.';
  if (/network|fetch/i.test(raw)) return 'No internet connection. Please check your data and try again.';
  return raw || 'Something went wrong. Please try again.';
}
