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

export default nextConfig;
