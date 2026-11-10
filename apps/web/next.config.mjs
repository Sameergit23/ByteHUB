/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === "production";

// Where the Express API lives. The browser never talks to it directly: every "/api/*" request
// is proxied through this Next.js server, so sessions (httpOnly cookies) stay same-origin.
// NOTE: rewrites are resolved at build time for `next build`, so set API_INTERNAL_URL (or
// NEXT_PUBLIC_API_URL) before building the production image.
const apiOrigin = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api"
)
  .replace(/\/$/, "")
  .replace(/\/api$/, "");

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.cashfree.com https://checkout.razorpay.com https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://api.cashfree.com https://sandbox.cashfree.com https://payments.cashfree.com https://payments-test.cashfree.com https://api.razorpay.com https://lumberjack.razorpay.com https://api.stripe.com;
  frame-src 'self' https://sdk.cashfree.com https://payments.cashfree.com https://payments-test.cashfree.com https://api.razorpay.com https://js.stripe.com https://hooks.stripe.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isProduction ? "block-all-mixed-content; upgrade-insecure-requests;" : ""}
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://js.stripe.com")',
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  transpilePackages: ["@bytehub/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
