/**
 * Safely normalizes incoming status strings from various sources
 * (CSV, UI, legacy database fields) into canonical enum values.
 */

const CANONICAL_SALES_STATUSES = [
    'Not Contacted', 
    'Contacted', 
    'Interested', 
    'Follow-up', 
    'Not Interested', 
    'Converted', 
    'Closed'
];

const normalizeSalesStatus = (status) => {
    if (!status || typeof status !== 'string') return 'Not Contacted';

    const normalized = status.trim().toLowerCase();

    switch (normalized) {
        case 'new lead':
        case 'new':
        case 'not_contacted':
        case 'not contacted':
        case 'notcalled':
        case 'not called':
            return 'Not Contacted';

        case 'contacted':
        case 'called':
        case 'reached out':
            return 'Contacted';

        case 'interested':
        case 'very interested':
        case 'high intent':
            return 'Interested';

        case 'follow-up':
        case 'follow up':
        case 'followup':
        case 'counseling':
        case 'course discussion':
        case 'call pending':
        case 'sales queue':
            return 'Follow-up';
            
        case 'callback':
        case 'call back':
        case 'call_back':
            // we will map callback to Follow-up per new enum
            return 'Follow-up';

        case 'not_interested':
        case 'not interested':
        case 'rejected':
        case 'declined':
        case 'busy':
        case 'wrong number':
            return 'Not Interested';

        case 'converted':
        case 'admitted':
        case 'enrolled':
        case 'joined':
        case 'success':
        case 'won':
            return 'Converted';
            
        case 'no_response':
        case 'no response':
        case 'did not answer':
        case 'unreachable':
        case 'switched off':
            // we will map this to Closed or Not Contacted depending on logic, let's say Closed
            return 'Closed';
            
        case 'closed':
        case 'lost':
            return 'Closed';

        default:
            // If it doesn't match exactly, fallback to Not Contacted
            return 'Not Contacted';
    }
};

module.exports = {
    CANONICAL_SALES_STATUSES,
    normalizeSalesStatus
};
