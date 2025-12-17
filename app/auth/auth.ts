let secret = process.env.COOKIE_SECRET || "default";
if (secret === "default") {
  console.warn(
    "🚨 No COOKIE_SECRET environment variable set, using default. The app is insecure in production."
  );
  secret = "default-secret";
}

export async function getAuthFromRequest(
  request: Request
): Promise<string | null> {
  let cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  let cookies = new Map(
    cookieHeader.split(";").map((c) => {
      let [key, value] = c.trim().split("=");
      return [key, value];
    })
  );
  return cookies.get("auth") || null;
}

export async function setAuthOnResponse(
  response: Response,
  userId: string
): Promise<Response> {
  let cookie = `auth=${userId}; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  response.headers.append("Set-Cookie", cookie);
  return response;
}

export async function requireAuthCookie(request: Request) {
  let userId = await getAuthFromRequest(request);
  if (!userId) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: "/login",
        "Set-Cookie": `auth=; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
      },
    });
  }
  return userId;
}

export async function redirectIfLoggedInLoader({
  request,
}: {
  request: Request;
}) {
  let userId = await getAuthFromRequest(request);
  if (userId) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: "/home",
      },
    });
  }
  return null;
}

export async function redirectWithClearedCookie(): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `auth=; Max-Age=0; HttpOnly; SameSite=Lax; Expires=${new Date(0).toUTCString()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    },
  });
}
