import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Maintain active SSE clients
let activeClients = [];

app.post('/mcp/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write('data: ' + JSON.stringify({ type: 'connection', status: 'established' }) + '\n\n');

  activeClients.push(res);

  req.on('close', () => {
    activeClients = activeClients.filter((client) => client !== res);
  });
});

// Broadcast helper
function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  activeClients.forEach((client) => client.write(payload));
}

// Endpoint to simulate triggering an Alexa / SRE voice incident
app.post('/api/trigger-incident', async (req, res) => {
  const { command } = req.body;

  broadcast({
    type: 'voice_prompt',
    payload: command || 'Alexa, report active production incidents',
  });

  // Step 1: Agent acknowledgment
  setTimeout(() => {
    broadcast({
      type: 'agent_analysis',
      payload: 'Sentinel Agent: Scanning AWS CloudWatch metrics & GitHub PR deployments...',
    });
  }, 1000);

  // Step 2: Fault isolation
  setTimeout(() => {
    broadcast({
      type: 'incident_detected',
      payload: 'P1 Detected: Commit #c8a21f broke authentication container health check.',
    });
  }, 2200);

  // Step 3: Automated remediation action
  setTimeout(() => {
    broadcast({
      type: 'remediation',
      status: 'success',
      payload: 'Rollback initiated: Rolled back to commit #b92f03. Pod healthy.',
    });
  }, 3500);

  res.json({ ok: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('MCP Server listening on port ' + PORT);
});
