const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'test_page.html'), 'utf-8');
const dom = new JSDOM(html, { url: 'https://the-ken.com' });
const doc = dom.window.document;

// Look for sign-in links or member profile elements
const signInBtn = doc.querySelector('a[href*="sign-in"], a[href*="login"], .signin, .login');
console.log('Sign in element found:', signInBtn ? signInBtn.outerHTML : 'None');

const profileBtn = doc.querySelector('.profile, .user-profile, .my-account, .profile-nav-item');
console.log('Profile element found:', profileBtn ? profileBtn.outerHTML : 'None');

// Check text content for user login identifiers
const bodyText = doc.body.textContent;
if (bodyText.includes('Sign In')) {
  console.log('Body still contains "Sign In" text.');
} else {
  console.log('Body does NOT contain "Sign In" text.');
}
