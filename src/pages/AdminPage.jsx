import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Square,
  RotateCcw,
  Tv,
  QrCode,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Users,
  Trophy,
  Vote,
  Radio,
  Loader2,
} from 'lucide-react';
import Header from '../components/Header.jsx';
import Leaderboard from '../components/Leaderboard.jsx';
import { api } from '../services/api.js';

export default function AdminPage() {
  const [results, setResults] = useState(null);
  const [allParticipants, setAllParticipants] = useState([]);
  const [selectedTieBreakers, setSelectedTieBreakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [savingTieBreakers, setSavingTieBreakers] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [adminKeyRequired, setAdminKeyRequired] = useState(false);
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');

  // New participant input states
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');

  // Editing participant state
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const showNotification = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdminData = async () => {
    try {
      const [resData, partsList, tbData, config] = await Promise.all([
        api.getResults(),
        api.getParticipants(),
        api.getTieBreaker(),
        api.getAdminConfig(),
      ]);
      setResults(resData);
      setAllParticipants(partsList);
      setSelectedTieBreakers(tbData.activeTieBreakers || []);
      setAdminKeyRequired(Boolean(config.adminKeyRequired));
      if (!config.adminKeyRequired) setAdminAuthorized(true);
      setLoadError('');
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setLoadError(err.message || 'Unable to connect to voting server.');
      setLoading(false);
    }
  };

  const handleAdminKeySubmit = async (event) => {
    event.preventDefault();
    try {
      await api.verifyAdminKey(adminKeyInput);
      sessionStorage.setItem('agl_admin_key', adminKeyInput);
      setAdminAuthorized(true);
      showNotification('Admin key accepted for this browser tab.');
    } catch (err) {
      setAdminAuthorized(false);
      showNotification(err.message || 'Admin key was not accepted.', true);
    }
  };

  useEffect(() => {
    fetchAdminData();

    const storedKey = sessionStorage.getItem('agl_admin_key');
    if (storedKey) {
      api.verifyAdminKey(storedKey)
        .then(() => setAdminAuthorized(true))
        .catch(() => {
          sessionStorage.removeItem('agl_admin_key');
          setAdminAuthorized(false);
        });
    }

    // Auto-poll results and participants every 1.5 seconds
    const timer = setInterval(async () => {
      try {
        const [resData, partsList] = await Promise.all([
          api.getResults(),
          api.getParticipants(),
        ]);
        setResults(resData);
        setAllParticipants(partsList);
      } catch {
        // quiet polling error
      }
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  // START VOTING
  const handleStartVoting = async () => {
    if (selectedTieBreakers.length === 0) {
      showNotification('Please select at least one tie-breaker participant before starting voting.', true);
      return;
    }
    setActionLoading(true);
    try {
      await api.startVoting();
      showNotification('Voting is now LIVE!');
      await fetchAdminData();
    } catch (err) {
      showNotification(err.message || 'Failed to start voting.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // STOP VOTING
  const handleStopVoting = async () => {
    setActionLoading(true);
    try {
      await api.stopVoting();
      showNotification('Voting ended. Results finalized.');
      await fetchAdminData();
    } catch (err) {
      showNotification(err.message || 'Failed to stop voting.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // RESET VOTES
  const handleConfirmReset = async () => {
    setActionLoading(true);
    try {
      await api.resetVotes();
      setShowResetConfirm(false);
      showNotification('All votes reset to 0. Status set to WAITING.');
      await fetchAdminData();
    } catch (err) {
      showNotification(err.message || 'Failed to reset votes.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // ADD PARTICIPANT
  const handleAddParticipant = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const trimmedId = newId.trim().toUpperCase();
    const trimmedName = newName.trim();

    if (!trimmedId) {
      showNotification('Participant ID is required.', true);
      return;
    }
    if (!trimmedName) {
      showNotification('Participant name is required.', true);
      return;
    }

    setAddingParticipant(true);
    try {
      const res = await api.addParticipant({ id: trimmedId, name: trimmedName });
      showNotification(res.message || 'Participant added successfully.');
      setNewId('');
      setNewName('');

      // Refresh immediately
      await fetchAdminData();
    } catch (err) {
      showNotification(err.message || 'Failed to add participant.', true);
    } finally {
      setAddingParticipant(false);
    }
  };

  // EDIT PARTICIPANT NAME
  const handleSaveEdit = async (id) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      showNotification('Participant name is required.', true);
      return;
    }
    setUpdatingId(id);
    try {
      await api.updateParticipant(id, { name: trimmed });
      showNotification('Participant updated successfully.');
      setEditingId(null);
      setEditingName('');
      await fetchAdminData();
    } catch (err) {
      showNotification(err.message || 'Failed to update participant.', true);
    } finally {
      setUpdatingId(null);
    }
  };

  // DELETE PARTICIPANT
  const handleDeleteParticipant = async (id) => {
    if (!window.confirm(`Are you sure you want to delete participant ${id}?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteParticipant(id);
      showNotification(`Participant ${id} deleted successfully.`);
      setSelectedTieBreakers((prev) => prev.filter((tbId) => tbId !== id));
      await fetchAdminData();
    } catch (err) {
      showNotification(err.message || 'Failed to delete participant.', true);
    } finally {
      setDeletingId(null);
    }
  };

  // TIE-BREAKER CHECKBOX TOGGLE (local state)
  const handleToggleTieBreaker = (id) => {
    if (selectedTieBreakers.includes(id)) {
      setSelectedTieBreakers(selectedTieBreakers.filter((tbId) => tbId !== id));
    } else {
      setSelectedTieBreakers([...selectedTieBreakers, id]);
    }
  };

  // SAVE TIE-BREAKER SELECTION
  const handleSaveTieBreakers = async () => {
    setSavingTieBreakers(true);
    try {
      const res = await api.setTieBreaker(selectedTieBreakers);
      showNotification(res.message || `${selectedTieBreakers.length} participants selected.`);
      await fetchAdminData();
    } catch (err) {
      showNotification(err.message || 'Failed to save tie-breaker selection.', true);
    } finally {
      setSavingTieBreakers(false);
    }
  };

  // SELECT ALL / CLEAR
  const handleSelectAll = () => {
    setSelectedTieBreakers(allParticipants.map((p) => p.id));
  };

  const handleClearAll = () => {
    setSelectedTieBreakers([]);
  };

  const status = results?.status || 'WAITING';
  const totalVotes = results?.totalVotes || 0;
  const leader = results?.leader;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase">
              ABES GOES LATENT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-zinc-100 mt-0.5">
              ADMIN CONTROL PANEL
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Live Tie-Breaker Organizer Console
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/display"
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-xs font-semibold text-zinc-200 hover:text-amber-400 flex items-center gap-2 transition-all shadow-sm"
            >
              <Tv className="w-4 h-4 text-amber-400" />
              <span>Auditorium Display</span>
            </Link>

            <Link
              to="/admin/qr"
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-xs font-semibold text-zinc-200 hover:text-amber-400 flex items-center gap-2 transition-all shadow-sm"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>QR Codes</span>
            </Link>
          </div>
        </div>

        {/* Toast Notification Banner */}
      {toast && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-3 transition-all ${
              toast.isError
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
            }`}
          >
            {toast.isError ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {adminKeyRequired && !adminAuthorized && (
          <form onSubmit={handleAdminKeySubmit} className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-300">Organizer access required</p>
              <p className="text-xs text-zinc-400 mt-1">Enter the server&apos;s ADMIN_KEY. It is kept only in this browser tab.</p>
            </div>
            <input aria-label="Admin key" type="password" autoComplete="current-password" value={adminKeyInput} onChange={(event) => setAdminKeyInput(event.target.value)} className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm" placeholder="Admin key" />
            <button type="submit" className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-bold">Unlock admin</button>
          </form>
        )}

        {loadError && (
          <div role="alert" className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{loadError}</span>
            <button type="button" onClick={fetchAdminData} className="px-4 py-2 rounded-lg bg-zinc-800 text-sm font-bold hover:bg-zinc-700">Retry</button>
          </div>
        )}

        {/* SECTION 11: Top 3 Metric Cards (Event Status, Total Votes, Current Leader) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Event Status */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
              EVENT STATUS
            </span>
            <div className="my-2">
              {status === 'LIVE' ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/50 text-rose-400 font-bold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  🔴 LIVE
                </div>
              ) : status === 'CLOSED' ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-sm">
                  CLOSED
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/40 text-amber-400 font-bold text-sm">
                  WAITING
                </div>
              )}
            </div>
            <span className="text-xs text-zinc-500">
              {status === 'LIVE'
                ? 'Audience votes are currently being recorded'
                : status === 'CLOSED'
                ? 'Voting window closed. Final tally locked'
                : 'Waiting to start live tie-breaker'}
            </span>
          </div>

          {/* Card 2: Total Votes */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                TOTAL VOTES
              </span>
              <Vote className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-1 text-3xl sm:text-4xl font-extrabold font-mono text-zinc-100 tabular-nums">
              {totalVotes}
            </div>
            <span className="text-xs text-zinc-500">
              {status === 'LIVE' ? 'Real-time count from auditorium' : 'Total votes cast'}
            </span>
          </div>

          {/* Card 3: Current Leader */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                CURRENT LEADER
              </span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-1 text-xl sm:text-2xl font-bold font-heading text-amber-400 truncate">
              {leader && leader.votes > 0 ? (results?.isTie ? 'TIE' : leader.name) : 'No votes yet'}
            </div>
            <span className="text-xs text-zinc-500">
              {leader && leader.votes > 0
                ? `${leader.votes} votes (${leader.id})`
                : 'Awaiting audience votes'}
            </span>
          </div>
        </div>

        {/* SECTION: Tie-Breaker Controls (START, STOP, RESET) */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              TIE-BREAKER CONTROL
            </span>
            <span className="text-xs text-zinc-500">
              Control the live auditorium voting window
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartVoting}
              disabled={actionLoading || status === 'LIVE'}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-heading uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{actionLoading && status !== 'LIVE' ? 'Starting...' : 'START VOTING'}</span>
            </button>

            <button
              onClick={handleStopVoting}
              disabled={actionLoading || status === 'CLOSED' || status === 'WAITING'}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-heading uppercase tracking-wider bg-rose-600 hover:bg-rose-500 active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{actionLoading && status === 'LIVE' ? 'Stopping...' : 'STOP VOTING'}</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET VOTES</span>
            </button>
          </div>
        </div>

        {/* SECTION 5: Tie-Breaker Participants Selection */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-bold font-heading text-zinc-100 uppercase tracking-wide">
                TIE-BREAKER PARTICIPANTS
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select which participants have tied final scores. Only selected participants will appear on the auditorium projector screen.
              </p>
            </div>

            {allParticipants.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-amber-400 text-xs font-mono transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-amber-400 text-xs font-mono transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {allParticipants.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-zinc-500">
              NO TIE-BREAKER PARTICIPANTS SELECTED. Add participants in the section below first.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allParticipants.map((p) => {
                  const isChecked = selectedTieBreakers.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/60 text-zinc-100 shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTieBreaker(p.id)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-zinc-900 border-zinc-700 accent-amber-500 cursor-pointer"
                      />
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {p.id}
                        </span>
                        <span className="text-sm font-semibold truncate text-zinc-200">
                          {p.name}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-mono text-zinc-400">
                  {selectedTieBreakers.length} of {allParticipants.length} participants selected
                </span>

                <button
                  onClick={handleSaveTieBreakers}
                  disabled={savingTieBreakers}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingTieBreakers ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>SET TIE-BREAKER PARTICIPANTS</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* SECTION: Live Results Leaderboard */}
        <div>
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono text-zinc-500">Loading results...</p>
            </div>
          ) : !results ? (
            <div className="py-8 text-center text-sm text-zinc-400">Results are unavailable. Use Retry above when the voting server is reachable.</div>
          ) : (
            <Leaderboard
              participants={results.participants}
              totalVotes={results.totalVotes}
              leader={results.leader}
              isTie={results.isTie}
              status={results.status}
            />
          )}
        </div>

        {/* SECTION 4: Manage Participants (Add, Edit, Delete) */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-heading text-zinc-100 uppercase tracking-wide">
              MANAGE PARTICIPANTS
            </h2>
          </div>

          {/* Form: Add Participant */}
          <form onSubmit={handleAddParticipant} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="ID (e.g. P01)"
              value={newId}
              onChange={(e) => setNewId(e.target.value.toUpperCase())}
              disabled={addingParticipant}
              className="w-full sm:w-36 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-mono font-bold text-amber-400 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="Participant Name (e.g. Utkarsh)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={addingParticipant}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-bold text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={addingParticipant}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {addingParticipant ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding participant...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>ADD PARTICIPANT</span>
                </>
              )}
            </button>
          </form>

          {/* Participant List */}
          {allParticipants.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
              <p className="text-sm font-bold font-heading text-zinc-300">
                NO PARTICIPANTS YET
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-mono">
                Add participants from the form above to prepare the event.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800 bg-zinc-950/50">
              {allParticipants.map((p) => {
                const isEditing = editingId === p.id;
                const isUpdating = updatingId === p.id;
                const isDeleting = deletingId === p.id;

                return (
                  <div
                    key={p.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-10 h-8 rounded-lg bg-zinc-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {p.id}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            disabled={isUpdating}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-amber-500 text-xs font-bold text-zinc-100 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(p.id)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-3 min-w-0">
                          <span className="text-sm font-bold text-zinc-100 truncate">
                            {p.name}
                          </span>
                          <span className="text-xs font-mono text-zinc-500">
                            /vote/{p.id}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">
                          <span className="text-zinc-200 font-bold tabular-nums">{p.votes || 0}</span> votes
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingId(p.id);
                              setEditingName(p.name);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit participant name"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteParticipant(p.id)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 border border-zinc-800 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete participant"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal for RESET */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-zinc-100">
              Reset All Votes?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              This will set every participant&apos;s vote count to 0 and change the event status back to WAITING.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                {actionLoading ? 'Resetting...' : 'Yes, Reset All Votes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
