import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');
const VOTES_FILE = path.join(DATA_DIR, 'votes.json');
const EVENT_FILE = path.join(DATA_DIR, 'event.json');

let participants = [];
let votes = {};
let eventState = { status: 'WAITING', activeTieBreakers: [], sessionId: null };
let writeQueue = Promise.resolve();
let votesDirty = false;
let votesVersion = 0;
let votesFlushPromise = null;
let flushTimer = null;

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

async function atomicWrite(filePath, data) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.promises.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fs.promises.rename(temporary, filePath);
  } catch (error) {
    await fs.promises.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function enqueueWrite(filePath, data) {
  const operation = writeQueue.then(() => atomicWrite(filePath, data));
  writeQueue = operation.catch((error) => {
    console.error(`[DataStore] Failed writing ${filePath}:`, error.message);
  });
  return operation;
}

function markVotesDirty() {
  votesDirty = true;
  votesVersion += 1;
}

export function flushVotes() {
  if (votesFlushPromise) {
    return votesFlushPromise.then(() => (votesDirty ? flushVotes() : undefined));
  }
  if (!votesDirty) return Promise.resolve();

  const version = votesVersion;
  const data = snapshot(votes);
  votesDirty = false;
  const operation = enqueueWrite(VOTES_FILE, data)
    .then(() => {
      if (votesVersion !== version) votesDirty = true;
    })
    .catch((error) => {
      votesDirty = true;
      throw error;
    })
    .finally(() => {
      votesFlushPromise = null;
    });
  votesFlushPromise = operation;
  return operation.then(() => (votesDirty ? flushVotes() : undefined));
}

function saveParticipants() {
  return enqueueWrite(PARTICIPANTS_FILE, snapshot(participants));
}

function saveEvent() {
  return enqueueWrite(EVENT_FILE, snapshot(eventState));
}

function readJson(filePath, fallback, validate) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function initDataStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  participants = readJson(PARTICIPANTS_FILE, [], Array.isArray)
    .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => ({ id: p.id.trim().toUpperCase(), name: p.name.trim() }))
    .filter((p, index, all) => p.id && p.name && all.findIndex((item) => item.id === p.id) === index);

  const storedVotes = readJson(VOTES_FILE, {}, (value) => value && typeof value === 'object' && !Array.isArray(value));
  votes = {};
  for (const participant of participants) {
    const value = Number(storedVotes[participant.id]);
    votes[participant.id] = Number.isSafeInteger(value) && value >= 0 ? value : 0;
  }

  const storedEvent = readJson(EVENT_FILE, {}, (value) => value && typeof value === 'object' && !Array.isArray(value));
  const validIds = new Set(participants.map((p) => p.id));
  const activeTieBreakers = Array.isArray(storedEvent.activeTieBreakers)
    ? [...new Set(storedEvent.activeTieBreakers.map((id) => String(id).trim().toUpperCase()).filter((id) => validIds.has(id)))]
    : [];
  const status = ['WAITING', 'LIVE', 'CLOSED'].includes(storedEvent.status) ? storedEvent.status : 'WAITING';
  // Never resume a live voting session after a process restart: the in-memory tally is session-critical.
  eventState = {
    status: status === 'LIVE' ? 'CLOSED' : status,
    activeTieBreakers,
    sessionId: typeof storedEvent.sessionId === 'string' ? storedEvent.sessionId : null,
  };

  const files = [
    [PARTICIPANTS_FILE, participants],
    [VOTES_FILE, votes],
    [EVENT_FILE, eventState],
  ];
  for (const [filePath, data] of files) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  if (!flushTimer) {
    flushTimer = setInterval(() => {
      if (votesDirty) flushVotes().catch((error) => console.error('[DataStore] Periodic vote flush failed:', error.message));
    }, 1000);
    flushTimer.unref?.();
  }
  console.log(`[DataStore] Loaded ${participants.length} participants; status ${eventState.status}`);
}

export function getParticipants() {
  return participants.map((p) => ({ ...p, votes: votes[p.id] || 0 }));
}

export function getParticipantById(id) {
  if (!id) return undefined;
  const normalized = String(id).trim().toUpperCase();
  const participant = participants.find((item) => item.id === normalized);
  return participant ? { ...participant, votes: votes[participant.id] || 0 } : undefined;
}

function ensureNotLive() {
  if (eventState.status === 'LIVE') throw new Error('Participant configuration cannot be changed while voting is LIVE. Stop voting first.');
}

function normalizeId(id) {
  const normalized = String(id ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,32}$/.test(normalized)) throw new Error('Participant ID must contain 1–32 letters, numbers, hyphens, or underscores.');
  return normalized;
}

export async function addParticipant({ id, name }) {
  ensureNotLive();
  const normalizedId = normalizeId(id);
  const normalizedName = String(name ?? '').trim();
  if (!normalizedName || normalizedName.length > 80) throw new Error('Participant name is required and must be at most 80 characters.');
  if (participants.some((p) => p.id === normalizedId)) throw new Error('Participant ID already exists.');
  const participant = { id: normalizedId, name: normalizedName };
  participants.push(participant);
  votes[normalizedId] = 0;
  markVotesDirty();
  await Promise.all([saveParticipants(), flushVotes()]);
  return { ...participant, votes: 0 };
}

