import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';

// Define a delay function to simulate network latency (optional)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();

    console.log('[MOCK LOGIN] Attempting login with:');
    console.log('[MOCK LOGIN] Email:', email);
    console.log('[MOCK LOGIN] Password:', password ? '********' : '(empty)'); // Avoid logging actual password in real scenarios

    await sleep(1500);

    // --- MOCKED BEHAVIOR ---
    // In this mocked version, we assume the login is always successful
    // and we don't actually call a backend API or validate credentials.

    // We are also skipping setting a real auth token cookie for now,
    // as this is just a UI/flow mock.
    // If you wanted to simulate a cookie being set for other parts of the app
    // that might check for it, you could add a placeholder:
    /*
    cookies.set('mock_auth_session', 'true', {
      path: '/',
      httpOnly: true, // Still good practice even for mocks if other code expects it
      secure: process.env.NODE_ENV === 'production', // Or false for local dev
      maxAge: 60 * 15, // e.g., 15 minutes for a mock session
      sameSite: 'lax'
    });
    console.log('[MOCK LOGIN] Mock session cookie set.');
    */

    console.log('[MOCK LOGIN] Login successful (mocked). Redirecting...');

    // Redirect to the next screen (e.g., a dashboard page)
    // Ensure you have a route set up for '/dashboard' or change this to your desired path.
    throw redirect(303, '/dashboard'); // Using 303 See Other for POST-redirect-GET pattern
  }
};
