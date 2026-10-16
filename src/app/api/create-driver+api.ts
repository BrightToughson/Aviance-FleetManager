export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, fleetCode } = body;

    // We use the Secret Key to talk to Clerk's Backend API
    // Note: ensure EXPO_PUBLIC_CLERK_SECRET_KEY is defined in your .env
    const clerkSecret = process.env.EXPO_PUBLIC_CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecret) {
      return Response.json({ error: "Clerk Secret Key is missing." }, { status: 500 });
    }

    const response = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: [email],
        first_name: firstName,
        last_name: lastName,
        public_metadata: { role: 'driver', fleetCode },
        skip_password_checks: true,
        skip_password_requirement: true, // Let them set password later via a magic link or forgot password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Clerk API Error:", errorData);
      return Response.json({ error: errorData }, { status: response.status });
    }

    const userData = await response.json();
    
    // NOTE: Once the user is created in Clerk, your Clerk webhook (or this route directly)
    // should insert the driver into your Supabase database.
    // For now, this securely creates the account in Clerk.

    return Response.json({ success: true, user: userData });
  } catch (err: any) {
    console.error("Server Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
