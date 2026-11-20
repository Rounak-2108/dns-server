// ==============================
// REQUEST HISTORY MANAGER
// ==============================

const recentRequests = [];

const MAX_HISTORY = 10;


// ==============================
// ADD REQUEST
// ==============================

function addRequest(domain, type, status) {

    const request = {
        domain,
        type,
        status,
        time: new Date().toLocaleTimeString()
    };

    recentRequests.unshift(request);

    // Keep only the latest 10 requests
    if (recentRequests.length > MAX_HISTORY) {
        recentRequests.pop();
    }
}


// ==============================
// GET RECENT REQUESTS
// ==============================

function getRecentRequests() {

    return recentRequests;
}


module.exports = {
    addRequest,
    getRecentRequests
};