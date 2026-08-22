const { google } = require('googleapis');
const { env } = require('../config/env');

class GoogleSheetsService {
    constructor() {
        this.SCOPES = [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ];
    }

    async getAuthenticatedClient() {
        // Option A: Service Account (Recommended)
        if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
            // Handle escaped newlines in private key from environment variables
            const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
            
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: privateKey
                },
                scopes: this.SCOPES
            });
            return auth.getClient();
        }
        
        // Option B: Static Refresh Token (OAuth Client)
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
            const oAuth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                'postmessage' // No redirect URI needed since we only refresh
            );
            
            oAuth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
            
            return oAuth2Client;
        }

        throw new Error('Google Sheets backend credentials are not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY or GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN in the environment variables.');
    }

    async checkStatus() {
        try {
            await this.getAuthenticatedClient();
            return true;
        } catch (err) {
            return false;
        }
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
