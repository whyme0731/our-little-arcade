/* ==========================================================================
   Our Little Arcade — connection settings

   The site connects the two of you directly. On strict Wi-Fi / mobile networks
   VIDEO needs a "TURN" relay to get through. Pick ONE way to add it (or none —
   everything else works without it):

   OPTION A — FREE, NO CARD, NO SERVER  (recommended)
     1. Sign up free at https://www.metered.ca  (no credit card needed for the free plan)
     2. Create an app, then copy the app name (the part before ".metered.live")
        and your API key, and paste them into `metered` below.

   OPTION B — your own relay server (see the love-arcade-relay project). Needs a host
     such as Render; set `relay` to its address.
   ========================================================================== */
window.ARCADE_CONFIG = {
  // ---- Option A: Metered (free) ----
  metered: { app: '', apiKey: '' },      // e.g. { app: 'lovearcade', apiKey: 'abc123...' }

  // ---- Option B: your own relay (leave empty if you use Option A) ----
  relay: 'love-arcade-relay.onrender.com',   // your relay (no https://)
  relaySecure: true,                     // false only for testing on localhost
  peerKey: 'lovearcade'                  // must match PEER_KEY on the relay
};
