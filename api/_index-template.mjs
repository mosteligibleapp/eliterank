// Kept in sync with index.html so the OG handler renders sensible meta when
// running locally without a prior `vite build`. In prod,
// scripts/inline-index-template.mjs overwrites this with the real shell
// produced by Vite (hashed bundle script tags, etc.) before deploy. If you
// change index.html, update this stub too.
export const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="twilio-domain-verification" content="238e93cf6750f98e751ac834f9bb7a1f" />
    <title>Competition Management Platform &amp; Voting Software | EliteRank</title>

    <!-- Open Graph / Social Sharing -->
    <meta property="og:url" content="https://eliterank.co" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Competition Management Platform &amp; Voting Software | EliteRank" />
    <meta property="og:description" content="Enter · Compete · Win. The most prestigious social competition platform." />
    <meta property="og:image" content="https://eliterank.co/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Competition Management Platform &amp; Voting Software | EliteRank" />
    <meta name="twitter:description" content="Enter · Compete · Win. The most prestigious social competition platform." />
    <meta name="twitter:image" content="https://eliterank.co/og-image.png" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
