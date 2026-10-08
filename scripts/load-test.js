import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverFile = path.join(projectDir, 'server.js');
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'agl-vote-load-'));
const adminKey = 'local-load-test-key';

async function getPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

const port = await getPort();
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [serverFile], {
  cwd: projectDir,
  env: { ...process.env, NODE_ENV: 'production', SERVE_FRONTEND: 'false', PORT: String(port), DATA_DIR: dataDir, ADMIN_KEY: adminKey },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
child.stdout.on('data', (chunk) => { serverOutput += chunk; });
child.stderr.on('data', (chunk) => { serverOutput += chunk; });

async function request(endpoint, { method = 'GET', body, admin = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (admin) headers['x-admin-key'] = adminKey;
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Test server exited early.\n${serverOutput}`);
    try {
      const result = await request('/api/health');
      if (result.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for test server.\n${serverOutput}`);
}

async function voteBatch(ids) {
  const responses = await Promise.all(ids.map((id) => request(`/api/vote/${id}`, { method: 'POST' })));
  const failures = responses.filter((response) => !response.ok || !response.data.success);
  if (failures.length) throw new Error(`${failures.length} of ${ids.length} vote requests failed; first: ${JSON.stringify(failures[0])}`);
  return responses.length;
}

async function assertResults(expectedTotal, expectedCounts) {
  const response = await request('/api/results');
  if (!response.ok) throw new Error(`Results request failed: ${JSON.stringify(response.data)}`);
  const counts = Object.fromEntries(response.data.participants.map((p) => [p.id, p.votes]));
  if (response.data.totalVotes !== expectedTotal) throw new Error(`Expected ${expectedTotal} total votes; received ${response.data.totalVotes}.`);
  for (const [id, expected] of Object.entries(expectedCounts)) {
    if (counts[id] !== expected) throw new Error(`Expected ${id}=${expected}; received ${counts[id]}.`);
  }
  return counts;
}

try {
  await waitForServer();
  for (const [id, name] of [['P01', 'Participant One'], ['P02', 'Participant Two'], ['P03', 'Participant Three']]) {
    const response = await request('/api/admin/participants', { method: 'POST', body: { id, name }, admin: true });
    if (!response.ok) throw new Error(`Could not create ${id}: ${JSON.stringify(response.data)}`);
  }
  const unprotectedWrite = await request('/api/admin/participants', { method: 'POST', body: { id: 'P04', name: 'Should Be Rejected' } });
  if (unprotectedWrite.status !== 401) throw new Error('Admin write without the configured key was not rejected.');
  const duplicate = await request('/api/admin/participants', { method: 'POST', body: { id: 'P01', name: 'Duplicate' }, admin: true });
  if (duplicate.ok) throw new Error('Duplicate participant ID was accepted.');
  const initialParticipants = await request('/api/participants');
  if (initialParticipants.data.length !== 3) throw new Error('New participants did not appear in the list.');
  const edit = await request('/api/admin/participants/P01', { method: 'PUT', body: { name: 'Participant One Edited' }, admin: true });
  if (!edit.ok || edit.data.participant.name !== 'Participant One Edited') throw new Error(`Participant edit failed: ${JSON.stringify(edit.data)}`);
  const deletion = await request('/api/admin/participants/P02', { method: 'DELETE', admin: true });
  if (!deletion.ok) throw new Error(`Participant deletion failed: ${JSON.stringify(deletion.data)}`);
  const recreate = await request('/api/admin/participants', { method: 'POST', body: { id: 'P02', name: 'Participant Two' }, admin: true });
  if (!recreate.ok) throw new Error(`Deleted participant could not be re-added: ${JSON.stringify(recreate.data)}`);

  const noSelectionStart = await request('/api/admin/start', { method: 'POST', admin: true });
  if (noSelectionStart.ok) throw new Error('Voting started without any selected tie-breaker participants.');
  const selection = await request('/api/admin/tie-breaker', { method: 'POST', body: { participantIds: ['P01', 'P02', 'P03'] }, admin: true });
  if (!selection.ok) throw new Error(`Could not select test participants: ${JSON.stringify(selection.data)}`);
  const waitingVote = await request('/api/vote/P01', { method: 'POST' });
  if (waitingVote.ok) throw new Error('A vote was accepted before voting started.');

  let start = await request('/api/admin/start', { method: 'POST', admin: true });
  if (!start.ok) throw new Error(`Could not start test voting: ${JSON.stringify(start.data)}`);
  await voteBatch(Array(500).fill('P01'));
  const single = await assertResults(500, { P01: 500, P02: 0, P03: 0 });
  console.log(`PASS: 500 concurrent votes to P01 → total=500; ${JSON.stringify(single)}`);

  let stop = await request('/api/admin/stop', { method: 'POST', admin: true });
  if (!stop.ok) throw new Error(`Could not stop first test round: ${JSON.stringify(stop.data)}`);
  const reset = await request('/api/admin/reset', { method: 'POST', admin: true });
  if (!reset.ok) throw new Error(`Could not reset test round: ${JSON.stringify(reset.data)}`);
  start = await request('/api/admin/start', { method: 'POST', admin: true });
  if (!start.ok) throw new Error(`Could not start distributed test round: ${JSON.stringify(start.data)}`);

  const distributedIds = Array.from({ length: 500 }, (_, index) => ['P01', 'P02', 'P03'][index % 3]);
  const successes = await voteBatch(distributedIds);
  const expected = { P01: 167, P02: 167, P03: 166 };
  const distributed = await assertResults(successes, expected);
  console.log(`PASS: ${successes} concurrent votes distributed across P01–P03 → total=${successes}; ${JSON.stringify(distributed)}`);

  stop = await request('/api/admin/stop', { method: 'POST', admin: true });
  if (!stop.ok) throw new Error(`Could not stop distributed test round: ${JSON.stringify(stop.data)}`);
  const closedVote = await request('/api/vote/P01', { method: 'POST' });
  if (closedVote.ok) throw new Error('A vote was accepted after STOP.');
  const persisted = JSON.parse(await readFile(path.join(dataDir, 'votes.json'), 'utf8'));
  if (persisted.P01 !== 167 || persisted.P02 !== 167 || persisted.P03 !== 166) throw new Error(`Persisted votes did not match final counts: ${JSON.stringify(persisted)}`);
  const finalReset = await request('/api/admin/reset', { method: 'POST', admin: true });
  if (!finalReset.ok) throw new Error(`Final reset failed: ${JSON.stringify(finalReset.data)}`);
  const waitingResults = await request('/api/results');
  if (waitingResults.data.status !== 'WAITING' || waitingResults.data.totalVotes !== 0) throw new Error('Reset did not clear votes and return status to WAITING.');
  console.log('PASS: stop rejects subsequent votes, flushes the final JSON tally, and reset returns to WAITING with zero votes.');
} catch (error) {
  console.error(`LOAD TEST FAILED: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), new Promise((resolve) => setTimeout(resolve, 12000))]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  await rm(dataDir, { recursive: true, force: true });
}