export async function updateParticipant(id, { name }) {
  ensureNotLive();
  const normalizedId = normalizeId(id);
  const normalizedName = String(name ?? '').trim();
  if (!normalizedName || normalizedName.length > 80) throw new Error('Participant name is required and must be at most 80 characters.');
  const participant = participants.find((p) => p.id === normalizedId);
  if (!participant) throw new Error('Participant not found.');
  participant.name = normalizedName;
  await saveParticipants();
  return { ...participant, votes: votes[normalizedId] || 0 };
}

export async function deleteParticipant(id) {
  ensureNotLive();
  const normalizedId = normalizeId(id);
  const index = participants.findIndex((p) => p.id === normalizedId);
  if (index === -1) throw new Error('Participant not found.');
  const [removed] = participants.splice(index, 1);
  delete votes[normalizedId];
  eventState.activeTieBreakers = eventState.activeTieBreakers.filter((item) => item !== normalizedId);
  markVotesDirty();
  await Promise.all([saveParticipants(), flushVotes(), saveEvent()]);
  return removed;
}

export function getStatus() {
  return eventState.status;
}

export function getEventStatus() {
  return { ...eventState, activeTieBreakers: [...eventState.activeTieBreakers] };
}

export function getActiveTieBreakers() {
  return [...eventState.activeTieBreakers];
}

export async function setActiveTieBreakers(participantIds) {
  ensureNotLive();
  if (!Array.isArray(participantIds)) throw new Error('participantIds must be an array.');
  const available = new Set(participants.map((p) => p.id));
  eventState.activeTieBreakers = [...new Set(participantIds.map((id) => String(id).trim().toUpperCase()).filter((id) => available.has(id)))];
  await saveEvent();
  return [...eventState.activeTieBreakers];
}

export function getResults() {
  const selected = new Set(eventState.activeTieBreakers);
  const current = participants.filter((p) => selected.has(p.id));
  const totalVotes = current.reduce((total, p) => total + (votes[p.id] || 0), 0);
  const participantResults = current.map((p) => {
    const count = votes[p.id] || 0;
    return { id: p.id, name: p.name, votes: count, percentage: totalVotes ? Number(((count / totalVotes) * 100).toFixed(1)) : 0 };
  }).sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id));

  let leader = null;
  let isTie = false;
  if (participantResults.length && participantResults[0].votes > 0) {
    const top = participantResults.filter((p) => p.votes === participantResults[0].votes);
    isTie = top.length > 1;
    leader = {
      id: top.map((p) => p.id).join(' & '),
      name: top.map((p) => p.name).join(' & '),
      votes: top[0].votes,
    };
  }
  return {
    ...getEventStatus(),
    totalVotes,
    participants: participantResults,
    allParticipants: getParticipants(),
    leader,
    isTie,
  };
}

export function recordVote(participantId) {
  const normalizedId = String(participantId ?? '').trim().toUpperCase();
  const participant = participants.find((p) => p.id === normalizedId);
  if (!participant) return { success: false, statusCode: 404, message: 'Participant not found.' };
  if (eventState.status !== 'LIVE') {
    const message = eventState.status === 'WAITING' ? 'Voting has not started yet.' : 'Voting is currently closed.';
    return { success: false, statusCode: 400, message };
  }
  if (!eventState.activeTieBreakers.includes(normalizedId)) {
    return { success: false, statusCode: 400, message: 'This participant is not part of the active tie-breaker.' };
  }
  // Synchronous on the Node.js event loop. No file I/O is performed on the request path.
  votes[normalizedId] = (votes[normalizedId] || 0) + 1;
  markVotesDirty();
  return { success: true, message: 'Vote recorded successfully.', participantId: normalizedId, votes: votes[normalizedId] };
}

export async function startVoting() {
  if (eventState.status === 'LIVE') throw new Error('Voting is already LIVE.');
  if (eventState.activeTieBreakers.length === 0) throw new Error('Please select at least one tie-breaker participant before starting voting.');
  const selected = new Set(eventState.activeTieBreakers);
  for (const id of selected) votes[id] = 0;
  markVotesDirty();
  eventState.status = 'LIVE';
  eventState.sessionId = randomUUID();
  await Promise.all([flushVotes(), saveEvent()]);
  return { success: true, status: eventState.status, activeTieBreakers: [...eventState.activeTieBreakers], sessionId: eventState.sessionId };
}

export async function stopVoting() {
  if (eventState.status !== 'LIVE') throw new Error('Voting is not currently LIVE.');
  // Close synchronously before awaiting disk so no later request can be accepted.
  eventState.status = 'CLOSED';
  await Promise.all([flushVotes(), saveEvent()]);
  return { success: true, status: eventState.status };
}

export async function resetVotes() {
  eventState.status = 'WAITING';
  eventState.sessionId = null;
  for (const participant of participants) votes[participant.id] = 0;
  markVotesDirty();
  await Promise.all([flushVotes(), saveEvent()]);
  return { success: true, status: 'WAITING' };
}

export async function shutdownDataStore() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushVotes();
  await writeQueue;
}
