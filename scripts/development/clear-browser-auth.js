/**
 * Clear Browser Authentication Script
 * 
 * This script helps clear stale authentication data from the browser
 * when the database has been cleared but JWT tokens still exist.
 */

console.log('=== Clear Browser Authentication ===')
console.log('')
console.log('If you are seeing JWT errors on the login page, please:')
console.log('')
console.log('1. Open your browser developer tools (F12)')
console.log('2. Go to the Application/Storage tab')
console.log('3. Clear the following:')
console.log('   - Local Storage (all supabase entries)')
console.log('   - Session Storage (all supabase entries)')
console.log('   - Cookies (all supabase entries)')
console.log('')
console.log('Or simply open an incognito/private window to test.')
console.log('')
console.log('This is expected after clearing the database while')
console.log('browser sessions still exist.')