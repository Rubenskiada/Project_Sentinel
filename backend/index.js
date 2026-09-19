import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let activeClients = [];

// MCP SSE Streaming endpoint
app.post('/mcp/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write('data: ' + JSON.stringify({ type: 'connection', status: 'established' }) + '\n\n');

  activeClients.push(res);

  req.on('close', () => {
    activeClients = activeClients.filter((c) => c !== res);
  });
});

// Broadcast helper
function broadcast(event) {
  const payload = 'data: ' + JSON.stringify(event) + '\n\n';
  activeClients.forEach((client) => client.write(payload));
}

// SRE Autonomous Tool Loop Endpoint
app.post('/api/trigger-incident', (req, res) => {
  const { command } = req.body;

  // 1. Voice prompt captured
  broadcast({
    type: 'voice_prompt',
    payload: command || 'Alexa, investigate auth service outage',
  });

  // 2. Telemetry Tool Call
  setTimeout(() => {
    broadcast({
      type: 'agent_analysis',
      payload: 'tools/call: cloudwatch_query_anomalies({ namespace: "AWS/ECS", metric: "5xxErrors", threshold: 10 })',
    });
  }, 900);

  // 3. GitHub PR Isolation
  setTimeout(() => {
    broadcast({
      type: 'incident_detected',
      payload: 'tools/call: github_blame_commit({ repo: "sentinel/auth-svc", pr: "#104" }) -> Bad JSON parsing in middleware.',
    });
  }, 2100);

  // 4. Automated PR Revert & Resolution
  setTimeout(() => {
    broadcast({
      type: 'remediation',
      status: 'success',
      payload: 'tools/call: github_revert_pr({ pr_id: "#104" }) -> PR #105 merged. Traffic restored to baseline.',
    });
  }, 3400);

  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('MCP Server listening on port ' + PORT);
});