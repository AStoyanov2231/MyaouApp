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