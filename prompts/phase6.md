# PHASE 6 — PAYMENT SYSTEM (RAZORPAY)

## Backend flow (server-side, never trust the client)

* Select Plan
* Create an order in a Supabase Edge Function using the Razorpay secret key
* Open the Razorpay Checkout (client)
* Successful payment
* Verify the payment signature server-side in a Supabase Edge Function
* Update the database (Supabase)
* Activate the subscription
* Update the plan badge
* Unlock premium features

## Data to persist

Store:

* Payment history
* Invoices
* Transaction IDs
* Payment timestamps
* Order IDs
* Signature verification result

## Webhooks

Prepare webhook handling for Razorpay events (payment success / failure / refunds). Secure the webhook endpoint with the webhook secret. Never rely on client callbacks alone.