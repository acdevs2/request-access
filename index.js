const express = require('express');
const morgan = require("morgan")
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Load environment variables from .env file, where API keys and passwords are configured.
require('dotenv').config();

// Middleware
app.use(morgan("dev"))
app.use(express.json());
app.use(
    session({ secret: 'your-secret-key', resave: false, saveUninitialized: true })
);

app.set('view engine', 'ejs')
app.set('views', 'views')

const service_auth = new google.auth.GoogleAuth({
    "credentials": {
        "type": process.env.SER_TYPE,
        "project_id": process.env.SER_PROJECT_ID,
        "private_key_id": process.env.SER_PRIVATE_KEY_ID,
        "private_key": process.env.SER_PRIVATE_KEY,
        "client_email": process.env.SER_CLIENT_EMAIL,
        "client_id": process.env.SER_CLIENT_ID,
        "auth_uri": process.env.SER_AUTH_URI,
        "token_uri": process.env.SER_TOKEN_URI,
        "auth_provider_x509_cert_url": process.env.SER_AUTH_PROVIDER_X509_CERT_URL,
        "client_x509_cert_url": process.env.SER_CLIENT_X509_CERT_URL,
    },
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
});

// Create a Google Drive API client
const drive = google.drive({ version: 'v3', service_auth });

const credentials = {
    "web": {
        "client_id": process.env.GOOGLE_CLIENT_ID,
        "project_id": process.env.PROJECT_ID,
        "auth_uri": process.env.AUTH_URI,
        "token_uri": process.env.TOKEN_URI,
        "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
        "client_secret": process.env.CLIENT_SECRET
    }
}
const redirectUri = 'https://request-access.cyclic.cloud/callback'; // Redirect URI for OAuth 2.0

// Create a new OAuth2 client.
const oAuth2Client = new google.auth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    redirectUri
);

// Generate the Google Drive API URL for user consent.
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.email']
});


/* Routes */

app.get('/', (req, res) => {
    res.render('index')
})

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

        // Get the authenticated user's email
        const userEmail = await getUserEmail(oAuth2Client)
        
        // Define the permission
        const fileId = '1fOiu69M5UQjTJ89uew3AHxU-6g70Vq8I';
        const permission = {
            type: 'user',
            role: 'Viewer',
            emailAddress: userEmail, // User's email
        };

        // Add the user to the file's permissions
        drive.permissions.create({
            fileId,
            requestBody: permission,
        })
        .then((response) => {
            console.log('Permission added:', response.data);
            const viewLink = `https://drive.google.com/file/d/${fileId}/view`;
            res.redirect(viewLink);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send('Error granting access to Google Drive.');
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error granting access to Google Drive.');
    }
});

async function getUserEmail(auth) {
    const userInfo = await google.oauth2('v2').userinfo.get({ auth });
    return userInfo.data.email;
}
