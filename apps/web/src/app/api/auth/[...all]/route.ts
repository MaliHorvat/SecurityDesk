import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function handleAuth(request: Request) {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    console.error("[auth] handler error:", error);
    return Response.json(
      {
        message: "Auth storitev trenutno ni na voljo. Preverite /api/health in Vercel env.",
        code: "AUTH_HANDLER_ERROR",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleAuth(request);
}

export async function POST(request: Request) {
  return handleAuth(request);
}
