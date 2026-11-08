const outline = (id, name, svg) => ({id, name, svg});
const brand = (id, name) => ({id, name, brand: true});

export const ARTIST_LINK_ICON_GROUPS = [
 {name: 'Website & contact', icons: [
  outline('external', 'External Link', '<path d="M14 3h7v7M21 3 10 14M10 5H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6"/>'),
  outline('website', 'Website', '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'),
  outline('about', 'About / Information', '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'),
  outline('email', 'Email', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  outline('phone', 'Phone', '<path d="M7 3H5a2 2 0 0 0-2 2c0 8.8 7.2 16 16 16a2 2 0 0 0 2-2v-2l-5-2-2 2c-3-1-6-4-7-7l2-2-2-5Z"/>'),
  outline('message', 'Message / Enquiry', '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M7 9h10M7 13h7"/>'),
  outline('location', 'Location', '<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2.3"/>'),
  outline('calendar', 'Calendar', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>'),
 ]},
 {name: 'Art & studio', icons: [
  outline('portfolio', 'Gallery / Portfolio', '<rect x="6" y="6" width="15" height="15" rx="1"/><path d="M3 17V4a1 1 0 0 1 1-1h13M7 18l4-4 3 2 3-4 4 5"/><circle cx="10" cy="10" r="1"/>'),
  outline('framed-art', 'Framed Artwork', '<rect x="2.5" y="3" width="19" height="18" rx="1"/><path d="M6 6.5h12v11H6zM6 15l4-4 3 3 2-2 3 3"/>'),
  outline('paintbrush', 'Paintbrush', '<path d="m9 14 10-11a1.4 1.4 0 0 1 2 2L12 17m-3-3c-3-1-5 1-5 4 0 1-.5 2-2 3 6 1 10-1 10-4z"/>'),
  outline('palette', 'Palette', '<path d="M12 3a9 9 0 0 0 0 18h1a2 2 0 0 0 1.5-3.3c-.7-.9 0-2.7 1.3-2.7H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z"/><path d="M7 10h.01M9 6.8h.01M14 6.8h.01M17.5 10h.01"/>'),
  outline('photography', 'Photography', '<path d="M3 7h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3.3"/>'),
  outline('sculpture', 'Sculpture', '<path d="M6 21h12M7 18h10v3H7zM8 18v-3l3-2V9L9 7V5l4-3 4 2v3l-2 2v3l2 3v3"/>'),
  outline('studio', 'Studio', '<path d="m3 10 9-7 9 7M5 9v12h14V9m-9 12v-7h4v7M9 9h6"/>'),
  outline('workshop', 'Workshop / Classes', '<path d="M4 4h16v12H4zM2 16h20m-12 0-3 5m7-5 3 5M8 12l3-3 2 2 3-3"/>'),
 ]},
 {name: 'Shop & events', icons: [
  outline('storefront', 'Shop / Storefront', '<path d="M5 11v10h14V11M3 8l2-5h14l2 5v2a3 3 0 0 1-4.5 2.6A3 3 0 0 1 12 11a3 3 0 0 1-4.5 1.6A3 3 0 0 1 3 10V8Zm0 0h18M9 21v-5h6v5"/>'),
  outline('shop', 'Shopping Cart', '<path d="M2 3h3l3 12h12l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/>'),
  outline('shopping-bag', 'Shopping Bag', '<path d="M5 8h14l2 13H3zM9 9V6a3 3 0 0 1 6 0v3"/>'),
  outline('prints', 'Prints', '<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7zM17 11h1"/>'),
  outline('commission', 'Commission', '<path d="M13 3H5v18h14v-8M8 8h4m-4 4h2m2 5h4m-5-3 1-4 6-6 3 3-6 6-4 1Zm5-8 3 3"/>'),
  outline('tickets', 'Tickets', '<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM15 6v2m0 3v2m0 3v2"/>'),
  outline('exhibition', 'Exhibition', '<path d="M3 21h18M5 21V5h14v16M9 21v-7h6v7M3 5h18m-11 5h4"/>'),
  outline('rsvp', 'RSVP', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 4 3m-1 4 3 3 7-8"/>'),
 ]},
 {name: 'Music & media', icons: [
  outline('music-note', 'Music Note', '<path d="M9 17V5l12-2v12M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>'),
  brand('bandcamp', 'Bandcamp'),
  outline('headphones', 'Headphones / Listen', '<path d="M3 15v-3a9 9 0 0 1 18 0v3M3 13h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm18 0h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2z"/>'),
  outline('record', 'Album / Record', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="M6 12a6 6 0 0 1 6-6m6 6a6 6 0 0 1-6 6"/>'),
  outline('microphone', 'Microphone', '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M6 11v1a6 6 0 0 0 12 0v-1m-6 7v3m-4 0h8"/>'),
  outline('live-music', 'Live Music', '<path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>'),
  outline('video', 'Video', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>'),
  outline('podcast', 'Podcast', '<path d="M6.5 17a8.5 8.5 0 1 1 11 0M8 13a4.5 4.5 0 1 1 8 0"/><circle cx="12" cy="10" r="1.3"/><path d="M10 15a2 2 0 0 1 4 0l-.6 5a1.4 1.4 0 0 1-2.8 0z"/>'),
 ]},
 {name: 'Social & community', icons: [
  brand('instagram', 'Instagram'),
  brand('facebook', 'Facebook'),
  brand('youtube', 'YouTube'),
  brand('tiktok', 'TikTok'),
  outline('pinterest', 'Pinterest', '<circle cx="12" cy="12" r="9"/><path d="m9.5 20 2.2-10m-2.5 3c-2-2.6 0-5.5 2.8-5.5 2.6 0 4.2 1.9 4.2 4.1 0 2.2-1.4 4-3 4-1.3 0-2-.8-2-1.8"/>'),
  brand('spotify', 'Spotify'),
  outline('soundcloud', 'SoundCloud', '<path d="M2 11v4m3-6v8m3-9v10m3-12v12h7a3 3 0 0 0 .5-6A5 5 0 0 0 11 6Z"/>'),
  outline('newsletter', 'Newsletter', '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h8M8 11h3m3 0h2m-8 4h3m3 0h2m-8 3h8"/>'),
 ]},
];

const iconsById = new Map(ARTIST_LINK_ICON_GROUPS.flatMap(group => group.icons.map(icon => [icon.id, icon])));
export const ARTIST_LINK_ICONS = Object.freeze([...iconsById.keys()]);
export const artistLinkIcon = id => iconsById.get(id);

export function makeArtistLinkGlyph(id, brandBase) {
 const icon = artistLinkIcon(id) || artistLinkIcon('external');
 const glyph = document.createElement('span');
 glyph.className = 'glyph';
 glyph.setAttribute('aria-hidden', 'true');
 if (icon.brand) {
  const image = document.createElement('img');
  image.src = brandBase + '/brand-' + icon.id + '.png';
  image.alt = '';
  glyph.append(image);
 } else {
  glyph.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + icon.svg + '</svg>';
 }
 return glyph;
}
