import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — everyone can access these without logging in
const isPublicRoute = createRouteMatcher([
  "/",
  "/api/usage(.*)",  // usage check is public (we guard inside)
]);

export default clerkMiddleware(async (auth, req) => {
  // Only protect the Gemini API route — toolbox runs client-side, no auth needed
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
