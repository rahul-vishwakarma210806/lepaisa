# Demo wallet changes

This build adds:

- A persistent per-user saved card using `ACC number` and `IFCS` labels.
- Delete Card and Add New Card controls.
- Deposit QR at `public/images/deposit-qr.jpeg`.
- Deposit reference + Gmail submission saved to Supabase for admin review.
- The Gmail must match the currently signed-in account.
- A protected admin wallet page at `/admin/wallet`.
- Admin can add demo tokens to any user's wallet by Gmail.

## Supabase setup

1. Run `supabase/referral_wallet.sql` if the base wallet/referral SQL has not already been run.
2. Run `supabase/demo_wallet_admin.sql` once.
3. In the Supabase SQL editor, replace `YOUR_ADMIN_GMAIL` with your own signed-in admin Gmail and run the commented INSERT at the bottom of `supabase/demo_wallet_admin.sql`.

The admin page uses server-side `SECURITY DEFINER` functions, so a normal user cannot call the token-credit function successfully.

## Admin page

After signing in with the admin account, open:

`/admin/wallet`

There you can add demo tokens by user Gmail and review submitted deposit references.

## QR image

The supplied QR is already copied to:

`public/images/deposit-qr.jpeg`
