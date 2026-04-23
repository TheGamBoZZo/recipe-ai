import { withSentryConfig } from "@sentry/nextjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: [
          // Prevents clickjacking — stops the app being embedded in an iframe on another site
          { key: "X-Frame-Options", value: "DENY" },

          // Stops browsers from MIME-sniffing a response away from the declared Content-Type
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Controls how much referrer info is sent — keeps URLs private
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Prevents XSS by controlling which sources can load scripts, styles, images etc.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: self + Next.js inline scripts (nonce-based would be better but requires middleware)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Styles: self + Google Fonts + inline styles used by the app
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts: Google Fonts CDN
              "font-src 'self' https://fonts.gstatic.com",
              // Images: self + Google user profile pictures (for auth avatars)
              "img-src 'self' data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
              // API calls: self + AI provider APIs
              "connect-src 'self' https://generativelanguage.googleapis.com https://openrouter.ai https://api.anthropic.com https://api.x.ai https://api.deepseek.com",
              // No frames, objects, or base tag overrides
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              // Force HTTPS for all future requests on this origin (1 year)
              "upgrade-insecure-requests",
            ].join("; "),
          },

          // HSTS — once a browser visits over HTTPS it will only use HTTPS for 1 year
          // includeSubDomains is excluded intentionally since we don't control subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },

          // Disables access to browser features we don't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "muhammad-raees-fakier",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
