const express = require('express');
const morgan = require("morgan")
const { google } = require('googleapis');
const session = require('express-session');

const app = express();

// Middleware
app.use(morgan("dev"))
app.use(express.json());
app.use(
  session({ secret: 'your-secret-key', resave: false, saveUninitialized: true })
);

const credentials = require('./client_secret_321760180491-i4ihkkolh80ug6j7k05g5kmto9ruoqjj.apps.googleusercontent.com.json');
const redirectUri = 'http://localhost:3000/callback'; // Redirect URI for OAuth 2.0

// Create a new OAuth2 client.
const oAuth2Client = new google.auth.OAuth2(
  credentials.web.client_id,
  credentials.web.client_secret,
  redirectUri
);

// Generate the Google Drive API URL for user consent.
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'online',
  scope: ['https://www.googleapis.com/auth/drive'],
});

// Route to request access to Google Drive.
app.get('/request-access', (req, res) => {
  res.redirect(authUrl);
});

// Route to handle OAuth callback from Google.
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    req.session.tokens = tokens;

    // In a real application, you would use the tokens to make API requests.
    // For example, retrieve the user's email using the Gmail API.
    // You can then grant access to Drive files based on the email.

    // For simplicity, we'll just redirect to the Drive files page.
    res.redirect('/drive-files');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error granting access to Google Drive.');
  }
});

// Route to your Drive files page.
app.get('/drive-files', (req, res) => {
  // You can access the user's tokens using req.session.tokens
  // Use the tokens to interact with Google Drive API.
  // Render your Drive files page here.
  res.send('Welcome to your Google Drive files page!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
