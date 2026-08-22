const { google } = require('googleapis');
const GoogleSheetsSettings = require('../models/GoogleSheetsSettings');
const { env } = require('../config/env');

class GoogleSheetsService {
    constructor() {
        this.SCOPES = [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ];
    }

    getOAuthClient() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://techzon-dashboard.onrender.com/api/google-sheets/callback';

        if (!clientId || !clientSecret) {
            console.error('Google OAuth: NOT CONFIGURED');
            throw new Error('Google OAuth credentials not configured on server.');
        }

        return new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
    }

    generateAuthUrl(state) {
        const oAuth2Client = this.getOAuthClient();
        console.log(`\n--- GOOGLE OAUTH DEBUG ---`);
        console.log(`Google OAuth redirect URI:\n${process.env.GOOGLE_REDIRECT_URI || 'https://techzon-dashboard.onrender.com/api/google-sheets/callback'}`);
        console.log(`--------------------------\n`);
        return oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.SCOPES,
            state: state, // CSRF protection
            prompt: 'consent' // Force to get refresh token
        });
    }

    async exchangeCodeForTokens(code) {
        const oAuth2Client = this.getOAuthClient();
        const { tokens } = await oAuth2Client.getToken(code);
        return tokens;
    }

    async saveTokens(tokens) {
        let settings = await GoogleSheetsSettings.findOne();
        if (!settings) {
            settings = new GoogleSheetsSettings();
        }
        
        if (tokens.access_token) settings.accessToken = tokens.access_token;
        if (tokens.refresh_token) settings.refreshToken = tokens.refresh_token;
        if (tokens.expiry_date) settings.tokenExpiry = tokens.expiry_date;

        await settings.save();
        return settings;
    }

    async getAuthenticatedClient() {
        const settings = await GoogleSheetsSettings.findOne();
        if (!settings || !settings.refreshToken) {
            throw new Error('Google account not connected. Please authenticate first.');
        }

        const oAuth2Client = this.getOAuthClient();
        oAuth2Client.setCredentials({
            access_token: settings.accessToken,
            refresh_token: settings.refreshToken,
            expiry_date: settings.tokenExpiry
        });

        // Automatically refresh if expired
        oAuth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                settings.accessToken = tokens.access_token;
            }
            if (tokens.refresh_token) {
                settings.refreshToken = tokens.refresh_token;
            }
            if (tokens.expiry_date) {
                settings.tokenExpiry = tokens.expiry_date;
            }
            await settings.save();
        });

        return oAuth2Client;
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
