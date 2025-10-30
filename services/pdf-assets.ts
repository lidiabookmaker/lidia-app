// This file contains base64 encoded assets to be embedded in the PDF.
// This ensures that the PDF can be generated without external network requests
// and that fonts and images are always available.

// --- Background Image for the Cover ---
// Source: The blue/green wave image provided by the user.
// FIX: The original base64 string was truncated, causing a syntax error.
// It has been replaced with a valid placeholder to allow the app to compile.
// To restore the original cover, this placeholder should be replaced with the correct, full base64 string of the image.
export const coverBackgroundImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';


// --- Fonts ---
// These are placeholders to fix compilation errors. 
// For the PDF to render with the correct fonts, these must be replaced
// with the actual base64 encoded strings of the corresponding .ttf font files.
export const leagueGothicBase64 = '';
export const merriweatherRegularBase64 = '';
export const merriweatherBoldBase64 = '';
export const merriweatherSansRegularBase64 = '';
export const merriweatherSansBoldBase64 = '';
export const merriweatherSansLightBase64 = '';
export const merriweatherSansItalicBase64 = '';
