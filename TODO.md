Your code looks clean - I don't see anything that would cause duplicate email sends. The signUp and signInWithPassword are only called from form submissions.

  Possible Explanations

  1. Historical bounces still counting
  Did you ever test with fake emails like test@test.com or asdf@gmail.com before switching to real ones? Those bounces may still be in Supabase's metrics.

  2. Your app is deployed and publicly accessible
  If the app is live (even on a staging URL), bots could be hitting /welcome and trying to sign up with fake emails. Check your Supabase Auth logs:
  - Supabase Dashboard → Authentication → Users
  - Look for any users/emails you don't recognize

  3. Email confirmation resends
  When you click the confirmation link in email, does it work immediately? If you've been clicking it multiple times or requesting resends, that adds up.

  4. Project-wide metric, not daily
  Supabase might be measuring bounce rate as a percentage over all time, not per day. Even 5 bounced emails out of 25 total = 20% bounce rate, which is high.

  Quick Investigation

  Can you check:

  1. Go to Supabase Dashboard → Authentication → Users
    - How many users are listed?
    - Are there any you don't recognize?
  2. Go to Supabase Dashboard → Logs → Auth Logs
    - Filter for the last week
    - Look for any signup events with strange email addresses

  This will tell us if the bounces are from your testing or from external sources (bots).

  Here's the picture:
  ┌─────────────┬───────┐
  │   Metric    │ Count │
  ├─────────────┼───────┤
  │ Total users │ 3     │
  ├─────────────┼───────┤
  │ Confirmed   │ 1     │
  ├─────────────┼───────┤
  │ Unconfirmed │ 2     │
  └─────────────┴───────┘
  Unconfirmed users (potential bounces):
  1. andysonyz4aqau@gmail.com - typo (definitely bounced)
  2. politodushave@gmail.com - might also be invalid or just not confirmed yet

  Why Supabase flagged you with just 2 bounces:

  It's about bounce RATE, not absolute numbers. You have:
  - 2-3 emails sent total
  - Potentially 2 bounces
  - That's a ~66% bounce rate

  Industry standard acceptable bounce rate is < 2%. Email providers (including Supabase's upstream provider) flag accounts with high bounce rates regardless of volume.

  The reality of production:

  You're right that attacks can happen. Here's how to handle it:
  ┌──────────────────┬────────────────────┬──────────────────────────────────┐
  │    Protection    │       Status       │              Notes               │
  ├──────────────────┼────────────────────┼──────────────────────────────────┤
  │ hCaptcha         │ ✅ Enabled         │ Blocks bots, not typos           │
  ├──────────────────┼────────────────────┼──────────────────────────────────┤
  │ Rate limiting    │ ❌ Not implemented │ Add per-IP signup limits         │
  ├──────────────────┼────────────────────┼──────────────────────────────────┤
  │ Email validation │ ❌ Not implemented │ Check format + disposable emails │
  ├──────────────────┼────────────────────┼──────────────────────────────────┤
  │ Custom SMTP      │ ❌ Not configured  │ Isolates YOUR reputation         │
  └──────────────────┴────────────────────┴──────────────────────────────────┘
  My recommendation:

  1. Delete these 2 unconfirmed users - clears the immediate issue
  2. Set up custom SMTP (Resend gives 3,000 free emails/month) - protects you from this in the future
  3. Consider adding email validation or stricter rate limiting for production

  Want me to help you set up Resend as your SMTP provider? It takes about 5 minutes and completely solves this problem by giving you your own email reputation separate from Supabase's shared infrastructure.