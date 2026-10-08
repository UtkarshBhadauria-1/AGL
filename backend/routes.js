import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import {
  getParticipants,
  getParticipantById,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  getStatus,
  getEventStatus,
  getActiveTieBreakers,
  setActiveTieBreakers,
  getResults,
  recordVote,
  startVoting,
  stopVoting,
  resetVotes,
} from './dataStore.js';

export const apiRouter = Router();

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return next();
  const supplied = req.get('x-admin-key') || '';
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return res.status(401).json({ success: false, message: 'Admin key required or invalid.' });
  }
  return next();
}

function sendError(res, error, defaultMessage, status = 400) {
  res.status(status).json({ success: false, message: error?.message || defaultMessage });
}

apiRouter.get('/health', (_req, res) => res.json({ ok: true, timestamp: Date.now() }));
apiRouter.get('/admin/config', (_req, res) => res.json({ adminKeyRequired: Boolean(process.env.ADMIN_KEY) }));
apiRouter.post('/admin/verify', requireAdmin, (_req, res) => res.json({ success: true }));

apiRouter.get('/participants', (_req, res) => res.json(getParticipants()));
apiRouter.get('/participants/:id', (req, res) => {
  const participant = getParticipantById(req.params.id);
  if (!participant) return res.status(404).json({ success: false, message: 'Participant not found.' });
  return res.json(participant);
});

apiRouter.post('/admin/participants', requireAdmin, async (req, res) => {
  try {
    const participant = await addParticipant(req.body || {});
    return res.status(201).json({ success: true, message: 'Participant added successfully.', participant });
  } catch (error) {
    return sendError(res, error, 'Failed to add participant.');
  }
});

apiRouter.put('/admin/participants/:id', requireAdmin, async (req, res) => {
  try {
    const participant = await updateParticipant(req.params.id, req.body || {});
    return res.json({ success: true, message: 'Participant updated successfully.', participant });
  } catch (error) {
    const notFound = error.message === 'Participant not found.';
    return sendError(res, error, 'Failed to update participant.', notFound ? 404 : 400);
  }
});

apiRouter.delete('/admin/participants/:id', requireAdmin, async (req, res) => {
  try {
    const removed = await deleteParticipant(req.params.id);
    return res.json({ success: true, message: 'Participant deleted successfully.', removed });
  } catch (error) {
    const notFound = error.message === 'Participant not found.';
    return sendError(res, error, 'Failed to delete participant.', notFound ? 404 : 400);
  }
});

apiRouter.get('/admin/tie-breaker', (_req, res) => res.json({ activeTieBreakers: getActiveTieBreakers() }));
apiRouter.post('/admin/tie-breaker', requireAdmin, async (req, res) => {
  try {
    const activeTieBreakers = await setActiveTieBreakers(req.body?.participantIds);
    return res.json({ success: true, message: `${activeTieBreakers.length} participants selected.`, activeTieBreakers });
  } catch (error) {
    return sendError(res, error, 'Failed to save tie-breaker selection.');
  }
});

apiRouter.get('/status', (_req, res) => res.json(getEventStatus()));
apiRouter.get('/results', (_req, res) => res.json(getResults()));
apiRouter.post('/vote/:participantId', (req, res) => {
  if (!req.params.participantId) return res.status(400).json({ success: false, message: 'Participant ID is required.' });
  const result = recordVote(req.params.participantId);
  if (!result.success) {
    const { statusCode, ...payload } = result;
    return res.status(statusCode).json(payload);
  }
  return res.json(result);
});

apiRouter.post('/admin/start', requireAdmin, async (_req, res) => {
  try {
    return res.json(await startVoting());
  } catch (error) {
    return sendError(res, error, 'Failed to start voting.');
  }
});
apiRouter.post('/admin/stop', requireAdmin, async (_req, res) => {
  try {
    return res.json(await stopVoting());
  } catch (error) {
    return sendError(res, error, 'Failed to stop voting.', 400);
  }
});
apiRouter.post('/admin/reset', requireAdmin, async (_req, res) => {
  try {
    return res.json(await resetVotes());
  } catch (error) {
    return sendError(res, error, 'Failed to reset votes.', 500);
  }
});
