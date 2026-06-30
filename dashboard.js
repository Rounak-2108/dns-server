const express = require("express");

function startDashboard(stats, logs) {

    const app = express();

    app.get("/", (req, res) => {

        const html = `
        <html>
        <head>
            <title>DNS Dashboard</title>

            <style>
                body{
                    background:#111;
                    color:white;
                    font-family:Arial;
                    padding:20px;
                }

                h1{
                    color:#00ff99;
                }

                .card{
                    background:#222;
                    padding:20px;
                    margin:10px 0;
                    border-radius:10px;
                }

                .log{
                    background:black;
                    padding:10px;
                    margin-top:20px;
                    height:300px;
                    overflow:auto;
                    border-radius:10px;
                }
            </style>
        </head>

        <body>

            <h1>🚀 DNS SERVER DASHBOARD</h1>

            <div class="card">
                <h2>Total Requests: ${stats.totalRequests}</h2>
            </div>

            <div class="card">
                <h2>Cache Hits: ${stats.cacheHits}</h2>
            </div>

            <div class="card">
                <h2>Cache Misses: ${stats.cacheMisses}</h2>
            </div>

            <div class="card">
                <h2>Blocked Requests: ${stats.blockedRequests}</h2>
            </div>

            <div class="card">
                <h2>Forwarded Requests: ${stats.forwardedRequests}</h2>
            </div>

            <div class="card">
                <h2>Expired Cache Removed: ${stats.expiredCacheRemoved}</h2>
            </div>

            <div class="log">
                <h2>Live Logs</h2>

                ${logs.map(log => `<p>${log}</p>`).join("")}
            </div>

        </body>
        </html>
        `;

        res.send(html);
    });

    app.listen(3000, () => {
        console.log("Dashboard running on http://localhost:3000");
    });
}

module.exports = startDashboard;