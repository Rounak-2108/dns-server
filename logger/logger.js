// ==============================
// LOGGER MODULE
// ==============================

const logs = [];

function log(message) {

    const time = new Date().toLocaleTimeString();

    logs.unshift(`[${time}] ${message}`);

    if (logs.length > 50) {
        logs.pop();
    }

    console.log(message);
}
function getLogs() {
    return logs;
}

module.exports = {
    log,
    getLogs
};