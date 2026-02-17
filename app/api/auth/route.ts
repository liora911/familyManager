export async function POST(req: Request) {
  const { pin } = await req.json();

  if (pin !== process.env.APP_PIN) {
    return Response.json({ error: "קוד שגוי" }, { status: 401 });
  }

  const response = Response.json({ success: true });

  // Set auth cookie — 30 days
  response.headers.set(
    "Set-Cookie",
    `home-manager-auth=authenticated; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`
  );

  return response;
}
