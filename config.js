/* ==========================================================================
   Our Little Arcade — connection settings
   After you deploy YOUR relay (see the love-arcade-relay project), put its
   address here and re-publish the site. Leave `relay` empty to use only the
   free public PeerJS server.
   ========================================================================== */
window.ARCADE_CONFIG = {
  // Your relay's address WITHOUT "https://", e.g. 'love-arcade-relay.onrender.com'
  relay: '',
  relaySecure: true,          // false only for testing on localhost
  peerKey: 'lovearcade'       // must match PEER_KEY on the relay
};
