# GOOD CITIZEN SCHOOL Election Starter

This starter connects to the existing Supabase project and uses the existing positions, candidates, election settings and `cast_ballot` RPC.

Create `.env` from `.env.example`, add your Supabase publishable key, then run `npm install` and `npm run dev`.

Important: this is a starter, not a production replacement for the old Claude app. Public direct reads from `votes` must be protected with Supabase RLS or replaced by a server-side percentage-only RPC before a real election. Never put a service-role/secret key in the browser.
