# WhatsApp Coexistence one-time setup

This adds a management-only page at:

`/Portal/whatsapp-connect.html`

Meta configuration already created:
- App ID: `2972537683097915`
- Embedded Signup configuration ID: `167093995066179`
- Flow: `whatsapp_business_app_onboarding`

## Before using the button

In Meta Developer > Facebook Login for Business:
1. Add `sapthagirischool.in` to the JavaScript SDK allowed domains / app domains.
2. Use `https://sapthagirischool.in/Portal/whatsapp-connect.html` as the website/redirect URL where Meta asks for it.
3. Keep the WhatsApp Coexistence configuration selected.

## Supabase

Deploy `supabase/functions/whatsapp-onboarding/index.ts`.

Set these function secrets:
- `META_APP_SECRET` = the Meta App Secret for SAPTHAGIRI SCHOOL PORTAL
- `META_APP_ID` = `2972537683097915` (optional because it is already the default in the function)
- `WHATSAPP_GRAPH_API_VERSION` = `v26.0` (optional)

After the one-time onboarding succeeds, copy the returned Business Token into:
- `WHATSAPP_ACCESS_TOKEN`

and set:
- `WHATSAPP_PHONE_NUMBER_ID` = the returned Phone Number ID
- `WHATSAPP_GRAPH_API_VERSION` = `v26.0`

Do NOT call `/register` for this coexistence number. The number remains connected to the WhatsApp Business mobile app.

The existing `whatsapp-api` Edge Function can continue handling outgoing messages and webhooks.
