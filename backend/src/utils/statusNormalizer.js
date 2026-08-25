/**
 * Safely normalizes incoming status strings from various sources
 * (CSV, UI, legacy database fields) into canonical enum values.
 */

const CANONICAL_SALES_STATUSES = [
    'NOT_CONTACTED', 
    'CONTACTED', 
    'INTERESTED', 
    'FOLLOW_UP', 
    'NOT_INTERESTED', 
    'CONVERTED', 
    'CALL_BACK', 
    'NO_RESPONSE'
];

const normalizeSalesStatus = (status) => {
    if (!status || typeof status !== 'string') return 'NOT_CONTACTED';

    const normalized = status.trim().toLowerCase();

    switch (normalized) {
        case 'new lead':
        case 'new':
        case 'not_contacted':
        case 'not contacted':
        case 'notcalled':
        case 'not called':
            return 'NOT_CONTACTED';

        case 'contacted':
        case 'called':
        case 'reached out':
            return 'CONTACTED';

        case 'interested':
        case 'very interested':
        case 'high intent':
            return 'INTERESTED';

        case 'follow-up':
        case 'follow up':
        case 'followup':
        case 'counseling':
        case 'course discussion':
        case 'call pending':
        case 'sales queue':
            return 'FOLLOW_UP';
            
        case 'callback':
        case 'call back':
            return 'CALL_BACK';

        case 'converted':
        case 'sale':
        case 'enrolled':
        case 'joined':
            return 'CONVERTED';

        case 'not interested':
        case 'not_interested':
        case 'low intent':
            return 'NOT_INTERESTED';

        case 'lost':
        case 'dead':
        case 'invalid':
        case 'no response':
        case 'no_response':
            return 'NO_RESPONSE';

        default:
            const exactMatch = CANONICAL_SALES_STATUSES.find(
                s => s.toLowerCase() === normalized
            );
            if (exactMatch) return exactMatch;

            return 'NOT_CONTACTED';
    }
};

module.exports = {
    CANONICAL_SALES_STATUSES,
    normalizeSalesStatus
};
