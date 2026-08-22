const { google } = require('googleapis');
const { env } = require('../config/env');

class GoogleSheetsService {
    constructor() {
        this.SCOPES = [
            'https://www.googleapis.com/auth/spreadsheets.readonly'
        ];
    }

    // Used strictly for one-time setup
    getOAuthClientForSetup() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        
        // Exact callback URI as mandated
        const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://techzon-dashboard.onrender.com/api/google-sheets/oauth/callback';

        if (!clientId || !clientSecret) {
            throw new Error('Google Client ID or Secret missing in backend configuration.');
        }

        return new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
    }

    generateAuthUrl(state) {
        const oAuth2Client = this.getOAuthClientForSetup();
        return oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.SCOPES,
            state: state, // CSRF protection
            prompt: 'consent', // Force to get refresh token
            include_granted_scopes: true
        });
    }

    async exchangeCodeForTokens(code) {
        const oAuth2Client = this.getOAuthClientForSetup();
        const { tokens } = await oAuth2Client.getToken(code);
        return tokens;
    }

    // Used strictly for automated Sync functionality
    async getAuthenticatedClient() {
        if (!process.env.GOOGLE_CLIENT_ID) throw new Error('Google Client ID is not configured.');
        if (!process.env.GOOGLE_CLIENT_SECRET) throw new Error('Google Client Secret is not configured.');
        if (!process.env.GOOGLE_REFRESH_TOKEN) throw new Error('Google Refresh Token is not configured. Complete the one-time Google authorization setup.');
        
        // Use a client with NO redirect URI for automated refresh
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        
        oAuth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
        
        return oAuth2Client;
    }

    // Advanced Validation Status
    async getDetailedStatus() {
        const status = {
            configured: false,
            authentication: 'oauth_refresh_token',
            missingVariables: []
        };

        if (!process.env.GOOGLE_CLIENT_ID) status.missingVariables.push({ name: 'GOOGLE_CLIENT_ID', error: 'Google Client ID is not configured.' });
        if (!process.env.GOOGLE_CLIENT_SECRET) status.missingVariables.push({ name: 'GOOGLE_CLIENT_SECRET', error: 'Google Client Secret is not configured.' });
        
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            status.canSetupOAuth = true;
        }

        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            status.missingVariables.push({ name: 'GOOGLE_REFRESH_TOKEN', error: 'Google Refresh Token is not configured. Complete the one-time Google authorization setup.' });
        } else {
            status.authConfigured = true;
        }

        if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
            status.missingVariables.push({ name: 'GOOGLE_SHEETS_SPREADSHEET_ID', error: 'Google Spreadsheet ID is not configured.' });
            status.spreadsheetConfigured = false;
        } else {
            status.spreadsheetConfigured = true;
        }

        if (status.missingVariables.length === 0) {
            status.configured = true;
        }

        return status;
    }

    async getWorksheets(spreadsheetId) {
        const auth = await this.getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.get({
            spreadsheetId
        });

        return response.data.sheets.map(sheet => sheet.properties.title);
    }

    async getSheetData(spreadsheetId, worksheetName) {
        const auth = await this.getAuthenticatedClient();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${worksheetName}!A1:Z`
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return [];

        const headers = rows[0];
        const data = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowObj = {};
            headers.forEach((header, index) => {
                rowObj[header] = row[index] || '';
            });
            rowObj._rowIndex = i + 1;
            data.push(rowObj);
        }

        return data;
    }
}

module.exports = new GoogleSheetsService();
