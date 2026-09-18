// Shared by every "document" upload (Birth Certificate, SLC, 10th/12th/
// Graduation Certificate, Aadhaar, etc.) across Students and Teachers —
// unlike a profile photo, these are legitimately PDFs as often as images,
// and a scanned certificate can reasonably run a bit larger than a photo.
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_ACCEPT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
