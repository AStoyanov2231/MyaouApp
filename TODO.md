All UX fixes have been implemented. Here's a summary:

Changes Made

1. Onboarding Page (src/app/(main)/onboarding/page.tsx)

- Removed confetti effect - immediate redirect to /places after completing onboarding
- Added graying out of unselected interests when 5 are already selected (cursor-not-allowed, dimmed colors)
- Added early return in handleInterestToggle to prevent adding more than 5 interests

2. Welcome Page (src/app/(auth)/welcome/page.tsx)

- Added emailSent state
- Shows friendly "Check your email" message with Mail icon when signup requires email confirmation
- Includes "Back to login" button

3. Login Page (src/app/(auth)/login/page.tsx)

- Added emailNotConfirmed state
- Shows "Confirm your email" prompt with amber-colored Mail icon when user tries to log in without confirming
- Includes "Try again" button to return to login form

4. Auth Actions (src/app/(auth)/actions.ts)

- signup: Returns { emailConfirmation: true } when session is null (email confirmation required)
- login: Returns { emailNotConfirmed: true } when error message contains "Email not confirmed"

Type verification passes with no errors.
