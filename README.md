# Ian & Catherine — Wedding Song Game (Supabase live version)

This version uses Supabase for shared song claims across every phone.

## Live behaviour
- All 250 songs are shared across guests
- Claims are stored in Supabase
- A claimed song becomes unavailable for everyone
- The list refreshes automatically every 5 seconds
- Duplicate claims are blocked by the database primary key
- Guests can only read claims and add a new claim; they cannot edit or delete existing claims

## Deploy
Replace the existing repository files with these files. Vercel will automatically redeploy when GitHub receives the commit.
