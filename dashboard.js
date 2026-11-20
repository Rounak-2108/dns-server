const express = require("express");

function startDashboard(stats, logs) {

    const app = express();

    // ==============================
    // DASHBOARD PAGE
    // ==============================

    app.get("/", (req, res) => {

        const html = `
        <html>

        <head>

            <title>DNS Server Dashboard</title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {

                    margin: 0;

                    background: #111827;

                    color: white;

                    font-family: Arial, sans-serif;

                    padding: 30px;
                }

                .container {

                    max-width: 1200px;

                    margin: auto;
                }

                h1 {

                    text-align: center;

                    color: #00ff99;

                    margin-bottom: 5px;
                }

                .subtitle {

                    text-align: center;

                    color: #9ca3af;

                    margin-bottom: 30px;
                }

                .stats-grid {

                    display: grid;

                    grid-template-columns:
                        repeat(auto-fit, minmax(200px, 1fr));

                    gap: 20px;
                }

                .card {

                    background: #1f2937;

                    padding: 25px;

                    border-radius: 12px;

                    border: 1px solid #374151;

                    text-align: center;
                }

                .card h2 {

                    margin: 0;

                    font-size: 16px;

                    color: #9ca3af;
                }

                .value {

                    font-size: 32px;

                    font-weight: bold;

                    margin-top: 10px;

                    color: #00ff99;
                }

                .hit-rate {

                    margin-top: 25px;

                    background: #1f2937;

                    padding: 25px;

                    border-radius: 12px;

                    border: 1px solid #374151;
                }

                .hit-rate h2 {

                    margin-top: 0;
                }

                .progress {

                    width: 100%;

                    height: 20px;

                    background: #374151;

                    border-radius: 10px;

                    overflow: hidden;
                }

                .progress-bar {

                    width: 0%;

                    height: 100%;

                    background: #00ff99;

                    transition: width 0.3s ease;
                }

                table {

                    width: 100%;

                    border-collapse: collapse;

                    margin-top: 15px;
                }

                th,
                td {

                    padding: 12px;

                    text-align: left;

                    border-bottom: 1px solid #333;
                }

                th {

                    color: #00ff99;
                }

                td {

                    color: #ddd;
                }

                .log {

                    background: #030712;

                    padding: 20px;

                    margin-top: 25px;

                    height: 350px;

                    overflow-y: auto;

                    border-radius: 12px;

                    border: 1px solid #374151;
                }

                .log h2 {

                    margin-top: 0;

                    color: #00ff99;
                }

                .log p {

                    margin: 8px 0;

                    padding: 8px;

                    border-bottom: 1px solid #1f2937;

                    font-family: monospace;

                    color: #d1d5db;
                }

                .status {

                    text-align: center;

                    margin-top: 25px;

                    color: #22c55e;

                    font-weight: bold;
                }

            </style>

        </head>

        <body>

            <div class="container">

                <h1>🚀 DNS SERVER DASHBOARD</h1>

                <div class="subtitle">
                    Live DNS Resolver Monitoring
                </div>


                <!-- ============================== -->
                <!-- STATISTICS -->
                <!-- ============================== -->

                <div class="stats-grid">

                    <div class="card">

                        <h2>Total Requests</h2>

                        <div class="value" id="totalRequests">
                            0
                        </div>

                    </div>


                    <div class="card">

                        <h2>Cache Hits</h2>

                        <div class="value" id="cacheHits">
                            0
                        </div>

                    </div>


                    <div class="card">

                        <h2>Cache Misses</h2>

                        <div class="value" id="cacheMisses">
                            0
                        </div>

                    </div>


                    <div class="card">

                        <h2>Blocked Requests</h2>

                        <div class="value" id="blockedRequests">
                            0
                        </div>

                    </div>


                    <div class="card">

                        <h2>Forwarded Requests</h2>

                        <div class="value" id="forwardedRequests">
                            0
                        </div>

                    </div>


                    <div class="card">

                        <h2>Expired Cache Removed</h2>

                        <div class="value" id="expiredCacheRemoved">
                            0
                        </div>

                    </div>

                </div>


                <!-- ============================== -->
                <!-- CACHE HIT RATE -->
                <!-- ============================== -->

                <div class="hit-rate">

                    <h2>📊 Cache Hit Rate</h2>

                    <p id="cacheHitRate">
                        0.0% of DNS requests were served from cache.
                    </p>

                    <div class="progress">

                        <div
                            class="progress-bar"
                            id="cacheProgress">
                        </div>

                    </div>

                </div>


                <!-- ============================== -->
                <!-- RECENT DNS REQUESTS -->
                <!-- ============================== -->

                <div class="card">

                    <h2>📡 Recent DNS Requests</h2>

                    <table>

                        <thead>

                            <tr>

                                <th>Domain</th>

                                <th>Type</th>

                                <th>Status</th>

                            </tr>

                        </thead>

                        <tbody id="requestTable">

                            <tr>

                                <td colspan="3">
                                    No DNS requests yet.
                                </td>

                            </tr>

                        </tbody>

                    </table>

                </div>


                <!-- ============================== -->
                <!-- LIVE LOGS -->
                <!-- ============================== -->

                <div class="log">

                    <h2>📝 Live Logs</h2>

                    <div id="logs">

                        <p>No DNS activity yet.</p>

                    </div>

                </div>


                <div class="status">

                    🟢 DNS Server Running

                </div>

            </div>


            <!-- ============================== -->
            <!-- LIVE UPDATE JAVASCRIPT -->
            <!-- ============================== -->

            <script>

                async function updateDashboard() {

                    try {

                        const response =
                            await fetch("/api/stats");

                        const data =
                            await response.json();


                        // ==========================
                        // UPDATE STATISTICS
                        // ==========================

                        document.getElementById(
                            "totalRequests"
                        ).textContent =
                            data.stats.totalRequests;


                        document.getElementById(
                            "cacheHits"
                        ).textContent =
                            data.stats.cacheHits;


                        document.getElementById(
                            "cacheMisses"
                        ).textContent =
                            data.stats.cacheMisses;


                        document.getElementById(
                            "blockedRequests"
                        ).textContent =
                            data.stats.blockedRequests;


                        document.getElementById(
                            "forwardedRequests"
                        ).textContent =
                            data.stats.forwardedRequests;


                        document.getElementById(
                            "expiredCacheRemoved"
                        ).textContent =
                            data.stats.expiredCacheRemoved;


                        // ==========================
                        // CACHE HIT RATE
                        // ==========================

                        const total =
                            data.stats.totalRequests;

                        const hits =
                            data.stats.cacheHits;

                        const hitRate =
                            total > 0
                                ? ((hits / total) * 100).toFixed(1)
                                : "0.0";


                        document.getElementById(
                            "cacheHitRate"
                        ).textContent =
                            hitRate +
                            "% of DNS requests were served from cache.";


                        document.getElementById(
                            "cacheProgress"
                        ).style.width =
                            hitRate + "%";


                        // ==========================
                        // REQUEST HISTORY
                        // ==========================

                        const requestTable =
                            document.getElementById(
                                "requestTable"
                            );


                        if (data.stats.recentRequests.length === 0) {

                            requestTable.innerHTML =
                                "<tr>" +
                                "<td colspan='3'>No DNS requests yet.</td>" +
                                "</tr>";

                        } else {

                            requestTable.innerHTML =
                                data.stats.recentRequests
                                    .map(function(request) {

                                        return (
                                            "<tr>" +
                                                "<td>" + request.domain + "</td>" +
                                                "<td>" + request.type + "</td>" +
                                                "<td>" + request.status + "</td>" +
                                            "</tr>"
                                        );

                                    })
                                    .join("");
                        }


                        // ==========================
                        // LIVE LOGS
                        // ==========================

                        const logs =
                            document.getElementById("logs");


                        if (data.logs.length === 0) {

                            logs.innerHTML =
                                "<p>No DNS activity yet.</p>";

                        } else {

                            logs.innerHTML =
                                data.logs
                                    .map(function(log) {

                                        return "<p>" + log + "</p>";

                                    })
                                    .join("");
                        }

                    }
                    catch (error) {

                        console.log(
                            "Dashboard update failed:",
                            error.message
                        );

                    }

                }


                // First update immediately
                updateDashboard();


                // Update every 2 seconds
                setInterval(
                    updateDashboard,
                    2000
                );

            </script>

        </body>

        </html>
        `;

        res.send(html);
    });


    // ==============================
    // API ENDPOINT
    // ==============================

    app.get("/api/stats", (req, res) => {

        res.json({

            stats: stats,

            logs: logs

        });

    });


    // ==============================
    // START DASHBOARD
    // ==============================

    app.listen(3000, () => {

        console.log(
            "Dashboard running on http://localhost:3000"
        );

    });

}

module.exports = startDashboard;