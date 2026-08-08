# Ian & Catherine — Wedding Song Game

A mobile-first wedding song picking game with 250 songs and a Monzo payment button.

## What works now
- Search all 250 songs
- Filter by available / taken
- Pick a song
- Open Ian's Monzo.me payment link
- Enter guest name
- Lock the song on that device
- Mobile-friendly wedding styling

## Important: this first version is a visual/flow test
Claims are currently stored in the browser using localStorage. That means a song claimed on one guest's phone will **not** yet appear taken on another guest's phone.

The next step is to connect the site to Supabase so claims are shared live across every phone. Do not use this at the wedding until the shared database step is completed.

## Deploy to Vercel
Upload all files in this folder to the root of the GitHub repository, then import that repository in Vercel. Vercel can deploy it as a static site with no build command.

Files:
- index.html
- styles.css
- app.js
- songs.js
- README.md
