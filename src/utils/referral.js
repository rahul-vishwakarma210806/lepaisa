// Referral helpers for the authenticated Supabase account.
// Cross-device rewards are handled by the Supabase database trigger in
// supabase/referral_wallet.sql; localStorage is intentionally not used for
// wallet/referral money.

export function getReferralLink(referralCode) {
    if (!referralCode || typeof window === 'undefined') return ''
    return `${window.location.origin}/register?ref=${encodeURIComponent(referralCode)}`
}

export const REFERRAL_BONUS_POINTS = 100
