import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardList, 
  PlusCircle, 
  Trash2, 
  ChevronRight, 
  Clock, 
  User as UserIcon, 
  LogOut,
  CheckCircle2,
  XCircle,
  Award,
  ArrowLeft,
  Users as UsersIcon,
  Settings,
  FileSpreadsheet,
  Info,
  Key,
  Search,
  Check,
  Eye,
  EyeOff,
  Trophy,
  BrainCircuit,
  X,
  Database,
  Image as ImageIcon,
  Edit2,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Upload,
  Download,
  Folder,
  FolderOpen,
  ChevronLeft,
  FileUser,
  Code,
  Code2,
  Copy,
  Terminal,
  Cpu,
  ChevronDown,
  ArrowRight,
  Wifi,
  WifiOff,
  Lock,
  Radio,
  Rocket,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Test, Question, Result, User, QuestionBank, BankQuestion, CodingProblem, TestCase, CodingResultDetail, CodingQuestionBank, BankCodingProblem } from './types';

import MonacoEditor from '@monaco-editor/react';

const DEPARTMENTS = [
  'CSE',
  'AI & DS',
  'IT',
  'EEE',
  'ECE',
  'Mech'
];

const getCodingEvaluationStatus = (
  detail: Pick<CodingResultDetail, 'test_cases_passed' | 'total_test_cases'>
): 'Accepted' | 'Partially Accepted' | 'Failed' => {
  if (detail.test_cases_passed <= 0) return 'Failed';
  if (detail.total_test_cases > 0 && detail.test_cases_passed >= detail.total_test_cases) return 'Accepted';
  return 'Partially Accepted';
};

const useCurrentTimestamp = (intervalMs = 1000) => {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setTimestamp(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return timestamp;
};

const hasContestEnded = (endTime: string | undefined, timestamp: number) => {
  if (!endTime) return false;
  const deadline = new Date(endTime).getTime();
  return Number.isFinite(deadline) && timestamp >= deadline;
};

const isEditableEventTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('.monaco-editor')) return true;
  const editable = target.closest('input, textarea, select, [contenteditable="true"]');
  return editable instanceof HTMLElement && !editable.hasAttribute('disabled');
};

const getRunPassedCount = (runResult: any) => Number(runResult?.passed_count ?? runResult?.passed ?? 0);
const getRunTotalCount = (runResult: any) => Number(runResult?.total_count ?? runResult?.total ?? runResult?.testResults?.length ?? runResult?.results?.length ?? 0);
const hasRunFullyPassed = (runResult: any) => {
  const total = getRunTotalCount(runResult);
  return total > 0 && getRunPassedCount(runResult) === total;
};

const MAX_PROCTORING_WARNINGS = 3;

const getStudentKey = (student: User) => student.student_id?.trim() || student.id.toString();
const getCodingDraftKey = (testId: string | undefined, student: User) =>
  testId ? `adhi-arena:coding-draft:${getStudentKey(student)}:${testId}` : '';
const getPendingSubmissionKey = (testId: string | undefined, student: User) =>
  testId ? `adhi-arena:pending-submission:${getStudentKey(student)}:${testId}` : '';

type NetworkEntry = {
  ssid: string;
  signal: number;
  authentication: string;
  encryption: string;
  secured: boolean;
  saved: boolean;
  connected: boolean;
};

type UpdateStatus = {
  state: string;
  version?: string;
  percent?: number;
  message?: string;
};

// --- Components ---

const Navbar = ({
  user,
  onLogout,
  onChangePassword,
  onOpenNetwork,
  onCheckUpdates,
  updateStatus,
  appVersion
}: {
  user: User | null,
  onLogout: () => void,
  onChangePassword: () => void,
  onOpenNetwork: () => void,
  onCheckUpdates: () => void,
  updateStatus: UpdateStatus,
  appVersion?: string
}) => (
  <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center gap-2.5 group cursor-default">
          <motion.div 
            whileHover={{ scale: 1.08 }}
            className="w-10 h-10 flex items-center justify-center transition-all duration-300"
          >
            <img src="/adhi-arena-logo.png" alt="ADHI ARENA logo" className="w-full h-full object-contain" />
          </motion.div>
          <span className="text-xl font-display font-black tracking-tighter bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent drop-shadow-sm">
            ADHI ARENA
          </span>
          {appVersion && (
            <span className="hidden sm:inline-flex text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              v{appVersion}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNetwork}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="View and connect to Wi-Fi networks"
          >
            <Wifi className="w-4 h-4" />
            <span className="hidden sm:inline">Network</span>
          </button>

          <button
            onClick={onCheckUpdates}
            disabled={['checking', 'downloading', 'installing'].includes(updateStatus.state)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-70 disabled:cursor-wait",
              ['available', 'downloading', 'downloaded', 'deferred', 'installing'].includes(updateStatus.state)
                ? "bg-violet-100 text-violet-700"
                : "text-zinc-600 hover:text-violet-600 hover:bg-violet-50"
            )}
            title={updateStatus.state === 'downloaded' ? "Install downloaded ADHI ARENA update" : "Check for ADHI ARENA updates"}
          >
            <Download className={cn("w-4 h-4", ['downloading', 'installing'].includes(updateStatus.state) && "animate-bounce")} />
            <span className="hidden lg:inline">
              {updateStatus.state === 'checking'
                ? 'Checking'
                : updateStatus.state === 'downloading'
                ? `${updateStatus.percent || 0}%`
                : updateStatus.state === 'downloaded'
                  ? 'Install'
                : updateStatus.state === 'installing'
                  ? 'Installing'
                : ['available', 'deferred'].includes(updateStatus.state)
                  ? 'Download'
                  : 'Updates'}
            </span>
          </button>

          {updateStatus.message && ['downloaded', 'deferred', 'error'].includes(updateStatus.state) && (
            <span className={cn(
              "hidden xl:inline-flex max-w-[220px] truncate text-xs font-semibold px-2.5 py-1 rounded-lg",
              updateStatus.state === 'error'
                ? "bg-red-50 text-red-700"
                : updateStatus.state === 'downloaded'
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
            )}>
              {updateStatus.message}
            </span>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => window.adhiArena?.updates.openAdminReleasePage()}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-semibold text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 rounded-xl transition-colors"
              title="Open the administrator-only GitHub release workflow"
            >
              <Rocket className="w-4 h-4" />
              Publish Update
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {user && (
          <div className="flex items-center gap-6 ml-2 pl-4 border-l border-zinc-200">
            <div className="flex items-center gap-4">
              <button 
                onClick={onChangePassword}
                className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-zinc-50"
                title="Change Password"
              >
                <Key className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
                  <UserIcon className="w-4 h-4" />
                  <span>{user.role === 'admin' ? user.username : (user.student_id ? `${user.username} (${user.student_id})` : user.username)}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                  {user.role === 'admin' ? 'Administrator' : `Batch: ${user.batch}`}
                </span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  </nav>
);

const NetworkPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [networks, setNetworks] = useState<NetworkEntry[]>([]);
  const [connectedSsid, setConnectedSsid] = useState('');
  const [selected, setSelected] = useState<NetworkEntry | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [locationPermissionRequired, setLocationPermissionRequired] = useState(false);

  const refreshNetworks = async (clearExistingError = true) => {
    if (clearExistingError) setError('');
    setLoading(true);
    try {
      if (!window.adhiArena?.network) {
        setMessage('Network controls are available in the installed Windows application.');
        setNetworks([]);
        return;
      }
      const result = await window.adhiArena.network.scan();
      setNetworks(result.networks || []);
      setConnectedSsid(result.connectedSsid || '');
      setMessage(result.message || '');
      if (clearExistingError || result.error) setError(result.error || '');
      setLocationPermissionRequired(Boolean(result.locationPermissionRequired));
    } catch (scanError: any) {
      setError(scanError?.message || 'Unable to scan Wi-Fi networks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refreshNetworks();
    else {
      setSelected(null);
      setPassword('');
      setError('');
    }
  }, [open]);

  const connect = async (network: NetworkEntry, suppliedPassword = '') => {
    if (!window.adhiArena?.network || network.connected) return;
    if (network.secured && !network.saved && !suppliedPassword) {
      setSelected(network);
      return;
    }

    setConnecting(network.ssid);
    setError('');
    try {
      const result = await window.adhiArena.network.connect({
        ssid: network.ssid,
        password: suppliedPassword,
        secured: network.secured,
        saved: network.saved,
      });
      setNetworks(result.networks || []);
      setConnectedSsid(result.connectedSsid || '');
      setSelected(null);
      setPassword('');
    } catch (connectError: any) {
      setError(connectError?.message || `Unable to connect to ${network.ssid}.`);
      await refreshNetworks(false);
    } finally {
      setConnecting('');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="w-full max-w-lg max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center">
                    {connectedSsid ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900">Network Connection</h2>
                    <p className="text-sm text-zinc-500">
                      {connectedSsid ? `Connected to ${connectedSsid}` : 'Select an available Wi-Fi network'}
                    </p>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Available networks</span>
              <button
                onClick={() => refreshNetworks()}
                disabled={loading || Boolean(connecting)}
                className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Scan Again
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              {message && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                  <p>{message}</p>
                  {locationPermissionRequired && (
                    <button
                      onClick={() => window.adhiArena?.network.openLocationSettings()}
                      className="mt-2 inline-flex items-center gap-1.5 font-bold text-amber-900 underline underline-offset-2"
                    >
                      Open Windows Location Settings
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              {!loading && networks.length === 0 && !message && (
                <div className="py-10 text-center text-zinc-400">
                  <Radio className="w-9 h-9 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No Wi-Fi networks were found.</p>
                </div>
              )}
              {networks.map((network) => (
                <button
                  key={network.ssid}
                  onClick={() => connect(network)}
                  disabled={network.connected || Boolean(connecting)}
                  className={cn(
                    "w-full p-4 rounded-2xl border flex items-center justify-between gap-4 text-left transition-all",
                    network.connected
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/40",
                    connecting && connecting !== network.ssid && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Wifi className={cn("w-5 h-5 shrink-0", network.connected ? "text-emerald-600" : "text-indigo-600")} />
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 truncate">{network.ssid}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span>{network.signal}% signal</span>
                        {network.saved && <span className="text-indigo-600">Saved</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {network.secured && <Lock className="w-3.5 h-3.5 text-zinc-400" />}
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-lg",
                      network.connected ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    )}>
                      {connecting === network.ssid ? 'Connecting…' : network.connected ? 'Connected' : 'Connect'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <div className="p-5 border-t border-zinc-200 bg-white">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    connect(selected, password);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-sm font-bold text-zinc-800 mb-1">
                      Password for {selected.ssid}
                    </label>
                    <input
                      autoFocus
                      type="password"
                      minLength={8}
                      maxLength={63}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Enter Wi-Fi password"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setSelected(null); setPassword(''); }}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-600 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={Boolean(connecting)}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50"
                    >
                      Connect
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Footer = () => (
  <footer className="bg-white border-t border-zinc-200 py-8 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center">
            <img src="/adhi-arena-logo.png" alt="ADHI ARENA logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-display font-black tracking-tighter bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
            ADHI ARENA
          </span>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-1">
          <p className="text-sm text-zinc-500 font-medium">
            Developed with ❤️ by <span className="text-indigo-600 font-bold">Venkat B</span>
          </p>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <a href="mailto:venkatb3011@gmail.com" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
              <Info className="w-3 h-3" />
              venkatb3011@gmail.com
            </a>
            <span>•</span>
            <span>© 2026 All Rights Reserved</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

const CodingTestCaseResults = ({ 
  testCaseResults, 
  problems = [], 
  problemId, 
  isTimeOver, 
  isAdmin = false 
}: { 
  testCaseResults?: CodingResultDetail['test_case_results'], 
  problems: (CodingProblem | BankCodingProblem)[],
  problemId: string,
  isTimeOver: boolean,
  isAdmin?: boolean
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {testCaseResults && testCaseResults.length > 0 ? (
        testCaseResults.map((tr, trIdx) => {
          const problem = Array.isArray(problems) ? problems.find(p => p.id === problemId) : null;
          const tc = problem?.test_cases?.[trIdx];
          
          const showDetails = isAdmin || !tr.is_hidden || isTimeOver;
          const input = tr.input !== undefined ? tr.input : tc?.input;
          const expected = tr.expected_output !== undefined ? tr.expected_output : tc?.expected_output;
          const actual = tr.actual_output !== undefined ? tr.actual_output : (tr as any).actual; // Fallback for 'actual' key from run-code
          const error = tr.error_message !== undefined ? tr.error_message : (tr as any).error; // Fallback for 'error' key

          return (
            <div key={trIdx} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 shadow-sm">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                     Case #{trIdx + 1}
                     {tr.is_hidden && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">#hidden</span>}
                  </span>
                  <span className={cn(
                     "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                     tr.status === 'Passed' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}>
                     {tr.status}
                  </span>
               </div>
               {showDetails && (
                  <div className="space-y-2 mt-2">
                     {input !== undefined && (
                        <div>
                           <span className="text-[9px] font-black text-zinc-400 uppercase block mb-1 tracking-wider">Input</span>
                           <pre className="text-[10px] bg-zinc-100 text-zinc-600 p-2 rounded-lg font-mono overflow-x-auto max-h-32 whitespace-pre-wrap border border-zinc-200/50">{input || '(Empty)'}</pre>
                        </div>
                     )}
                     {expected !== undefined && (
                        <div>
                           <span className="text-[9px] font-black text-zinc-400 uppercase block mb-1 tracking-wider">Expected Output</span>
                           <pre className="text-[10px] bg-zinc-100 text-zinc-600 p-2 rounded-lg font-mono overflow-x-auto max-h-32 whitespace-pre-wrap border border-zinc-200/50">{expected || '(Empty)'}</pre>
                        </div>
                     )}
                     {actual !== undefined && (
                        <div>
                           <span className="text-[9px] font-black text-zinc-400 uppercase block mb-1 tracking-wider">Actual Output</span>
                           <pre className="text-[10px] bg-zinc-900 text-zinc-300 p-2 rounded-lg font-mono overflow-x-auto max-h-48 whitespace-pre-wrap border border-zinc-800 shadow-inner">{actual || '(Empty)'}</pre>
                        </div>
                     )}
                     {error && (
                        <div>
                           <span className="text-[9px] font-bold text-red-400 uppercase block mb-1">Error</span>
                           <pre className="text-[10px] bg-red-50 text-red-600 p-2 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap">{error}</pre>
                        </div>
                     )}
                  </div>
               )}
            </div>
          );
        })
      ) : (
        (() => {
          const problem = problems.find(p => p.id === problemId);
          if (!problem || !problem.test_cases || problem.test_cases.length === 0) {
            return (
              <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-xl p-4 text-center text-xs text-zinc-400 italic col-span-2">
                No test case execution data available.
              </div>
            );
          }
          return problem.test_cases.map((tc, tcIdx) => {
            const showDetails = isAdmin || !tc.is_hidden || isTimeOver;
            return (
              <div key={tcIdx} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       Case #{tcIdx + 1}
                       {tc.is_hidden && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">#hidden</span>}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-500">
                       Not Executed
                    </span>
                 </div>
                 {showDetails && (
                    <div className="mt-2 text-[10px] text-zinc-500 font-medium space-y-1">
                       <p><span className="font-bold text-zinc-400">Input:</span> {tc.input}</p>
                       <p><span className="font-bold text-zinc-400">Expected:</span> {tc.expected_output}</p>
                    </div>
                 )}
              </div>
            );
          });
        })()
      )}
    </div>
  );
};

// --- Views ---

const LoginView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; type: 'auth' | 'network' } | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        onLogin(data.user);
      } else if (res.status === 401) {
        setError({
          title: 'Invalid credentials',
          message: data?.message || 'Please check your username or student ID and password.',
          type: 'auth'
        });
      } else {
        setError({
          title: 'Connection problem',
          message: data?.message || 'Unable to verify your login right now. Check your internet connection and try again.',
          type: 'network'
        });
      }
    } catch (error) {
      setError({
        title: 'Check your internet connection',
        message: 'ADHI ARENA could not reach the login server. Please check your Wi-Fi or internet connection and try again.',
        type: 'network'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-zinc-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-zinc-200 p-8"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex w-24 h-24 items-center justify-center mb-5"
          >
            <img src="/adhi-arena-logo.png" alt="ADHI ARENA logo" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="text-4xl font-display font-black tracking-tighter bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent drop-shadow-sm">
            ADHI ARENA
          </h1>
          <p className="text-zinc-500 mt-3 font-medium text-sm">Sign in to access your dashboard</p>
        </div>

        {!isOnline && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-xl flex items-start gap-3">
            <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">You appear to be offline</p>
              <p className="mt-0.5 leading-relaxed">Connect to the internet before signing in.</p>
            </div>
          </div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-6 p-4 text-sm rounded-xl flex items-start gap-3 border",
              error.type === 'network'
                ? "bg-amber-50 border-amber-100 text-amber-800"
                : "bg-red-50 border-red-100 text-red-700"
            )}
          >
            {error.type === 'network' ? (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{error.title}</p>
              <p className="mt-0.5 leading-relaxed">{error.message}</p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Username / Student ID</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Admin: Username | Student: ID"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Enter your password"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const UsersManagement = ({ onUpdate }: { onUpdate?: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', batch: '', student_id: '', department: DEPARTMENTS[0] });
  const [addError, setAddError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearGridConfirm, setShowClearGridConfirm] = useState(false);
  const [showSkipMissingConfirm, setShowSkipMissingConfirm] = useState(false);
  const [isBulkView, setIsBulkView] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'batches' | 'departments' | 'students'>('batches');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setSelectedUserIds([]); // Reset selection on fetch
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      setIsAdding(false);
      setNewUser({ username: '', password: '', batch: '', student_id: '', department: DEPARTMENTS[0] });
      fetchUsers();
      onUpdate?.();
    } else {
      const data = await res.json();
      setAddError(data.error || 'Failed to add user');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedUserIds })
      });
      if (res.ok) {
        await fetchUsers();
        onUpdate?.();
        setShowBulkDeleteConfirm(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete users');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Error deleting users. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchUsers();
        onUpdate?.();
        setUserToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Delete student error:', error);
      alert('Error deleting student. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4 overflow-x-auto whitespace-nowrap pb-2">
        <button 
          onClick={() => {
            setViewMode('batches');
            setSelectedBatch(null);
            setSelectedDepartment(null);
          }}
          className={cn(
            "hover:text-indigo-600 transition-colors",
            viewMode === 'batches' && "font-bold text-indigo-600"
          )}
        >
          All Batches
        </button>
        
        {selectedBatch && (
          <>
            <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
            <button 
              onClick={() => {
                setViewMode('departments');
                setSelectedDepartment(null);
              }}
              className={cn(
                "hover:text-indigo-600 transition-colors",
                viewMode === 'departments' && "font-bold text-indigo-600"
              )}
            >
              {selectedBatch}
            </button>
          </>
        )}

        {selectedDepartment && (
          <>
            <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
            <span className="font-bold text-indigo-600">
              {selectedDepartment}
            </span>
          </>
        )}
      </div>
    );
  };

  const openAddModal = () => {
    setAddError(null);
    setNewUser({
      username: '',
      password: '',
      batch: selectedBatch || '',
      student_id: '',
      department: selectedDepartment || DEPARTMENTS[0]
    });
    setIsAdding(true);
  };

  const batches = Array.from(new Set(users.map(u => u.batch))).filter(Boolean).sort();
  const departments = selectedBatch 
    ? Array.from(new Set([
        ...DEPARTMENTS,
        ...users.filter(u => u.batch === selectedBatch).map(u => u.department)
      ])).filter(Boolean).sort()
    : [];

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      user.username.toLowerCase().includes(query) ||
      (user.student_id || '').toLowerCase().includes(query) ||
      (user.batch || '').toLowerCase().includes(query) ||
      (user.department || '').toLowerCase().includes(query)
    );

    if (searchQuery) return matchesSearch;

    if (viewMode === 'batches') return false;
    if (viewMode === 'departments') return false;
    
    return user.batch === selectedBatch && user.department === selectedDepartment;
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChangingPassword) return;

    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: isChangingPassword, newPassword })
    });

    if (res.ok) {
      setIsChangingPassword(null);
      setNewPassword('');
      alert('Password updated successfully');
    } else {
      alert('Failed to update password');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const formattedUsers = data.map((row: any) => {
        const sid = row.student_id || row.StudentID || row.RegisterNumber || row['Register Number'] || '';
        const dept = row.department || row.Department || '';
        return {
          username: String(row.username || row.Username || '').trim(),
          password: String(row.password || row.Password || '').trim(),
          batch: String(row.batch || row.Batch || '').trim(),
          student_id: String(sid).trim(),
          department: String(dept).trim() || DEPARTMENTS[0]
        };
      }).filter(u => u.username || u.password || u.batch);

      setBulkData([...bulkData, ...formattedUsers]);
      setIsBulkView(true);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFinalizeBulk = async () => {
    const processedUsers = bulkData.map(u => ({
      username: String(u.username || '').trim(),
      password: String(u.password || '').trim(),
      batch: String(u.batch || '').trim(),
      student_id: String(u.student_id || '').trim(),
      department: String(u.department || DEPARTMENTS[0]).trim()
    }));

    const validUsers = processedUsers.filter(u => u.username && u.password && u.batch);
    
    console.log('Finalizing bulk upload. Valid users:', validUsers.length, 'Total rows:', processedUsers.length);

    if (validUsers.length === 0) {
      alert('No valid users to upload. Please ensure Username, Password, and Batch are filled for at least one row.');
      return;
    }

    if (validUsers.length < processedUsers.filter(u => u.username || u.password || u.batch || u.student_id).length) {
      setShowSkipMissingConfirm(true);
      return;
    }

    proceedWithBulkUpload(validUsers);
  };

  const proceedWithBulkUpload = async (validUsers: any[]) => {
    setIsUploading(true);
    try {
      console.log('Sending bulk upload request...');
      const res = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: validUsers })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        console.log('Bulk upload response:', data);

        if (res.ok) {
          alert(`Successfully uploaded ${validUsers.length} students`);
          setIsBulkView(false);
          setBulkData([]);
          fetchUsers();
          onUpdate?.();
        } else {
          alert(data.error || data.message || 'Failed to bulk upload users');
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response received:', text);
        alert(`Server error: Received non-JSON response. Status: ${res.status}`);
      }
    } catch (error) {
      console.error('Bulk upload fetch error:', error);
      alert('Error uploading data. Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const addBulkRow = () => {
    setBulkData([...bulkData, { 
      username: '', 
      password: '', 
      batch: selectedBatch || '', 
      student_id: '', 
      department: selectedDepartment || DEPARTMENTS[0] 
    }]);
  };

  const updateBulkRow = (index: number, field: string, value: string) => {
    const newData = [...bulkData];
    newData[index] = { ...newData[index], [field]: value };
    setBulkData(newData);
  };

  const removeBulkRow = (index: number) => {
    setBulkData(bulkData.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Register Number': '2022CS001',
        'Username': 'student_name',
        'Password': 'password123',
        'Batch': '2026 Passed Out',
        'Department': 'Computer Science'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    XLSX.writeFile(wb, "Student_Upload_Template.xlsx");
  };

  if (isBulkView) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <button 
              onClick={() => setIsBulkView(false)}
              className="text-sm text-zinc-500 hover:text-indigo-600 flex items-center gap-1 mb-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Students
            </button>
            <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              Bulk Data Entry
              <span className="ml-2 text-sm font-normal text-zinc-400">({bulkData.length} rows)</span>
            </h2>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-2 bg-white text-zinc-700 border border-zinc-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
              Download Template
            </button>
            <button 
              type="button"
              onClick={addBulkRow}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Add Row
            </button>
            <button 
              type="button"
              onClick={() => setShowClearGridConfirm(true)}
              className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
            <button 
              type="button"
              onClick={handleFinalizeBulk}
              disabled={isUploading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Finalize & Upload
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider w-12">#</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Student ID / Reg No</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Username *</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Password *</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Batch *</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Department *</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bulkData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-2 text-zinc-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-2 py-1">
                      <input 
                        type="text" 
                        value={row.student_id}
                        onChange={(e) => updateBulkRow(idx, 'student_id', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent outline-none transition-all text-sm"
                        placeholder="e.g. 2022CS001"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input 
                        type="text" 
                        value={row.username}
                        onChange={(e) => updateBulkRow(idx, 'username', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent outline-none transition-all text-sm font-medium"
                        placeholder="Username"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input 
                        type="text" 
                        value={row.password}
                        onChange={(e) => updateBulkRow(idx, 'password', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent outline-none transition-all text-sm"
                        placeholder="Password"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input 
                        type="text" 
                        value={row.batch}
                        onChange={(e) => updateBulkRow(idx, 'batch', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent outline-none transition-all text-sm"
                        placeholder="e.g. 2026 passed out"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select 
                        value={row.department}
                        onChange={(e) => updateBulkRow(idx, 'department', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md border border-transparent focus:border-indigo-300 focus:bg-white bg-transparent outline-none transition-all text-sm"
                      >
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button 
                        type="button"
                        onClick={() => removeBulkRow(idx)}
                        className="text-zinc-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {bulkData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center">
                          <PlusCircle className="w-6 h-6 text-zinc-300" />
                        </div>
                        <p className="text-zinc-400 text-sm">No data entries yet. Add a row or import an Excel file.</p>
                        <button 
                          onClick={addBulkRow}
                          className="text-indigo-600 text-sm font-semibold hover:underline"
                        >
                          Add your first row
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 flex justify-between items-center">
            <p className="text-xs text-zinc-500 italic">* Required fields: Username, Password, Batch</p>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Import from Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-zinc-800 flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-indigo-600" />
          Student Management
        </h2>
        <div className="flex gap-3">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-white text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            Template
          </button>
          <button 
            onClick={() => {
              setBulkData([{ 
                username: '', 
                password: '', 
                batch: selectedBatch || '', 
                student_id: '',
                department: selectedDepartment || DEPARTMENTS[0]
              }]);
              setIsBulkView(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Upload
          </button>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search by name, ID, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        
        {selectedUserIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-red-50 border border-red-100 px-4 py-2 rounded-xl"
          >
            <span className="text-sm font-medium text-red-700">
              {selectedUserIds.length} users selected
            </span>
            <button 
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-sm flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete Selected
            </button>
          </motion.div>
        )}
      </div>

      {!searchQuery && renderBreadcrumbs()}

      {!searchQuery && viewMode === 'batches' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAddModal}
            className="flex items-center gap-4 p-4 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-xl hover:border-indigo-300 hover:bg-white transition-all text-left group"
          >
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 transition-colors shadow-sm">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-600 group-hover:text-indigo-600">New Batch</h3>
              <p className="text-xs text-zinc-400">Create folder</p>
            </div>
          </motion.button>
          
          {batches.map(batch => (
            <motion.button
              key={batch}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedBatch(batch);
                setViewMode('departments');
              }}
              className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 line-clamp-1">{batch}</h3>
                <p className="text-xs text-zinc-500">
                  {users.filter(u => u.batch === batch).length} Students
                </p>
              </div>
            </motion.button>
          ))}
          {batches.length === 0 && (
            <div className="col-span-full py-12 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
              <FolderOpen className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500">No batches found. Add students to see folders.</p>
            </div>
          )}
        </div>
      )}

      {!searchQuery && viewMode === 'departments' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setViewMode('batches');
              setSelectedBatch(null);
            }}
            className="flex items-center gap-4 p-4 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-zinc-300 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-600">Back to Batches</h3>
            </div>
          </motion.button>
          
          {departments.map(dept => (
            <motion.button
              key={dept}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedDepartment(dept);
                setViewMode('students');
              }}
              className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 line-clamp-1">{dept}</h3>
                <p className="text-xs text-zinc-500">
                  {users.filter(u => u.batch === selectedBatch && u.department === dept).length} Students
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {(searchQuery || viewMode === 'students') && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {viewMode === 'students' && !searchQuery && (
            <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center gap-2">
              <button 
                onClick={() => {
                  setViewMode('departments');
                  setSelectedDepartment(null);
                }}
                className="p-1 hover:bg-zinc-200 rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-500" />
              </button>
              <span className="text-sm font-medium text-zinc-600">
                Students in {selectedBatch} - {selectedDepartment}
              </span>
            </div>
          )}
          <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
            <tr>
              <th className="px-6 py-3 w-10">
                <input 
                  type="checkbox"
                  checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3">Student ID</th>
              <th className="px-6 py-3">Username</th>
              <th className="px-6 py-3">Batch</th>
              <th className="px-6 py-3">Department</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className={cn(
                "hover:bg-zinc-50 transition-colors",
                selectedUserIds.includes(user.id) && "bg-indigo-50/30"
              )}>
                <td className="px-6 py-4">
                  <input 
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-4 font-mono text-zinc-500">{user.student_id || 'N/A'}</td>
                <td className="px-6 py-4 font-medium text-zinc-900">{user.username}</td>
                <td className="px-6 py-4 text-zinc-500">{user.batch}</td>
                <td className="px-6 py-4 text-zinc-500">{user.department || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsChangingPassword(user.id)}
                      className="text-zinc-400 hover:text-indigo-600 transition-colors"
                      title="Change Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setUserToDelete(user);
                      }}
                      className="p-2 text-zinc-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center">
                      <FileUser className="w-6 h-6 text-zinc-300" />
                    </div>
                    <p className="text-zinc-500 font-medium">
                      {searchQuery ? 'No students match your search.' : 'No students found in this department.'}
                    </p>
                    {!searchQuery && (
                      <button 
                        onClick={openAddModal}
                        className="text-indigo-600 text-sm font-semibold hover:underline"
                      >
                        Add a student to this department
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">Add New Student</h2>
              
              {addError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Student ID / Reg No</label>
                  <input 
                    type="text" 
                    value={newUser.student_id}
                    onChange={e => setNewUser({...newUser, student_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 2022CS001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. student01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Batch</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.batch}
                    onChange={e => setNewUser({...newUser, batch: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 2026 passed out"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Department</label>
                  <select 
                    required
                    value={newUser.department}
                    onChange={e => setNewUser({...newUser, department: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setAddError(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Add Student
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isChangingPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">New Password</label>
                  <input 
                    type="password" 
                    required
                    autoFocus
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(null);
                      setNewPassword('');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearGridConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Clear Grid?</h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                Are you sure you want to clear all entries in the grid? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearGridConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setBulkData([]);
                    setShowClearGridConfirm(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSkipMissingConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Missing Fields Detected</h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                Some rows are missing required fields (Username, Password, Batch) and will be skipped. Proceed with the valid students?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSkipMissingConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowSkipMissingConfirm(false);
                    const processedUsers = bulkData.map(u => ({
                      username: String(u.username || '').trim(),
                      password: String(u.password || '').trim(),
                      batch: String(u.batch || '').trim(),
                      student_id: String(u.student_id || '').trim(),
                      department: String(u.department || DEPARTMENTS[0]).trim()
                    }));
                    const validUsers = processedUsers.filter((u: any) => u.username && u.password && u.batch);
                    proceedWithBulkUpload(validUsers);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Proceed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Bulk Delete Students?</h3>
                  <p className="text-zinc-500 text-sm">This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-100">
                <p className="text-sm text-zinc-600">
                  Are you sure you want to delete <span className="font-bold text-zinc-900">{selectedUserIds.length}</span> selected users? 
                  All their test results and data will be permanently removed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all shadow-md shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBulkDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete All Selected'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Delete Student?</h3>
                  <p className="text-zinc-500 text-sm">This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-100">
                <p className="text-sm text-zinc-600">
                  Are you sure you want to delete the user: <span className="font-bold text-zinc-900">{userToDelete.username}</span>? 
                  All their test results and data will be permanently removed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all shadow-md shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete User'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuestionBanksManagement = () => {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [newBankTitle, setNewBankTitle] = useState('');
  const [bankToDelete, setBankToDelete] = useState<QuestionBank | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingBanks, setIsUploadingBanks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await fetch('/api/question-banks');
      const data = await res.json();
      setBanks(data);
    } catch (error) {
      console.error('Failed to fetch question banks:', error);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    const uploadData = async (banksData: any[]) => {
      try {
        const res = await fetch('/api/question-banks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ banks: banksData })
        });

        const data = await res.json();
        if (res.ok) {
          alert(`Successfully created ${data.createdBanks} banks with ${data.createdQuestions} questions.`);
          fetchBanks();
          setIsUploadingBanks(false);
        } else {
          alert(data.error || 'Failed to upload banks');
        }
      } catch (error) {
        console.error('Upload API error:', error);
        alert('Failed to upload banks.');
      }
    };

    if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const banksData = Array.isArray(json) ? json : [json];
          await uploadData(banksData);
        } catch (error) {
          console.error('Bulk upload error:', error);
          alert('Invalid JSON file or upload failed.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
    } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const banksData: any[] = [];

          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) return;

            const questions = jsonData.map((row: any) => {
              const qText = row['Question'] || row['question'];
              const opt1 = row['Option 1'] || row['option1'];
              const opt2 = row['Option 2'] || row['option2'];
              const opt3 = row['Option 3'] || row['option3'];
              const opt4 = row['Option 4'] || row['option4'];
              const correct = row['Correct Answer'] || row['correct_answer'];
              const image = row['Image URL'] || row['image_url'];
              const explanation = row['Explanation'] || row['explanation'];

              if (!qText || !opt1 || !opt2) return null;

              return {
                question_text: qText,
                options: [opt1, opt2, opt3, opt4].filter(o => o !== undefined && o !== null && o !== '').map(String),
                correct_option_index: (parseInt(correct) - 1) || 0,
                image_url: image || '',
                explanation: explanation || ''
              };
            }).filter(q => q !== null);

            if (questions.length > 0) {
              banksData.push({
                title: sheetName,
                questions
              });
            }
          });

          if (banksData.length === 0) {
            alert('No valid data found in Excel file.');
          } else {
            await uploadData(banksData);
          }
        } catch (error) {
          console.error('Excel upload error:', error);
          alert('Failed to process Excel file.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload .json, .xlsx, or .xls');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBankId 
        ? `/api/question-banks/${editingBankId}` 
        : '/api/question-banks';
      const method = editingBankId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBankTitle })
      });
      if (res.ok) {
        setIsCreating(false);
        setEditingBankId(null);
        setNewBankTitle('');
        fetchBanks();
      }
    } catch (error) {
      console.error('Failed to save question bank:', error);
    }
  };

  const handleDeleteBank = async () => {
    if (!bankToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/question-banks/${bankToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBanks();
        setBankToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete question bank:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      ['Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Image URL', 'Explanation'],
      ['What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', '3', '', 'Paris is the capital and most populous city of France.'],
      ['Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Jupiter', 'Saturn', '1', '', 'Mars is often called the Red Planet because of its reddish appearance.']
    ];

    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "question_bank_template.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-zinc-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          Question Banks
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-zinc-100 text-zinc-600 px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleBulkUpload}
            className="hidden"
            accept=".json, .xlsx, .xls"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button 
            onClick={() => {
              setIsCreating(true);
              setEditingBankId(null);
              setNewBankTitle('');
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Create Bank
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.map(bank => (
          <div 
            key={bank.id}
            className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-all group cursor-pointer"
            onClick={() => navigate(`/admin/banks/${bank.id}`)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-zinc-900 text-lg">{bank.title}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingBankId(bank.id);
                    setNewBankTitle(bank.title);
                    setIsCreating(true);
                  }}
                  className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit Bank"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setBankToDelete(bank);
                  }}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Bank"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Created: {new Date(bank.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
        {banks.length === 0 && (
          <div className="col-span-full p-8 text-center text-zinc-400 bg-white border border-zinc-200 rounded-xl border-dashed">
            No question banks yet. Create one to start managing reusable questions.
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">
                {editingBankId ? 'Edit Question Bank' : 'Create Question Bank'}
              </h2>
              <form onSubmit={handleCreateBank} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Bank Title</label>
                  <input 
                    type="text" 
                    required
                    value={newBankTitle}
                    onChange={e => setNewBankTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Speed, Time & Distance"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {editingBankId ? 'Save Changes' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {bankToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete Question Bank?</h2>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete "{bankToDelete.title}"? This will permanently delete all questions inside this bank. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setBankToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteBank}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Bank'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CodingBanksManagement = () => {
  const [banks, setBanks] = useState<CodingQuestionBank[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [newBankTitle, setNewBankTitle] = useState('');
  const [bankToDelete, setBankToDelete] = useState<CodingQuestionBank | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await fetch('/api/coding-banks');
      const data = await res.json();
      setBanks(data);
    } catch (error) {
      console.error('Failed to fetch coding banks:', error);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBankId 
        ? `/api/coding-banks/${editingBankId}` 
        : '/api/coding-banks';
      const method = editingBankId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBankTitle })
      });
      if (res.ok) {
        setIsCreating(false);
        setEditingBankId(null);
        setNewBankTitle('');
        fetchBanks();
      }
    } catch (error) {
      console.error('Failed to save coding bank:', error);
    }
  };

  const handleDeleteBank = async () => {
    if (!bankToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/coding-banks/${bankToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBanks();
        setBankToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete coding bank:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBanks = banks.filter(bank => 
    bank.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold text-zinc-800 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-indigo-600" />
          Coding Question Banks
        </h2>
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search coding banks..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => {
              setIsCreating(true);
              setEditingBankId(null);
              setNewBankTitle('');
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            Create Coding Bank
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBanks.map(bank => (
          <div 
            key={bank.id}
            className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-all group cursor-pointer"
            onClick={() => navigate(`/admin/coding-banks/${bank.id}`)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col">
                <h3 className="font-bold text-zinc-900 text-lg">{bank.title}</h3>
                <span className="text-[10px] w-fit px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 mt-1">Coding Bank</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingBankId(bank.id);
                    setNewBankTitle(bank.title);
                    setIsCreating(true);
                  }}
                  className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit Bank"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setBankToDelete(bank);
                  }}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Bank"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6">
              <span className="text-xs text-zinc-400 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100 uppercase tracking-wider font-bold">
                Coding Bank
              </span>
              <div className="flex items-center gap-1 text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                Manage Problems <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
        {filteredBanks.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
            <Database className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 text-lg font-medium">
              {searchQuery ? 'No matching coding banks found.' : 'No coding question banks available.'}
            </p>
            <p className="text-zinc-400 text-sm">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first bank to start organizing problems.'}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">
                {editingBankId ? 'Edit Coding Bank' : 'Create Coding Bank'}
              </h2>
              <form onSubmit={handleCreateBank} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Bank Title</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={newBankTitle}
                    onChange={e => setNewBankTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Java Data Structures Bank"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingBankId(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {editingBankId ? 'Save Changes' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {bankToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete Coding Bank?</h2>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete "{bankToDelete.title}"? This will permanently delete all coding problems inside this bank. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setBankToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteBank}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Bank'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'users' | 'banks' | 'coding-banks' | 'results'>('tests');
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [resultToDelete, setResultToDelete] = useState<Result | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTest, setNewTest] = useState({ 
    title: '', 
    description: '', 
    duration: 30, 
    target_batch: 'All', 
    negative_marks: false, 
    type: 'mcq' as 'mcq' | 'coding',
    allowed_languages: ['python', 'javascript', 'java', 'c', 'cpp'],
    start_time: '',
    end_time: ''
  });
  const [isDeletingResult, setIsDeletingResult] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Result | null>(null);
  const [selectedSubmissionProblems, setSelectedSubmissionProblems] = useState<CodingProblem[]>([]);
  const [selectedSubmissionQuestions, setSelectedSubmissionQuestions] = useState<Question[]>([]);
  const [resultsSearchQuery, setResultsSearchQuery] = useState('');
  const [isResultsRefreshing, setIsResultsRefreshing] = useState(false);

  const parsedResponses = useMemo(() => {
    if (!selectedSubmission || !selectedSubmission.responses) return {};
    try {
      const resp = selectedSubmission.responses;
      if (typeof resp === 'string') {
        const firstPass = JSON.parse(resp);
        // Handle double stringification
        if (typeof firstPass === 'string') return JSON.parse(firstPass);
        return firstPass;
      }
      return resp;
    } catch (e) {
      console.error("Error parsing responses:", e);
      return {};
    }
  }, [selectedSubmission]);

  useEffect(() => {
    if (selectedSubmission) {
      const isCoding = selectedSubmission.test_type === 'coding' || (Array.isArray(selectedSubmission.coding_details) && selectedSubmission.coding_details.length > 0);
      if (isCoding) {
        // Fetch problems for coding test
        fetch(`/api/tests/${selectedSubmission.test_id}/problems`)
          .then(res => res.json())
          .then(data => setSelectedSubmissionProblems(Array.isArray(data) ? data : []))
          .catch(err => {
            console.error("Error fetching problems for submission detail:", err);
            setSelectedSubmissionProblems([]);
          });
        setSelectedSubmissionQuestions([]);
      } else {
        // Fetch questions for MCQ test
        fetch(`/api/tests/${selectedSubmission.test_id}/questions`)
          .then(res => res.json())
          .then(data => setSelectedSubmissionQuestions(Array.isArray(data) ? data : []))
          .catch(err => {
            console.error("Error fetching questions for submission detail:", err);
            setSelectedSubmissionQuestions([]);
          });
        setSelectedSubmissionProblems([]);
      }
    } else {
      setSelectedSubmissionProblems([]);
      setSelectedSubmissionQuestions([]);
    }
  }, [selectedSubmission]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTests();
    fetchResults();
    fetchBatches();
  }, []);

  useEffect(() => {
    const syncResults = window.setInterval(fetchResults, 30_000);
    return () => window.clearInterval(syncResults);
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  };

  const fetchResults = async (showRefreshing = false) => {
    if (showRefreshing) setIsResultsRefreshing(true);
    try {
      const res = await fetch('/api/results');
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedSubmission(current => {
          if (!current) return current;
          return data.find((result: Result) => result.id === current.id) || current;
        });
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      if (showRefreshing) setIsResultsRefreshing(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTest.title,
        description: newTest.description,
        duration_minutes: newTest.duration,
        target_batch: newTest.target_batch,
        negative_marks: newTest.negative_marks,
        type: newTest.type,
        allowed_languages: newTest.allowed_languages,
        start_time: newTest.start_time,
        end_time: newTest.end_time
      })
    });
    const data = await res.json();
    setIsCreating(false);
    setNewTest({ 
      title: '', 
      description: '', 
      duration: 30, 
      target_batch: 'All', 
      negative_marks: false, 
      type: 'mcq',
      allowed_languages: ['python', 'javascript', 'java', 'c', 'cpp'],
      start_time: '',
      end_time: ''
    });
    fetchTests();
    navigate(`/admin/test/${data.id}`);
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/tests/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus })
      });
      if (res.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error('Publish error:', error);
    }
  };

  const handleDeleteTest = async () => {
    if (!testToDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tests/${testToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTests();
        setTestToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete test');
      }
    } catch (error) {
      console.error('Delete test error:', error);
      alert('Error deleting test. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredResults = results.filter(result => 
    result.student_name?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
    result.student_id?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
    result.student_department?.toLowerCase().includes(resultsSearchQuery.toLowerCase()) ||
    result.test_title?.toLowerCase().includes(resultsSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Admin Dashboard</h1>
          <p className="text-zinc-500">Manage your college MCQ tests and view student performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Create New Test
          </button>
          <div className="h-8 w-px bg-zinc-200 mx-1 hidden md:block" />
          <div className="flex p-1 bg-zinc-100 rounded-xl">
            <button 
              onClick={() => setActiveTab('tests')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'tests' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Tests
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'users' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Students
            </button>
            <button 
              onClick={() => setActiveTab('banks')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'banks' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Aptitude Bank
            </button>
            <button 
              onClick={() => setActiveTab('coding-banks')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'coding-banks' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Coding Bank
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'results' ? "bg-white text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              All Results
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'users' ? (
        <UsersManagement onUpdate={fetchBatches} />
      ) : activeTab === 'banks' ? (
        <QuestionBanksManagement />
      ) : activeTab === 'coding-banks' ? (
        <CodingBanksManagement />
      ) : activeTab === 'results' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Comprehensive Results Management
            </h2>
            <button 
              onClick={() => fetchResults(true)}
              disabled={isResultsRefreshing}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
            >
              <RefreshCw className={cn("w-4 h-4", isResultsRefreshing && "animate-spin")} />
              {isResultsRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search by student name, ID or test title..."
              value={resultsSearchQuery}
              onChange={(e) => setResultsSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Test Title</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredResults.map(result => (
                  <tr key={result.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">{result.student_name}</td>
                    <td className="px-6 py-4 font-mono text-zinc-500">{result.student_id}</td>
                    <td className="px-6 py-4 text-zinc-600">{result.student_department || 'N/A'}</td>
                    <td className="px-6 py-4 text-zinc-600">{result.test_title}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold px-2 py-1 rounded-lg text-xs",
                        (result.score / result.total_questions) >= 0.5 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      )}>
                        {result.score} / {result.total_questions}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => setSelectedSubmission(result)}
                          className="text-indigo-600 hover:text-indigo-700 font-bold text-xs flex items-center gap-1.5 justify-end"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </button>
                        <button 
                          onClick={() => setResultToDelete(result)}
                          disabled={isDeletingResult === result.id}
                          className="text-red-600 hover:text-red-700 font-semibold text-xs flex items-center gap-1 justify-end disabled:opacity-50"
                        >
                          <RefreshCw className={cn("w-3 h-3", isDeletingResult === result.id && "animate-spin")} />
                          Allow Redo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-medium italic">
                      {resultsSearchQuery ? 'No results match your search.' : 'No test results found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-zinc-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Active Tests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.map(test => (
                <div 
                  key={test.id}
                  className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-zinc-900 text-lg">{test.title}</h3>
                        <div className="flex gap-1.5">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                            test.is_published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {test.is_published ? 'Published' : 'Draft'}
                          </span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
                            test.type === 'coding' ? "bg-indigo-100 text-indigo-700" : "bg-violet-100 text-violet-700"
                          )}>
                            {test.type === 'coding' ? 'Coding' : 'Aptitude'}
                          </span>
                          {test.negative_marks === 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-100 text-red-700">
                              Negative
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Target: {test.target_batch}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={() => handleTogglePublish(test.id, !!test.is_published)}
                        className={cn(
                          "text-xs font-bold px-3 py-1 rounded-lg transition-all",
                          test.is_published 
                            ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" 
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                        )}
                      >
                        {test.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTestToDelete(test);
                        }}
                        className="relative z-10 p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-zinc-500 text-sm line-clamp-2 mb-4">{test.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{test.duration_minutes} mins</span>
                    </div>
                    <Link 
                      to={`/admin/test/${test.id}`}
                      className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Manage Questions <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
              {tests.length === 0 && (
                <div className="col-span-full py-12 text-center bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl">
                  <p className="text-zinc-400">No tests created yet. Start by creating one!</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Recent Results
            </h2>
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-zinc-100">
                {results.slice(0, 5).map(result => (
                  <div key={result.id} className="p-4 hover:bg-zinc-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-zinc-900">{result.student_name}</span>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        (result.score / result.total_questions) >= 0.5 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {result.score}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex justify-between">
                      <span>{result.test_title}</span>
                      <span>{new Date(result.completed_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="p-8 text-center text-zinc-400 text-sm">
                    No results yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              key="create-test-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">Create New Test</h2>
              <form onSubmit={handleCreateTest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Test Title</label>
                  <input 
                    type="text" 
                    required
                    value={newTest.title}
                    onChange={e => setNewTest({...newTest, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Data Structures Mid-term"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <textarea 
                    required
                    value={newTest.description}
                    onChange={e => setNewTest({...newTest, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Briefly describe what this test covers..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Duration (mins)</label>
                    <input 
                      type="number" 
                      required
                      value={newTest.duration}
                      onChange={e => setNewTest({...newTest, duration: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Test Type</label>
                    <select 
                      required
                      value={newTest.type}
                      onChange={e => setNewTest({...newTest, type: e.target.value as 'mcq' | 'coding'})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="mcq">MCQ Test</option>
                      <option value="coding">Coding Test</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Start Time (Optional)</label>
                    <input 
                      type="datetime-local" 
                      value={newTest.start_time}
                      onChange={e => setNewTest({...newTest, start_time: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">End Time (Deadline)</label>
                    <input 
                      type="datetime-local" 
                      value={newTest.end_time}
                      onChange={e => setNewTest({...newTest, end_time: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Target Batch</label>
                  <select 
                    required
                    value={newTest.target_batch}
                    onChange={e => setNewTest({...newTest, target_batch: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="All">All Batches</option>
                    {Array.isArray(batches) && batches.map(batch => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTest.negative_marks}
                      onChange={e => setNewTest({...newTest, negative_marks: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
                    />
                    Enable Negative Marking (-1 per wrong answer)
                  </label>
                </div>

                {newTest.type === 'coding' && (
                  <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                    <label className="block text-sm font-bold text-zinc-700 mb-2">Allowed Languages</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['python', 'javascript', 'java', 'c', 'cpp'].map(lang => (
                        <label key={lang} className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer hover:text-indigo-600 transition-colors capitalize">
                          <input
                            type="checkbox"
                            checked={newTest.allowed_languages.includes(lang)}
                            onChange={e => {
                              const updated = e.target.checked 
                                ? [...newTest.allowed_languages, lang]
                                : newTest.allowed_languages.filter(l => l !== lang);
                              setNewTest({...newTest, allowed_languages: updated});
                            }}
                            className="w-4 h-4 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
                          />
                          {lang === 'cpp' ? 'C++' : lang}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Create Test
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {selectedSubmission && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-white/20"
              >
                <div className="px-10 py-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                      <UserIcon className="text-white w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-zinc-900 tracking-tight leading-none mb-2">{selectedSubmission.student_name}</h2>
                      <div className="flex items-center gap-3 text-zinc-500 font-bold text-[13px]">
                         <span className="font-mono bg-zinc-200/50 px-2 py-0.5 rounded text-zinc-600 uppercase tracking-wider">{selectedSubmission.student_id}</span>
                         <span className="text-zinc-300">•</span>
                         <span className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" />
                            {selectedSubmission.test_title}
                         </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSubmission(null)}
                    className="p-3 hover:bg-zinc-200/60 rounded-2xl transition-all text-zinc-400 hover:text-zinc-600 border border-transparent hover:border-zinc-200"
                  >
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-indigo-50/30 border border-indigo-100 rounded-[2rem] p-8 flex flex-col items-center text-center group hover:bg-indigo-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black text-indigo-400 mb-2">Total Score</span>
                      <span className="text-5xl font-black text-indigo-600 tracking-tighter leading-none">{selectedSubmission.score} <span className="text-indigo-300 text-3xl">/</span> {selectedSubmission.total_questions}</span>
                    </div>
                    <div className="bg-zinc-50/30 border border-zinc-100 rounded-[2rem] p-8 flex flex-col items-center text-center group hover:bg-zinc-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 mb-4 group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400 mb-2">Submission Date</span>
                      <span className="text-xl font-black text-zinc-800 tracking-tight leading-none">{new Date(selectedSubmission.completed_at).toLocaleDateString()}</span>
                      <span className="text-[11px] font-bold text-zinc-400 mt-2">{new Date(selectedSubmission.completed_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="bg-zinc-50/30 border border-zinc-100 rounded-[2rem] p-8 flex flex-col items-center text-center group hover:bg-zinc-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 mb-4 group-hover:scale-110 transition-transform">
                        <LayoutDashboard className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-400 mb-2">System ID</span>
                      <span className="text-sm font-mono font-bold text-zinc-400 break-all leading-tight">{selectedSubmission.id}</span>
                    </div>
                  </div>

                  {(selectedSubmission.test_type === 'coding' || (selectedSubmission.coding_details && selectedSubmission.coding_details.length > 0)) ? (
                    <div className="space-y-16">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-zinc-100" />
                        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                          <Code2 className="w-4 h-4" />
                          Evaluation Report
                        </h3>
                        <div className="h-px flex-1 bg-zinc-100" />
                      </div>

                      {(selectedSubmission.coding_details || []).map((detail, idx) => (
                        <div key={idx} className="bg-white border-2 border-zinc-50 rounded-[2.5rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-12">
                          <div className="px-10 py-6 bg-zinc-50/50 border-b border-zinc-100 flex flex-wrap justify-between items-center gap-6">
                             <div className="flex items-center gap-5">
                                <div className="w-10 h-10 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center text-sm font-black text-zinc-400 shadow-sm">
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <span className="font-black text-zinc-900 tracking-tight">
                                      {selectedSubmissionProblems.find(p => p.id === detail.problem_id)?.title || detail.problem_title || `Problem ID: ${detail.problem_id}`}
                                    </span>
                                    <span className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-500 shadow-sm">
                                      {detail.language}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Solution Submission</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-8">
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1.5 leading-none">Result</span>
                                  <div className={cn(
                                    "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm",
                                    getCodingEvaluationStatus(detail) === 'Accepted'
                                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                      : getCodingEvaluationStatus(detail) === 'Partially Accepted'
                                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                        : "bg-red-500/10 text-red-600 border border-red-500/20"
                                  )}>
                                    {getCodingEvaluationStatus(detail)}
                                  </div>
                                </div>
                                <div className="h-12 w-px bg-zinc-200/50" />
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1.5 leading-none">Test Cases</span>
                                  <div className="flex items-baseline gap-1 text-zinc-800">
                                    <span className="text-2xl font-black font-mono tracking-tighter">{detail.test_cases_passed}</span>
                                    <span className="text-sm font-black text-zinc-300">/</span>
                                    <span className="text-sm font-black text-zinc-400">{detail.total_test_cases}</span>
                                  </div>
                                </div>
                             </div>
                          </div>
                          <div className="p-0 bg-[#0d0d0d] relative group">
                            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-md text-[10px] font-black text-white/50 uppercase tracking-widest">
                                Read Only Mode
                              </div>
                            </div>
                            <MonacoEditor
                              height="400px"
                              language={detail.language === 'cpp' ? 'cpp' : detail.language === 'python' ? 'python' : detail.language === 'javascript' ? 'javascript' : detail.language === 'java' ? 'java' : 'c'}
                              value={detail.solution_code}
                              theme="vs-dark"
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', monospace",
                                padding: { top: 24, bottom: 24 },
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                cursorStyle: 'underline',
                                roundedSelection: true,
                                smoothScrolling: true,
                              }}
                            />
                          </div>
                          <div className="p-8 bg-zinc-50 border-t border-zinc-100">
                             <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-indigo-600" />
                                Test Case Results
                             </h4>
                             <CodingTestCaseResults 
                                testCaseResults={detail.test_case_results}
                                problems={selectedSubmissionProblems}
                                problemId={detail.problem_id}
                                isTimeOver={true}
                                isAdmin={true}
                             />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-12">
                       <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-zinc-100" />
                        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                          <BrainCircuit className="w-4 h-4" />
                          Theoretical Analysis
                        </h3>
                        <div className="h-px flex-1 bg-zinc-100" />
                      </div>
                      
                      {selectedSubmissionQuestions.length > 0 ? (
                        <div className="grid gap-6">
                          {selectedSubmissionQuestions.map((q, idx) => {
                            const studentAnswer = parsedResponses[q.id];
                            const isCorrect = studentAnswer === q.correct_option_index;
                            
                            return (
                              <div key={q.id} className="bg-white border-2 border-zinc-50 rounded-[2rem] p-8 shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                  <div className="flex items-center gap-4">
                                    <span className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-xs font-black text-zinc-400">
                                      {idx + 1}
                                    </span>
                                    <h4 className="text-lg font-bold text-zinc-900 leading-tight">{q.question_text}</h4>
                                  </div>
                                  <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                    studentAnswer === undefined ? "bg-zinc-100 text-zinc-400" :
                                    isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                  )}>
                                    {studentAnswer === undefined ? 'Unanswered' : isCorrect ? 'Correct' : 'Incorrect'}
                                  </div>
                                </div>

                                {q.image_url && (
                                  <div className="mb-6 rounded-xl overflow-hidden border border-zinc-100">
                                    <img src={q.image_url} alt="Question Context" className="max-h-64 object-contain mx-auto" />
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                  {q.options.map((opt, optIdx) => (
                                    <div 
                                      key={optIdx}
                                      className={cn(
                                        "p-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-between",
                                        optIdx === q.correct_option_index ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                                        optIdx === studentAnswer ? "bg-red-50 border-red-200 text-red-900" :
                                        "bg-white border-zinc-100 text-zinc-600"
                                      )}
                                    >
                                      <span>{opt.option_text}</span>
                                      {optIdx === q.correct_option_index && (
                                        <Check className="w-4 h-4 text-emerald-600" />
                                      )}
                                      {optIdx === studentAnswer && optIdx !== q.correct_option_index && (
                                        <X className="w-4 h-4 text-red-600" />
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {q.explanation && (
                                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-2">
                                      <Info className="w-3.5 h-3.5" />
                                      Explanation
                                    </div>
                                    <p className="text-zinc-600 text-sm leading-relaxed">{q.explanation}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-zinc-50 border-2 border-dashed border-zinc-100 rounded-[3rem] p-20 text-center group hover:bg-zinc-50/80 transition-colors">
                          <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-zinc-300 mb-6 mx-auto shadow-sm group-hover:scale-110 transition-transform">
                            <EyeOff className="w-10 h-10" />
                          </div>
                          <h4 className="text-2xl font-black text-zinc-900 tracking-tight mb-3">Loading MCQ Details...</h4>
                          <p className="text-zinc-500 font-bold text-sm max-w-sm mx-auto leading-relaxed">
                            Please wait while we retrieve the question breakdown.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="px-10 py-8 bg-zinc-50/50 border-t border-zinc-100 flex justify-end items-center">
                  <button 
                    onClick={() => setSelectedSubmission(null)}
                    className="px-10 py-4 bg-zinc-900 text-white rounded-[1.25rem] font-black text-sm hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-200 hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest"
                  >
                    Close Report
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {resultToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Allow Redo</h2>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                Are you sure you want to allow <strong>{resultToDelete.student_name}</strong> to redo <strong>{resultToDelete.test_title}</strong>? This will permanently delete their current result.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setResultToDelete(null)}
                  disabled={isDeletingResult === resultToDelete.id}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setIsDeletingResult(resultToDelete.id);
                    try {
                      const res = await fetch(`/api/results/${resultToDelete.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        fetchResults();
                        setResultToDelete(null);
                      }
                    } catch (error) {
                      console.error('Failed to delete result:', error);
                    } finally {
                      setIsDeletingResult(null);
                    }
                  }}
                  disabled={isDeletingResult === resultToDelete.id}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center disabled:opacity-50"
                >
                  {isDeletingResult === resultToDelete.id ? 'Processing...' : 'Confirm Redo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {testToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Delete Test?</h3>
                  <p className="text-zinc-500 text-sm">This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-100">
                <p className="text-sm text-zinc-600">
                  Are you sure you want to delete the test: <span className="font-bold text-zinc-900">{testToDelete.title}</span>? 
                  All questions and results for this test will be permanently removed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTestToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTest}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all shadow-md shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Test'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
};

const CodingTestManagement = ({ testId }: { testId: string }) => {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingFromBank, setIsLoadingFromBank] = useState(false);
  const [allCodingBanks, setAllCodingBanks] = useState<CodingQuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [bankProblems, setBankProblems] = useState<BankCodingProblem[]>([]);
  const [allBankProblems, setAllBankProblems] = useState<BankCodingProblem[]>([]); // Added for global search
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [testSearchQuery, setTestSearchQuery] = useState(''); // Added to search current test problems
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // Added for test settings
  const [test, setTest] = useState<Test | null>(null); // To store test details for settings
  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    constraints: '',
    input_format: '',
    output_format: '',
    sample_input: '',
    sample_output: '',
    test_cases: [] as TestCase[]
  });
  const [problemToDelete, setProblemToDelete] = useState<CodingProblem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProblems();
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        const currentTest = data.find((t: Test) => t.id === testId);
        setTest(currentTest || null);
      }
    } catch (error) {
      console.error('Failed to fetch test details:', error);
    }
  };

  const fetchProblems = async () => {
    const res = await fetch(`/api/tests/${testId}/problems`);
    const data = await res.json();
    setProblems(data);
  };

  const fetchCodingBanks = async () => {
    try {
      const [banksRes, problemsRes] = await Promise.all([
        fetch('/api/coding-banks'),
        fetch('/api/coding-banks/all-problems')
      ]);
      const banks = await banksRes.json();
      const problems = await problemsRes.json();
      setAllCodingBanks(banks);
      setAllBankProblems(problems);
      setBankProblems(problems); // Default to all problems
      setSelectedBankId(null); // 'All' selected by default
      setIsLoadingFromBank(true);
    } catch (error) {
      console.error('Failed to fetch coding bank data:', error);
    }
  };

  const fetchBankProblems = async (bankId: string | null) => {
    setSelectedBankId(bankId);
    if (bankId === null) {
      setBankProblems(allBankProblems);
    } else {
      setBankProblems(allBankProblems.filter(p => p.bank_id === bankId));
    }
  };

  const handleLoadProblem = async (p: BankCodingProblem) => {
    try {
      const res = await fetch(`/api/tests/${testId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title,
          description: p.description,
          constraints: p.constraints,
          input_format: p.input_format,
          output_format: p.output_format,
          sample_input: p.sample_input,
          sample_output: p.sample_output,
          test_cases: p.test_cases,
          bank_problem_id: p.id
        })
      });
      if (res.ok) {
        fetchProblems();
        setIsLoadingFromBank(false);
      }
    } catch (error) {
      console.error('Failed to load problem from bank:', error);
    }
  };

  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProblemId ? `/api/problems/${editingProblemId}` : `/api/tests/${testId}/problems`;
    const res = await fetch(url, {
      method: editingProblemId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProblem)
    });
    if (res.ok) {
      setIsAdding(false);
      setEditingProblemId(null);
      setNewProblem({
        title: '', description: '', constraints: '', input_format: '', output_format: '',
        sample_input: '', sample_output: '', test_cases: []
      });
      fetchProblems();
    }
  };

  const addTestCase = () => {
    setNewProblem({
      ...newProblem,
      test_cases: [...newProblem.test_cases, { id: Math.random().toString(36).substr(2, 9), input: '', expected_output: '', is_hidden: false }]
    });
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: any) => {
    setNewProblem({
      ...newProblem,
      test_cases: newProblem.test_cases.map(tc => tc.id === id ? { ...tc, [field]: value } : tc)
    });
  };

  const removeTestCase = (id: string) => {
    setNewProblem({
      ...newProblem,
      test_cases: newProblem.test_cases.filter(tc => tc.id !== id)
    });
  };

  const handleEditProblem = (p: CodingProblem) => {
    setNewProblem({
      title: p.title,
      description: p.description,
      constraints: p.constraints,
      input_format: p.input_format,
      output_format: p.output_format,
      sample_input: p.sample_input,
      sample_output: p.sample_output,
      test_cases: p.test_cases || []
    });
    setEditingProblemId(p.id);
    setIsAdding(true);
  };

  const handleDeleteProblem = async () => {
    if (!problemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/problems/${problemToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProblems();
        setProblemToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete problem");
      }
    } catch (error) {
      console.error("Delete problem error:", error);
      alert("Error deleting problem");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(testSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-zinc-900">Coding Problems</h2>
          <p className="text-xs text-zinc-500 mt-1">Manage coding problems for this test. Edits to bank-linked problems will sync back to the bank.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search test problems..."
              value={testSearchQuery}
              onChange={e => setTestSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600 transition-all flex items-center gap-2 font-medium shadow-sm"
          >
            <Settings className="w-5 h-5" /> Settings
          </button>
          <button 
            onClick={fetchCodingBanks}
            className="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Database className="w-5 h-5" /> Load from Bank
          </button>
          <button 
            onClick={() => {
              setNewProblem({ title: '', description: '', constraints: '', input_format: '', output_format: '', sample_input: '', sample_output: '', test_cases: [] });
              setEditingProblemId(null);
              setIsAdding(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" /> Add Problem
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredProblems.map(p => (
          <div key={p.id} className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{p.title}</h3>
                <p className="text-zinc-500 text-sm line-clamp-1">{p.description}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditProblem(p)} className="p-2 text-zinc-400 hover:text-indigo-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setProblemToDelete(p)} className="p-2 text-zinc-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex gap-4 text-xs font-bold text-zinc-400">
              <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {p.test_cases?.length || 0} Test Cases</span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {problemToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete Problem?</h2>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete "{problemToDelete.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProblemToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteProblem}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Problem'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isSettingsModalOpen && test && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">Test Settings</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={test.title} 
                    onChange={e => setTest({...test, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <textarea 
                    value={test.description} 
                    onChange={e => setTest({...test, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Duration (mins)</label>
                    <input 
                      type="number" 
                      value={test.duration_minutes} 
                      onChange={e => setTest({...test, duration_minutes: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Negative Marked</label>
                    <select 
                      value={test.negative_marks} 
                      onChange={e => setTest({...test, negative_marks: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Start Time</label>
                    <input 
                      type="datetime-local" 
                      value={test.start_time ? new Date(test.start_time).toISOString().slice(0, 16) : ''} 
                      onChange={e => setTest({...test, start_time: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">End Time</label>
                    <input 
                      type="datetime-local" 
                      value={test.end_time ? new Date(test.end_time).toISOString().slice(0, 16) : ''} 
                      onChange={e => setTest({...test, end_time: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Allowed Coding Languages</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['python', 'javascript', 'java', 'c', 'cpp'].map(lang => (
                      <label key={lang} className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer hover:text-indigo-600 transition-colors capitalize">
                        <input
                          type="checkbox"
                          checked={test.allowed_languages?.includes(lang) ?? true}
                          onChange={e => {
                            const current = test.allowed_languages || ['python', 'javascript', 'java', 'c', 'cpp'];
                            const updated = e.target.checked 
                              ? [...current, lang]
                              : current.filter(l => l !== lang);
                            setTest({...test, allowed_languages: updated});
                          }}
                          className="w-4 h-4 text-indigo-600 border-zinc-300 rounded focus:ring-indigo-500"
                        />
                        {lang === 'cpp' ? 'C++' : lang}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/tests/${testId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(test)
                        });
                        if (res.ok) {
                          setIsSettingsModalOpen(false);
                          fetchTestDetails();
                        }
                      } catch (e) {
                        console.error('Failed to update test settings:', e);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl font-sans"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-zinc-900">{editingProblemId ? 'Edit Problem' : 'Add New Problem'}</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-100 rounded-full"><XCircle className="w-6 h-6 text-zinc-400" /></button>
              </div>
              
              <form onSubmit={handleSaveProblem} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Problem Title</label>
                      <input 
                        type="text" required value={newProblem.title}
                        onChange={e => setNewProblem({...newProblem, title: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Factorial of a Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Problem Description</label>
                      <textarea 
                        required value={newProblem.description}
                        onChange={e => setNewProblem({...newProblem, description: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-32 resize-none transition-all"
                        placeholder="Describe the problem details..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Input Format</label>
                        <textarea 
                          value={newProblem.input_format}
                          onChange={e => setNewProblem({...newProblem, input_format: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Output Format</label>
                        <textarea 
                          value={newProblem.output_format}
                          onChange={e => setNewProblem({...newProblem, output_format: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Constraints</label>
                      <textarea 
                        value={newProblem.constraints}
                        onChange={e => setNewProblem({...newProblem, constraints: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Sample Input</label>
                        <textarea 
                          value={newProblem.sample_input}
                          onChange={e => setNewProblem({...newProblem, sample_input: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 font-mono text-sm border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Sample Output</label>
                        <textarea 
                          value={newProblem.sample_output}
                          onChange={e => setNewProblem({...newProblem, sample_output: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 font-mono text-sm border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                      <Cpu className="text-indigo-500" /> Test Cases
                    </h3>
                    <button type="button" onClick={addTestCase} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
                      <PlusCircle className="w-4 h-4" /> Add Test Case
                    </button>
                  </div>
                  <div className="space-y-4">
                    {newProblem.test_cases.map((tc, idx) => (
                      <div key={tc.id} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 space-y-4 relative group">
                        <button type="button" onClick={() => removeTestCase(tc.id)} className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-100 shadow-sm">{idx + 1}</span>
                          <span className="text-sm font-bold text-zinc-700">Test Case</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Input</label>
                            <textarea 
                              required value={tc.input} onChange={e => updateTestCase(tc.id, 'input', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border-zinc-100 border-2 font-mono text-xs focus:border-indigo-300 outline-none bg-white transition-all min-h-[100px]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Expected Output</label>
                            <textarea 
                              required value={tc.expected_output} onChange={e => updateTestCase(tc.id, 'expected_output', e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border-zinc-100 border-2 font-mono text-xs focus:border-indigo-300 outline-none bg-white transition-all min-h-[100px]"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-bold text-zinc-500 cursor-pointer">
                          <input type="checkbox" checked={tc.is_hidden} onChange={e => updateTestCase(tc.id, 'is_hidden', e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                          Mark as Hidden (Only visible to admin)
                        </label>
                      </div>
                    ))}
                    {newProblem.test_cases.length === 0 && (
                      <div className="text-center py-12 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
                        <p className="text-zinc-400 text-sm">No test cases added yet. These are required for evaluation.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-zinc-100 bg-white sticky bottom-0">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Save Problem</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isLoadingFromBank && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                  <Database className="w-6 h-6 text-indigo-600" />
                  Load from Coding Bank
                </h2>
                <button 
                  onClick={() => {
                    setIsLoadingFromBank(false);
                    setSelectedBankId(null);
                    setBankProblems([]);
                    setBankSearchQuery('');
                  }} 
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              <div className="p-4 border-b border-zinc-100 bg-zinc-50/30">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    value={bankSearchQuery}
                    onChange={e => setBankSearchQuery(e.target.value)}
                    placeholder="Search problems by title or description..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-64 border-r border-zinc-100 overflow-y-auto bg-zinc-50/50 p-4 space-y-2">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Select Bank</h3>
                  <button
                    onClick={() => fetchBankProblems(null)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl text-sm font-medium transition-all border",
                      selectedBankId === null 
                        ? "bg-white border-indigo-200 text-indigo-600 shadow-sm ring-2 ring-indigo-500/5" 
                        : "border-transparent text-zinc-600 hover:bg-white hover:border-zinc-200"
                    )}
                  >
                    All Banks
                  </button>
                  {allCodingBanks.map(bank => (
                    <button
                      key={bank.id}
                      onClick={() => fetchBankProblems(bank.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl text-sm font-medium transition-all border",
                        selectedBankId === bank.id 
                          ? "bg-white border-indigo-200 text-indigo-600 shadow-sm ring-2 ring-indigo-500/5" 
                          : "border-transparent text-zinc-600 hover:bg-white hover:border-zinc-200"
                      )}
                    >
                      {bank.title}
                    </button>
                  ))}
                  {allCodingBanks.length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-4">No banks found.</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {bankProblems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                      <div className="w-16 h-16 bg-zinc-50 rounded-full mb-4 flex items-center justify-center">
                        <Code2 className="w-8 h-8 opacity-20" />
                      </div>
                      <p>{selectedBankId ? 'No problems in this bank.' : 'No problems found in any bank.'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {bankProblems
                        .filter(p => 
                          p.title.toLowerCase().includes(bankSearchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(bankSearchQuery.toLowerCase())
                        )
                        .sort((a, b) => a.title.localeCompare(b.title))
                        .map((p, pIdx) => {
                          const bankName = allCodingBanks.find(b => b.id === p.bank_id)?.title || 'Unknown Bank';
                          return (
                            <div key={p.id} className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                    {pIdx + 1}
                                  </span>
                                  <div className="flex flex-col">
                                    <h4 className="font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{p.title}</h4>
                                    {!selectedBankId && (
                                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{bankName}</span>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleLoadProblem(p)}
                                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0"
                                >
                                  Add to Test
                                </button>
                              </div>
                              <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed ml-9">{p.description}</p>
                              <div className="mt-3 flex items-center gap-3 ml-9">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase bg-zinc-100 px-1.5 py-0.5 rounded">
                                  {p.test_cases?.length || 0} Test Cases
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      {bankProblems.filter(p => 
                          p.title.toLowerCase().includes(bankSearchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(bankSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="text-center py-20 text-zinc-400">
                            No problems match your search criteria.
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TestManagement = () => {
  const { id } = useParams();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [generateCount, setGenerateCount] = useState<number>(10);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'leaderboard'>('questions');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('');
  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    image_url: '',
    explanation: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTest();
    fetchQuestions();
    fetchBanks();
    fetchTestResults();
  }, [id]);

  useEffect(() => {
    const syncTestResults = window.setInterval(fetchTestResults, 60_000);
    return () => window.clearInterval(syncTestResults);
  }, [id]);

  const fetchTest = async () => {
    try {
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        const currentTest = data.find((t: Test) => t.id === id);
        setTest(currentTest || null);
      }
    } catch (error) {
      console.error('Failed to fetch test:', error);
    }
  };

  const fetchQuestions = async () => {
    const res = await fetch(`/api/tests/${id}/questions`);
    const data = await res.json();
    setQuestions(data);
  };

  const fetchBanks = async () => {
    const res = await fetch('/api/question-banks');
    const data = await res.json();
    setBanks(data);
  };

  const fetchTestResults = async () => {
    try {
      const res = await fetch(`/api/tests/${id}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Failed to fetch test results:', error);
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLeaderboardResults.map((r, i) => ({
      Rank: i + 1,
      'Student Name': r.student_name,
      'Student ID': r.student_id,
      Department: r.student_department || 'N/A',
      Score: r.score,
      'Total Questions': r.total_questions,
      'Percentage': `${Math.round((r.score / r.total_questions) * 100)}%`
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
    XLSX.writeFile(wb, `leaderboard_test_${id}.xlsx`);
  };

  const filteredLeaderboardResults = results.filter(result => {
    const query = leaderboardSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      result.student_name?.toLowerCase().includes(query) ||
      result.student_id?.toLowerCase().includes(query) ||
      result.student_department?.toLowerCase().includes(query)
    );
  });

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBanks.length === 0) {
      alert("Please select at least one question bank.");
      return;
    }
    
    try {
      const res = await fetch(`/api/tests/${id}/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_ids: selectedBanks,
          total_questions: generateCount
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsGenerating(false);
        setSelectedBanks([]);
        setGenerateCount(10);
        fetchQuestions();
        alert(`Successfully added ${data.addedCount} questions.`);
      } else {
        alert(data.error || "Failed to generate questions");
      }
    } catch (error) {
      console.error("Generate error:", error);
      alert("Error generating questions.");
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingQuestionId 
        ? `/api/questions/${editingQuestionId}`
        : `/api/tests/${id}/questions`;
        
      const method = editingQuestionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: newQ.text,
          correct_option_index: newQ.correct,
          options: newQ.options,
          image_url: newQ.image_url,
          explanation: newQ.explanation
        })
      });
      
      if (res.ok) {
        setIsAdding(false);
        setNewQ({ text: '', options: ['', '', '', ''], correct: 0, image_url: '', explanation: '' });
        setEditingQuestionId(null);
        fetchQuestions();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save question");
      }
    } catch (error) {
      console.error("Save question error:", error);
      alert("Error saving question. The image might be too large.");
    }
  };

  const handleEditQuestion = (q: Question) => {
    setNewQ({
      text: q.question_text,
      options: q.options.map(o => o.option_text),
      correct: q.correct_option_index,
      image_url: q.image_url || '',
      explanation: q.explanation || ''
    });
    setEditingQuestionId(q.id);
    setIsAdding(true);
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/questions/${questionToDelete.id}`, { method: 'DELETE' });
      fetchQuestions();
      setQuestionToDelete(null);
    } catch (error) {
      console.error('Failed to delete question:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTestSettings = async () => {
    if (!test) return;
    try {
      const res = await fetch(`/api/tests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test)
      });
      if (res.ok) {
        setIsSettingsModalOpen(false);
        fetchTest();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save test settings");
      }
    } catch (error) {
      console.error('Failed to update test settings:', error);
      alert("Error saving test settings.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Test Management</h1>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setActiveTab('questions')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all text-sm",
                activeTab === 'questions' ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200"
              )}
            >
              Questions
            </button>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all text-sm",
                activeTab === 'leaderboard' ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200"
              )}
            >
              Leaderboard
            </button>
          </div>
        </div>
        
        {test?.type === 'mcq' && activeTab === 'questions' && (
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 bg-white text-zinc-700 border border-zinc-200 px-4 py-2 rounded-lg font-medium hover:bg-zinc-50 transition-all shadow-sm"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <button 
              onClick={() => setIsGenerating(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-sm"
            >
              <Database className="w-5 h-5" />
              Generate from Banks
            </button>
            <button 
              onClick={() => {
                setIsAdding(true);
                setEditingQuestionId(null);
                setNewQ({ text: '', options: ['', '', '', ''], correct: 0, image_url: '', explanation: '' });
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm"
            >
              <PlusCircle className="w-5 h-5" />
              Add Question
            </button>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text"
                placeholder="Search leaderboard..."
                value={leaderboardSearchQuery}
                onChange={(e) => setLeaderboardSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export to Excel
            </button>
          </div>
        )}
      </div>

      {activeTab === 'questions' ? (
        test?.type === 'coding' ? (
          <CodingTestManagement testId={id!} />
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
            <div key={q.id} className="bg-white border border-zinc-200 rounded-xl p-6 relative group">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Question {idx + 1}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditQuestion(q)}
                    className="text-zinc-400 hover:text-indigo-600 transition-colors"
                    title="Edit Question"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setQuestionToDelete(q)}
                    className="text-zinc-400 hover:text-red-600 transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-zinc-900 font-medium text-lg mb-6">{q.question_text}</p>
              {q.image_url && (
                <div className="mb-6">
                  <img src={q.image_url} alt="Reference" className="max-w-full h-auto rounded-lg shadow-sm border border-zinc-200 max-h-48 object-contain" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt, oIdx) => (
                  <div 
                    key={opt.id}
                    className={cn(
                      "p-3 rounded-lg border text-sm flex items-center justify-between",
                      oIdx === q.correct_option_index 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium" 
                        : "bg-zinc-50 border-zinc-100 text-zinc-600"
                    )}
                  >
                    <span>{opt.option_text}</span>
                    {oIdx === q.correct_option_index && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
            {questions.length === 0 && (
              <div className="py-20 text-center bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl">
                <p className="text-zinc-400">No questions added yet. Click "Add Question" to begin.</p>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-zinc-900">Rank</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900">Student Name</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900">Student ID</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900">Department</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900">Score</th>
                  <th className="px-6 py-4 font-semibold text-zinc-900">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLeaderboardResults.map((result, index) => (
                  <tr key={result.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-zinc-100 text-zinc-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "text-zinc-500"
                      )}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-900 font-medium">{result.student_name}</td>
                    <td className="px-6 py-4 text-zinc-500 font-mono">{result.student_id}</td>
                    <td className="px-6 py-4 text-zinc-600">{result.student_department || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        (result.score / result.total_questions) >= 0.5 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {result.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 font-medium">
                      {Math.round((result.score / result.total_questions) * 100)}%
                    </td>
                  </tr>
                ))}
                {filteredLeaderboardResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                      {leaderboardSearchQuery ? 'No leaderboard entries match your search.' : 'No results available yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isSettingsModalOpen && test && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">Test Settings</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={test.title || ''} 
                    onChange={e => setTest({...test, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                  <textarea 
                    value={test.description || ''} 
                    onChange={e => setTest({...test, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Duration (mins)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={test.duration_minutes || 0} 
                      onChange={e => setTest({...test, duration_minutes: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Negative Marking</label>
                    <select 
                      value={test.negative_marks || 0} 
                      onChange={e => setTest({...test, negative_marks: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Start Time</label>
                    <input 
                      type="datetime-local" 
                      value={test.start_time ? new Date(test.start_time).toISOString().slice(0, 16) : ''} 
                      onChange={e => setTest({...test, start_time: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">End Time</label>
                    <input 
                      type="datetime-local" 
                      value={test.end_time ? new Date(test.end_time).toISOString().slice(0, 16) : ''} 
                      onChange={e => setTest({...test, end_time: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveTestSettings}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {questionToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete Question?</h2>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setQuestionToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteQuestion}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isGenerating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">Generate from Banks</h2>
              <form onSubmit={handleGenerateQuestions} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Select Question Banks</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-zinc-200 rounded-lg p-3">
                    {banks.map(bank => (
                      <label key={bank.id} className="flex items-center gap-3 p-2 hover:bg-zinc-50 rounded cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={selectedBanks.includes(bank.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBanks([...selectedBanks, bank.id]);
                            } else {
                              setSelectedBanks(selectedBanks.filter(id => id !== bank.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-zinc-700">{bank.title}</span>
                      </label>
                    ))}
                    {banks.length === 0 && (
                      <div className="text-sm text-zinc-500 text-center py-2">No question banks available.</div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Total Questions to Generate</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={generateCount}
                    onChange={e => setGenerateCount(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Questions will be distributed equally among selected banks.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsGenerating(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={selectedBanks.length === 0}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">
                {editingQuestionId ? 'Edit Question' : 'Add New Question'}
              </h2>
              <form onSubmit={handleAddQuestion} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Question Text</label>
                  <textarea 
                    required
                    value={newQ.text}
                    onChange={e => setNewQ({...newQ, text: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Enter the question here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Reference Image (Optional)</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewQ({...newQ, image_url: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {newQ.image_url && (
                    <div className="mt-4 relative inline-block">
                      <img src={newQ.image_url} alt="Preview" className="h-32 rounded-lg border border-zinc-200 object-contain" />
                      <button 
                        type="button" 
                        onClick={() => setNewQ({ ...newQ, image_url: '' })}
                        className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full p-1 shadow-md hover:bg-red-50 border border-zinc-200"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-zinc-700">Options (Select the correct one)</label>
                  {newQ.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="correct"
                        checked={newQ.correct === idx}
                        onChange={() => setNewQ({...newQ, correct: idx})}
                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <input 
                        type="text" 
                        required
                        value={opt}
                        onChange={e => {
                          const newOpts = [...newQ.options];
                          newOpts[idx] = e.target.value;
                          setNewQ({...newQ, options: newOpts});
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Explanation (Optional)</label>
                  <textarea 
                    value={newQ.explanation}
                    onChange={e => setNewQ({...newQ, explanation: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Provide an explanation for the correct answer..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Save Question
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StudentDashboard = ({ student }: { student: User }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentTimestamp = useCurrentTimestamp();

  const retryPendingSubmissions = async () => {
    const studentId = getStudentKey(student);
    const prefix = `adhi-arena:pending-submission:${studentId}:`;
    const keys = Array.from({ length: localStorage.length }, (_, idx) => localStorage.key(idx))
      .filter((key): key is string => Boolean(key?.startsWith(prefix)));

    for (const key of keys) {
      try {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        const parsed = JSON.parse(saved);
        const res = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.payload)
        });
        if (res.ok) {
          localStorage.removeItem(key);
          localStorage.removeItem(key.replace('pending-submission', 'coding-draft'));
        }
      } catch (retryError) {
        console.warn('Pending submission retry failed:', retryError);
      }
    }
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    const studentId = getStudentKey(student);
    
    try {
      await retryPendingSubmissions();
      const [testsRes, resultsRes] = await Promise.all([
        fetch(`/api/tests?batch=${encodeURIComponent(student.batch)}`),
        fetch(`/api/results?student_id=${encodeURIComponent(studentId)}`)
      ]);
      
      if (!testsRes.ok || !resultsRes.ok) throw new Error('Failed to fetch data');
      
      const testsData = await testsRes.json();
      const resultsData = await resultsRes.json();
      
      setTests(testsData);
      setResults(resultsData);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [student.batch, student.student_id, student.id, location.key, location.state]);

  const getResultForTest = (testId: string) => {
    if (!results || !Array.isArray(results)) return null;
    const testResults = results.filter(r => {
      const rTestId = String(r.test_id || '').trim();
      const targetId = String(testId || '').trim();
      return rTestId === targetId;
    });
    if (testResults.length === 0) return null;
    return testResults.reduce((prev, current) => ((prev.score || 0) > (current.score || 0)) ? prev : current);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Welcome, {student.username}</h1>
          <div className="mt-2 space-y-1">
            <p className="text-zinc-500 flex items-center gap-2">
              <span className="font-medium">Register No:</span> 
              <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">{student.student_id || 'N/A'}</span>
            </p>
            <p className="text-zinc-500 flex items-center gap-2">
              <span className="font-medium">Batch:</span> 
              <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{student.batch}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={fetchData}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-zinc-600 font-semibold hover:bg-zinc-50 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Tests'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Available Tests
          </h2>
          
          {tests.length === 0 ? (
            <div className="py-12 text-center bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl">
              <p className="text-zinc-500">No tests are currently available for your batch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tests.map(test => {
                const result = getResultForTest(test.id);
                const isCompleted = !!result;
                const contestEnded = hasContestEnded(test.end_time, currentTimestamp);

                return (
                  <motion.div 
                    key={test.id}
                    whileHover={{ y: -4 }}
                    className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isCompleted ? "bg-emerald-50" : "bg-indigo-50"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ClipboardList className="w-6 h-6 text-indigo-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-zinc-50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>{test.duration_minutes}m</span>
                      </div>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border",
                        test.type === 'coding' 
                          ? "bg-indigo-50 text-indigo-600 border-indigo-100" 
                          : "bg-violet-50 text-violet-600 border-violet-100"
                      )}>
                        {test.type === 'coding' ? 'Coding' : 'Aptitude'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">{test.title}</h3>
                    {test.negative_marks === 1 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">
                        <XCircle className="w-3 h-3" /> Negative Marking Enabled
                      </div>
                    )}
                    <p className="text-zinc-500 text-sm mb-6 flex-grow">{test.description}</p>
                    
                    {isCompleted ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <span className="text-sm font-medium text-emerald-700">Top Score</span>
                          <span className="text-sm font-bold text-emerald-700">{result.score}</span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => navigate(`/student/results/${test.id}`)}
                            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                          >
                            View Result
                          </button>
                          <button 
                            onClick={() => navigate(`/student/test/${test.id}`)}
                            disabled={!contestEnded}
                            title={contestEnded ? 'Retry this test' : 'Try Again becomes available after the contest ends'}
                            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 text-sm disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed"
                          >
                            {contestEnded ? 'Try Again' : 'Try Again (After Contest)'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => navigate(`/student/test/${test.id}`)}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        Start Test <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 sticky top-8">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Recent Results
            </h2>
            
            {results.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-sm bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                No results yet
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
                {results.map(result => (
                  <div key={result.id} className="group p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-zinc-900 text-sm line-clamp-2 leading-tight flex-1 mr-2">
                        {result.test_title || 'Unknown Test'}
                      </h3>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap",
                        result.score >= (result.total_questions / 2) ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {result.score} / {result.total_questions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-500 mt-2">
                      <span>{new Date(result.completed_at).toLocaleDateString()}</span>
                      <button 
                        onClick={() => navigate(`/student/results/${result.test_id}`)}
                        className="text-indigo-600 font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const TestSession = ({ student }: { student: User }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [codingSolutions, setCodingSolutions] = useState<Record<string, { code: string, language: string }>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [testDetails, setTestDetails] = useState<Test | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullScreenExitCount, setFullScreenExitCount] = useState(0);
  const [proctoringWarning, setProctoringWarning] = useState<{title: string, message: string, type: 'warning' | 'violation'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningMode, setRunningMode] = useState<'sample' | 'all' | null>(null);
  const isRunning = runningMode !== null;
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [problemResults, setProblemResults] = useState<Record<string, any>>({});
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [forcePlainCodeEditor, setForcePlainCodeEditor] = useState(false);
  const [monacoLoadTimedOut, setMonacoLoadTimedOut] = useState(false);
  const [monacoRetryKey, setMonacoRetryKey] = useState(0);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [submissionSaveError, setSubmissionSaveError] = useState<string | null>(null);
  const [isRetryAttempt, setIsRetryAttempt] = useState(false);
  const [compilerAvailability, setCompilerAvailability] = useState<Record<string, boolean>>({});
  const timerDeadlineRef = useRef<number | null>(null);
  const monacoEditorReadyRef = useRef(false);
  const currentTimestamp = useCurrentTimestamp();
  const contestEnded = hasContestEnded(testDetails?.end_time, currentTimestamp);
  const examIsActive = hasStarted && !isFinished;
  const codingDraftKey = getCodingDraftKey(id, student);
  const pendingSubmissionKey = getPendingSubmissionKey(id, student);

  const reLockExamWindow = async () => {
    window.adhiArena?.exam.setActive(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Electron kiosk mode remains active even when browser fullscreen is denied.
    }
  };

  useEffect(() => {
    window.adhiArena?.exam.setActive(examIsActive);
    return () => {
      if (examIsActive) window.adhiArena?.exam.setActive(false);
    };
  }, [examIsActive]);

  const buildSubmissionPayload = (calculatedScore: number) => ({
    client_submission_id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    test_id: id!,
    student_name: student.username,
    student_id: getStudentKey(student),
    score: calculatedScore,
    total_questions: testDetails?.type === 'mcq' ? questions.length : problems.length,
    responses: testDetails?.type === 'mcq' ? answers : {},
    coding_details: testDetails?.type === 'coding' ? (problems || []).map(p => {
      const runRes = problemResults[p.id];
      return {
        problem_id: p.id,
        problem_title: p.title,
        solution_code: codingSolutions[p.id]?.code || '',
        language: codingSolutions[p.id]?.language || (testDetails?.allowed_languages?.[0] || 'python'),
        status: runRes
          ? (getRunPassedCount(runRes) === 0
              ? 'Failed'
              : hasRunFullyPassed(runRes)
                ? 'Accepted'
                : 'Partially Accepted')
          : 'Submitted',
        test_cases_passed: runRes ? getRunPassedCount(runRes) : 0,
        total_test_cases: runRes ? getRunTotalCount(runRes) : (p.test_cases?.length || 0),
        test_case_results: runRes ? (runRes.testResults || runRes.results || []) : []
      };
    }) : []
  });

  const saveSubmissionPayload = async (payload: any) => {
    localStorage.setItem(pendingSubmissionKey, JSON.stringify({ payload, saved_at: new Date().toISOString() }));
    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Unable to save the result. Check your internet connection and try again.');
    }
    localStorage.removeItem(pendingSubmissionKey);
    if (codingDraftKey) localStorage.removeItem(codingDraftKey);
    if (data?.score !== undefined) setScore(data.score);
    setSubmissionSaveError(null);
    return data;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionSaveError(null);
    let finalScore = 0;
    
    if (testDetails?.type === 'mcq') {
      questions.forEach(q => {
        if (answers[q.id] === q.correct_option_index) {
          finalScore++;
        } else if (answers[q.id] !== undefined && testDetails?.negative_marks) {
          finalScore--;
        }
      });
    } else {
      (problems || []).forEach(p => {
        const runRes = problemResults[p.id];
        if (getRunTotalCount(runRes) > 0) {
          finalScore += getRunPassedCount(runRes) > 0 ? 1 : 0;
        }
      });
    }

    const calculatedScore = testDetails?.negative_marks ? Math.max(0, finalScore) : parseFloat(finalScore.toFixed(2));
    setScore(calculatedScore);
    setIsFinished(true);

    try {
      await saveSubmissionPayload(buildSubmissionPayload(calculatedScore));
    } catch (e: any) {
      console.error("Submission error:", e);
      setSubmissionSaveError(e?.message || 'Unable to save the result. Check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryPendingSubmission = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const saved = localStorage.getItem(pendingSubmissionKey);
      if (!saved) throw new Error('No pending result was found to retry.');
      const parsed = JSON.parse(saved);
      await saveSubmissionPayload(parsed.payload);
    } catch (e: any) {
      setSubmissionSaveError(e?.message || 'Unable to save the result. Check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRef = useRef<() => void>(handleSubmit);

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  useEffect(() => {
    if (!hasStarted || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden && hasStarted && !isFinished) {
        setTabSwitchCount(prev => prev + 1);
        setTimeout(reLockExamWindow, 100);
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus() && hasStarted && !isFinished) {
          setTabSwitchCount(prev => prev + 1);
          reLockExamWindow();
        }
      }, 100);
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (isEditableEventTarget(e.target)) return;
      e.preventDefault();
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (isEditableEventTarget(e.target)) return;
      e.preventDefault();
    };

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && hasStarted && !isFinished) {
        setFullScreenExitCount(prev => prev + 1);
        setTimeout(reLockExamWindow, 100);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const blockedPlainKeys = ['escape', 'f11'];
      const blockedWithModifier = ['tab', 'f4', 'r', 'w', 'q', 'n', 't'];
      if (
        blockedPlainKeys.includes(key) ||
        ((e.altKey || e.metaKey || e.ctrlKey) && blockedWithModifier.includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        reLockExamWindow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('paste', handleCopy);
    document.addEventListener('selectstart', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('paste', handleCopy);
      document.removeEventListener('selectstart', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, [hasStarted, isFinished]);

  useEffect(() => {
    if (!hasStarted || isFinished) return;

    const handleLogoutRequest = () => setShowExitConfirmation(true);
    window.addEventListener('adhi-arena:request-test-logout', handleLogoutRequest);
    return () => window.removeEventListener('adhi-arena:request-test-logout', handleLogoutRequest);
  }, [hasStarted, isFinished]);

  useEffect(() => {
    const studentId = (student.student_id?.trim() || student.id.toString());

    const loadTest = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch test details first
        const testsRes = await fetch('/api/tests');
        if (!testsRes.ok) throw new Error('Failed to fetch tests');
        const tests = await testsRes.json();
        const test = tests.find((t: any) => t.id === id);
        
        if (!test) {
          setError("Test not found");
          setIsLoading(false);
          return;
        }

        const existingResultsRes = await fetch(`/api/results?student_id=${encodeURIComponent(studentId)}`);
        if (!existingResultsRes.ok) throw new Error('Failed to verify previous attempts');
        const existingResults = await existingResultsRes.json();
        const alreadyDone = existingResults.some((result: any) => String(result.test_id) === String(id));
        let retryAllowed = false;

        if (alreadyDone) {
          if (!test.end_time) {
            alert('Try Again is unavailable because this contest has no configured end time.');
            navigate('/student');
            return;
          }
          if (Date.now() < new Date(test.end_time).getTime()) {
            alert('Try Again is available only after the contest ends.');
            navigate('/student');
            return;
          }
          retryAllowed = true;
        }

        setIsRetryAttempt(retryAllowed);
        setTestDetails(test);
        setTimeLeft(test.duration_minutes * 60);

        if (test.type === 'coding') {
          const [problemsRes, compilersRes] = await Promise.all([
            fetch(`/api/tests/${id}/problems`),
            fetch('/api/system/compilers')
          ]);
          if (!problemsRes.ok) throw new Error('Failed to fetch coding problems');
          const problemsData = await problemsRes.json();
          const compilerData = compilersRes.ok ? await compilersRes.json() : { compilers: [] };
          const detected = Object.fromEntries(
            (compilerData.compilers || []).map((compiler: any) => [compiler.language, compiler.available])
          ) as Record<string, boolean>;
          detected.python3 = detected.python;
          setCompilerAvailability(detected);
          
          setProblems(problemsData);
          const initialSolutions: Record<string, { code: string, language: string }> = {};
          const allowedLanguages = test.allowed_languages || ['python', 'javascript', 'java', 'c', 'cpp'];
          const initialLang = allowedLanguages.find((language: string) => detected[language] !== false)
            || allowedLanguages[0]
            || 'python';
          problemsData.forEach((p: CodingProblem) => {
            initialSolutions[p.id] = { 
              code: getCodeTemplate(initialLang), 
              language: initialLang 
            };
          });
          try {
            const savedDraft = localStorage.getItem(getCodingDraftKey(id, student));
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              Object.assign(initialSolutions, parsed.solutions || {});
              setDraftSavedAt(parsed.saved_at ? new Date(parsed.saved_at).getTime() : null);
            }
          } catch (draftError) {
            console.warn('Unable to restore coding draft:', draftError);
          }
          setCodingSolutions(initialSolutions);
          setQuestions([]); // Ensure questions are empty
        } else {
          const questionsRes = await fetch(`/api/tests/${id}/questions`);
          if (!questionsRes.ok) throw new Error('Failed to fetch questions');
          const data = await questionsRes.json();
          
          const shuffled = shuffleArray(data).map((q: Question) => ({
            ...q,
            options: shuffleArray((q.options || []).map((o, i) => ({
              ...o,
              option_index: o.option_index !== undefined ? o.option_index : i
            })))
          }));
          setQuestions(shuffled);
          setProblems([]); // Empty problems
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error("Error loading test:", err);
        setError(err.message || "Failed to load test content");
        setIsLoading(false);
      }
    };

    loadTest();
  }, [id, student.student_id, student.id, navigate]);

  useEffect(() => {
    if (!hasStarted || isFinished || testDetails?.type !== 'coding' || !codingDraftKey) return;
    if (Object.keys(codingSolutions).length === 0) return;

    const timer = window.setTimeout(() => {
      try {
        const savedAt = Date.now();
        localStorage.setItem(codingDraftKey, JSON.stringify({
          saved_at: new Date(savedAt).toISOString(),
          solutions: codingSolutions
        }));
        setDraftSavedAt(savedAt);
      } catch (draftError) {
        console.warn('Unable to save coding draft:', draftError);
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [codingSolutions, codingDraftKey, hasStarted, isFinished, testDetails?.type]);

  useEffect(() => {
    if (isFinished || !hasStarted) return;

    if (timerDeadlineRef.current === null) {
      const initialSeconds = timeLeft ?? (testDetails?.duration_minutes || 0) * 60;
      timerDeadlineRef.current = Date.now() + Math.max(0, initialSeconds) * 1000;
    }

    let submittedForTimeout = false;
    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((timerDeadlineRef.current! - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining === 0 && !submittedForTimeout) {
        submittedForTimeout = true;
        handleSubmitRef.current();
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(timer);
  }, [isFinished, hasStarted, testDetails?.duration_minutes]);

  useEffect(() => {
    if (!hasStarted || isFinished || isRetryAttempt || !testDetails?.end_time) return;

    const endAt = new Date(testDetails.end_time).getTime();
    if (!Number.isFinite(endAt)) return;

    let submittedForContestEnd = false;
    const submitIfContestEnded = () => {
      if (submittedForContestEnd || Date.now() < endAt) return;
      submittedForContestEnd = true;
      setProctoringWarning({
        title: "Contest Ended",
        message: "The contest end time has been reached. Your current answers are being submitted and your result will be shown.",
        type: 'violation'
      });
      handleSubmitRef.current();
    };

    submitIfContestEnded();
    const timer = window.setInterval(submitIfContestEnded, 1000);
    return () => window.clearInterval(timer);
  }, [hasStarted, isFinished, isRetryAttempt, testDetails?.end_time]);

  const handleStartTest = async () => {
    const initialSeconds = timeLeft ?? (testDetails?.duration_minutes || 0) * 60;
    timerDeadlineRef.current = Date.now() + Math.max(0, initialSeconds) * 1000;
    window.adhiArena?.exam.setActive(true);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error("Error enabling full-screen:", err);
    }
    setHasStarted(true);
    setShowStartModal(false);
  };

  const handleRunCode = async (runAll: boolean = false) => {
    if (!currentP) return;
    const selectedLang = codingSolutions[currentP.id]?.language || (testDetails?.allowed_languages?.[0] || 'python');
    if (compilerAvailability[selectedLang] === false) {
      setLastRunResult({ error: `${selectedLang} is not installed on this computer. Ask the administrator to install it and add it to PATH.` });
      return;
    }
    setRunningMode(runAll ? 'all' : 'sample');
    setLastRunResult(null);
    try {
      const res = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: currentP.id,
          code: codingSolutions[currentP.id]?.code || '',
          language: selectedLang,
          run_all: runAll
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setLastRunResult({ 
          error: data.error || `Server error (Status ${res.status})`, 
          details: data.details || null 
        });
      } else {
        setLastRunResult(data);
        if (runAll) {
          setProblemResults(prev => ({
            ...prev,
            [currentP.id]: data
          }));
        }
      }
    } catch (e: any) {
      setLastRunResult({ error: e.message || "Execution failed. Server error." });
    } finally {
      setRunningMode(null);
    }
  };

  const getCodeTemplate = (lang: string) => {
    switch (lang) {
      case 'python':
        return '# Write your code here\n';
      case 'javascript':
        return '// Write your code here\n';
      case 'java':
        return 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}';
      case 'cpp':
        return '#include <iostream>\n\nint main() {\n    // Write your code here\n    return 0;\n}';
      case 'c':
        return '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}';
      default:
        return '';
    }
  };

  const currentQ = questions[currentIdx];
  const currentP = (problems || [])[currentIdx];
  const usePlainCodeEditor = forcePlainCodeEditor || monacoLoadTimedOut;

  useEffect(() => {
    if (currentP && !codingSolutions[currentP.id]?.code) {
      const lang = codingSolutions[currentP.id]?.language || testDetails?.allowed_languages?.[0] || 'python';
      setCodingSolutions(prev => ({
        ...prev,
        [currentP.id]: {
          ...prev[currentP.id],
          code: getCodeTemplate(lang),
          language: lang
        }
      }));
    }
  }, [currentP, testDetails]);

  useEffect(() => {
    if (!currentP || testDetails?.type !== 'coding') return;
    monacoEditorReadyRef.current = false;
    setMonacoLoadTimedOut(false);

    const timer = window.setTimeout(() => {
      if (!monacoEditorReadyRef.current) setMonacoLoadTimedOut(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [currentP?.id, testDetails?.type, monacoRetryKey]);

  if (isLoading && !isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium">Preparing your {testDetails?.type === 'coding' ? 'problems' : 'test'}...</p>
        </div>
      </div>
    );
  }

  if (error && !isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">Oops!</h2>
          <p className="text-zinc-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="w-full bg-zinc-100 text-zinc-600 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (showStartModal && !isFinished) {
    return (
      <div className="fixed inset-0 bg-zinc-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl w-full max-w-xl p-10 shadow-2xl border border-zinc-200"
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
            <Settings className="w-8 h-8 text-indigo-600 animate-spin-slow" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-4">Test Instructions & Proctoring</h2>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            Please read the following instructions carefully before starting the test:
          </p>
          
          <div className="space-y-4 mb-10">
            <div className="flex items-start gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900">Full-Screen Mode</h4>
                <p className="text-sm text-zinc-500">The test runs in locked full-screen mode until you submit the test.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900">No Tab Switching</h4>
                <p className="text-sm text-amber-700/70">Switching tabs, windows, and system gestures are blocked while the test is active.</p>
                <p className="text-sm text-amber-800 mt-2 font-semibold">If a violation is recorded incorrectly, contact the test admin or invigilator.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-red-900">Content Protection</h4>
                <p className="text-sm text-red-700/70">Right-click, text selection, and copy/paste are disabled.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/student')}
              className="flex-1 px-6 py-4 rounded-2xl font-bold text-zinc-600 hover:bg-zinc-100 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleStartTest}
              className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              I Understand, Start Test
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isFinished) {
    const totalCount = testDetails?.type === 'mcq' ? questions.length : problems.length;
    const percentage = totalCount > 0 ? (score / totalCount) * 100 : 0;
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <AnimatePresence>
          {proctoringWarning && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-zinc-200 text-center"
              >
                <div className={cn(
                  "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6",
                  proctoringWarning.type === 'warning' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                )}>
                  {proctoringWarning.type === 'warning' ? (
                    <Settings className="w-10 h-10 animate-pulse" />
                  ) : (
                    <XCircle className="w-10 h-10" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 mb-3">{proctoringWarning.title}</h3>
                <p className="text-zinc-600 mb-8 leading-relaxed">
                  {proctoringWarning.message}
                </p>
                
                {proctoringWarning.type === 'warning' ? (
                  <button
                    onClick={async () => {
                      try {
                        if (document.documentElement.requestFullscreen) {
                          await document.documentElement.requestFullscreen();
                        }
                        setProctoringWarning(null);
                      } catch (err) {
                        console.error("Failed to re-enter full screen:", err);
                        setProctoringWarning(null);
                      }
                    }}
                    className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                  >
                    {proctoringWarning.title.includes('Full-Screen') ? 'Re-enable Full Screen' : 'I Understand & Resume'}
                  </button>
                ) : (
                  <button
                    onClick={() => setProctoringWarning(null)}
                    className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                  >
                    View Results
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="max-w-2xl w-full text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-zinc-200 rounded-3xl p-12 shadow-xl"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">Test Completed!</h1>
            <p className="text-zinc-500 mb-8">Well done, {student.username}. Here is your performance summary.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <span className="block text-sm font-medium text-zinc-500 mb-1">Score</span>
                <span className="text-3xl font-bold text-zinc-900">{score}</span>
              </div>
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <span className="block text-sm font-medium text-zinc-500 mb-1">Percentage</span>
                <span className="text-3xl font-bold text-zinc-900">{Math.round(percentage)}%</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate(`/student/results/${id}`)}
                disabled={isSubmitting || Boolean(submissionSaveError)}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LayoutDashboard className="w-5 h-5" />}
                {isSubmitting ? 'Saving Result...' : submissionSaveError ? 'Result Not Saved Yet' : 'View Result'}
              </button>

              {submissionSaveError && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-left text-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Result saved locally</p>
                      <p className="text-sm mt-1 leading-relaxed">{submissionSaveError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={retryPendingSubmission}
                    disabled={isSubmitting}
                    className="mt-3 w-full bg-amber-500 text-white py-2.5 rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Retry Saving Result
                  </button>
                </div>
              )}

              <button 
                onClick={() => {
                  timerDeadlineRef.current = null;
                  setIsFinished(false);
                  setHasStarted(false);
                  setShowStartModal(true);
                  setAnswers({});
                  setCodingSolutions({});
                  setProblemResults({});
                  setLastRunResult(null);
                  setSubmissionSaveError(null);
                  setIsRetryAttempt(true);
                  setTimeLeft(testDetails ? testDetails.duration_minutes * 60 : null);
                  setCurrentIdx(0);
                }}
                disabled={!contestEnded || isSubmitting || Boolean(submissionSaveError)}
                title={contestEnded ? 'Retry this test' : 'Try Again becomes available after the contest ends'}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-5 h-5" />
                {contestEnded ? 'Try Again' : 'Try Again (Available After Contest Ends)'}
              </button>

              <button 
                onClick={() => navigate('/student', { state: { refreshAfterSubmit: Date.now() } })}
                disabled={isSubmitting}
                className="w-full bg-zinc-100 text-zinc-600 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs < 10 ? '0' : ''}${rs}`;
  };

  const totalItems = testDetails?.type === 'mcq' ? questions.length : problems.length;

  return (
    <div className="max-w-[98%] mx-auto px-4 py-8 relative">
      <AnimatePresence>
        {proctoringWarning && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-zinc-200 text-center"
            >
              <div className={cn(
                "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6",
                proctoringWarning.type === 'warning' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
              )}>
                {proctoringWarning.type === 'warning' ? (
                  <Settings className="w-10 h-10 animate-pulse" />
                ) : (
                  <XCircle className="w-10 h-10" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">{proctoringWarning.title}</h3>
              <p className="text-zinc-600 mb-8 leading-relaxed">
                {proctoringWarning.message}
              </p>
              
              {proctoringWarning.type === 'warning' ? (
                <button
                  onClick={async () => {
                    try {
                      if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                      }
                      setProctoringWarning(null);
                    } catch (err) {
                      console.error("Failed to re-enter full screen:", err);
                      setProctoringWarning(null);
                    }
                  }}
                  className="w-full bg-amber-500 text-white py-3.5 rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                >
                  {proctoringWarning.title === 'Full-Screen Required' ? 'Re-enable Full Screen' : 'I Understand & Resume'}
                </button>
              ) : (
                <button
                  onClick={() => setIsFinished(true)}
                  className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  View Results
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={cn(
        "grid grid-cols-1 gap-5",
        editorExpanded ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_220px]"
      )}>
        {/* Main Area */}
        <div className="min-w-0">
          <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl border border-zinc-200 sticky top-20 z-40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                {currentIdx + 1}
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Progress</span>
                <div className="w-48 h-2 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / totalItems) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg",
                timeLeft! < 60 ? "bg-red-50 text-red-600 animate-pulse" : "bg-zinc-50 text-zinc-700"
              )}>
                <Clock className="w-5 h-5" />
                {formatTime(timeLeft || 0)}
              </div>
              {testDetails?.negative_marks === 1 && testDetails.type === 'mcq' && (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-red-100">
                  <XCircle className="w-3.5 h-3.5" /> Negative Marking
                </div>
              )}
            </div>
          </div>

          {testDetails?.type === 'mcq' ? (
            <motion.div 
              key={`mcq-${currentIdx}`}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm mb-8 select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-8">{currentQ?.question_text}</h2>
              {currentQ?.image_url && (
                <div className="mb-8">
                  <img src={currentQ.image_url} alt="Reference" className="max-w-full h-auto rounded-lg shadow-sm border border-zinc-200 max-h-64 object-contain" />
                </div>
              )}
              <div className="space-y-4">
                {currentQ?.options.map((opt, idx) => (
                  <button 
                    key={opt.id}
                    onClick={() => setAnswers({...answers, [currentQ.id]: opt.option_index})}
                    className={cn(
                      "w-full p-5 rounded-xl border-2 text-left transition-all flex items-center justify-between group",
                      answers[currentQ.id] === opt.option_index 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900" 
                        : "border-zinc-100 hover:border-zinc-300 text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                        answers[currentQ.id] === opt.option_index ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium">{opt.option_text}</span>
                    </div>
                    {answers[currentQ.id] === opt.option_index && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            currentP && (
              <div key={`coding-${currentIdx}`} className="flex flex-col min-h-0 h-full">
                <div className={cn(
                  "grid grid-cols-1 gap-4 h-[calc(100vh-190px)] min-h-[680px]",
                  editorExpanded
                    ? "lg:grid-cols-1"
                    : "lg:grid-cols-[minmax(260px,0.55fr)_minmax(0,1.85fr)]"
                )}>
                  {/* Left: Problem Statement */}
                  <div className={cn(
                    "bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm overflow-y-auto custom-scrollbar",
                    editorExpanded && "hidden"
                  )}>
                    <h2 className="text-2xl font-bold text-zinc-900 mb-4">{currentP.title}</h2>
                    <div className="prose prose-zinc prose-sm max-w-none mb-6">
                      <p className="whitespace-pre-wrap text-zinc-600">{currentP.description}</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Input Format</h3>
                        <p className="text-sm text-zinc-500 bg-zinc-50 p-3 rounded-lg border border-zinc-100">{currentP.input_format}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Output Format</h3>
                        <p className="text-sm text-zinc-500 bg-zinc-50 p-3 rounded-lg border border-zinc-100">{currentP.output_format}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Constraints</h3>
                        <p className="text-sm text-zinc-500 bg-zinc-50 p-3 rounded-lg border border-zinc-100">{currentP.constraints}</p>
                      </div>
                      {currentP.sample_input && (
                         <div>
                          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Sample Input</h3>
                          <pre className="text-xs text-zinc-300 bg-zinc-900 p-3 rounded-lg overflow-x-auto font-mono">{currentP.sample_input}</pre>
                        </div>
                      )}
                      {currentP.sample_output && (
                         <div>
                          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Sample Output</h3>
                          <pre className="text-xs text-zinc-300 bg-zinc-900 p-3 rounded-lg overflow-x-auto font-mono">{currentP.sample_output}</pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Code Editor */}
                  <div className="flex flex-col h-full min-h-0 min-w-0">
                    <div className="bg-[#1e1e1e] border border-zinc-800 rounded-2xl shadow-xl flex flex-col flex-1 min-h-[380px] overflow-hidden">
                      <div className="p-3.5 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-3 bg-[#252525]">
                        <div className="flex flex-wrap items-center gap-3">
                          <select 
                            value={codingSolutions[currentP.id]?.language || (testDetails?.allowed_languages?.[0] || 'python')}
                            onChange={(e) => {
                              const newLang = e.target.value;
                              const currentCode = codingSolutions[currentP.id]?.code || '';
                              const oldLang = codingSolutions[currentP.id]?.language || '';
                              
                              // Update code to template if current code is empty or matches old template
                              let newCode = currentCode;
                              if (!currentCode.trim() || currentCode === getCodeTemplate(oldLang)) {
                                newCode = getCodeTemplate(newLang);
                              }

                              setCodingSolutions({
                                ...codingSolutions,
                                [currentP.id]: {
                                  ...codingSolutions[currentP.id],
                                  language: newLang,
                                  code: newCode
                                }
                              });
                            }}
                            className="bg-[#2d2d2d] text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                          >
                            {(testDetails?.allowed_languages || ['python', 'javascript', 'java', 'c', 'cpp']).map(lang => (
                               <option key={lang} value={lang} disabled={compilerAvailability[lang] === false}>
                                 {lang === 'python' ? 'Python 3' : lang === 'javascript' ? 'JavaScript' : lang === 'java' ? 'Java' : lang === 'cpp' ? 'C++' : 'C'}
                                 {compilerAvailability[lang] === false ? ' (not installed)' : ''}
                               </option>
                            ))}
                          </select>
                          <div className="h-4 w-[1px] bg-zinc-800" />
                          <div className="flex items-center gap-2 bg-[#2d2d2d] px-2 py-1 rounded-lg border border-zinc-700">
                             <button 
                               onClick={() => setEditorFontSize(prev => Math.max(10, prev - 1))}
                               className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                             >
                               <ChevronDown className="w-4 h-4 rotate-90" />
                             </button>
                             <span className="text-[10px] font-bold text-zinc-500 w-6 text-center">{editorFontSize}px</span>
                             <button 
                               onClick={() => setEditorFontSize(prev => Math.min(30, prev + 1))}
                               className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                             >
                               <ChevronDown className="w-4 h-4 -rotate-90" />
                             </button>
                          </div>
                          <span className="text-zinc-500 text-xs font-mono hidden md:inline">
                            {codingSolutions[currentP.id]?.language === 'java' ? 'Solution.java' : `solution.${codingSolutions[currentP.id]?.language === 'python' ? 'py' : codingSolutions[currentP.id]?.language === 'javascript' ? 'js' : codingSolutions[currentP.id]?.language === 'cpp' ? 'cpp' : 'c'}`}
                          </span>
                          {draftSavedAt && (
                            <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 bg-[#2d2d2d] px-2.5 py-1 rounded-lg border border-zinc-700">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Autosaved {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {hasRunFullyPassed(problemResults[currentP.id]) && (
                            <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (usePlainCodeEditor) {
                                monacoEditorReadyRef.current = false;
                                setForcePlainCodeEditor(false);
                                setMonacoLoadTimedOut(false);
                                setMonacoRetryKey(prev => prev + 1);
                              } else {
                                setForcePlainCodeEditor(true);
                              }
                            }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                              usePlainCodeEditor
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                                : "bg-[#2d2d2d] hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                            )}
                            title={usePlainCodeEditor ? "Try the Monaco code editor again" : "Use the plain fallback code editor"}
                          >
                            <Code2 className="w-3.5 h-3.5" />
                            {usePlainCodeEditor ? 'Basic Editor' : 'Fallback Editor'}
                          </button>
                          <button
                            onClick={() => setEditorExpanded((expanded) => !expanded)}
                            className="flex items-center gap-2 bg-[#2d2d2d] hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-zinc-700"
                            title={editorExpanded ? "Restore problem and progress panels" : "Expand code editor"}
                          >
                            {editorExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                            {editorExpanded ? 'Restore' : 'Focus Editor'}
                          </button>
                          <button 
                            onClick={() => handleRunCode(false)}
                            disabled={isRunning || compilerAvailability[codingSolutions[currentP.id]?.language || (testDetails?.allowed_languages?.[0] || 'python')] === false}
                            className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            title="Run against sample test cases only"
                          >
                            {runningMode === 'sample' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                            Run Code
                          </button>
                          <button 
                            onClick={() => handleRunCode(true)}
                            disabled={isRunning || compilerAvailability[codingSolutions[currentP.id]?.language || (testDetails?.allowed_languages?.[0] || 'python')] === false}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20"
                            title="Run against all test cases including hidden ones"
                          >
                            {runningMode === 'all' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Run All Test Cases
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 relative bg-[#1e1e1e] min-h-0">
                        {usePlainCodeEditor ? (
                          <textarea
                            value={codingSolutions[currentP.id]?.code || ''}
                            onChange={(event) => setCodingSolutions(prev => ({
                              ...prev,
                              [currentP.id]: {
                                ...prev[currentP.id],
                                code: event.target.value
                              }
                            }))}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                            className="w-full h-full resize-none bg-[#1e1e1e] text-zinc-100 outline-none p-4 font-mono leading-relaxed custom-scrollbar"
                            style={{ fontSize: editorFontSize }}
                            placeholder="Write your code here..."
                          />
                        ) : (
                          <MonacoEditor
                            key={`${currentP.id}-${monacoRetryKey}`}
                            height="100%"
                            language={codingSolutions[currentP.id]?.language === 'cpp' ? 'cpp' : codingSolutions[currentP.id]?.language === 'python' ? 'python' : codingSolutions[currentP.id]?.language === 'javascript' ? 'javascript' : codingSolutions[currentP.id]?.language === 'java' ? 'java' : 'c'}
                            theme="vs-dark"
                            value={codingSolutions[currentP.id]?.code || ''}
                            loading={(
                              <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-zinc-500 font-mono text-sm">
                                Opening code editor...
                              </div>
                            )}
                            onMount={(editor) => {
                              monacoEditorReadyRef.current = true;
                              setMonacoLoadTimedOut(false);

                              // Disable copy/paste/cut
                              editor.onKeyDown((e: any) => {
                                const { keyCode, ctrlKey, metaKey } = e;
                                // Monaco KeyCodes: C=33, V=52, X=54
                                if ((ctrlKey || metaKey) && (keyCode === 33 || keyCode === 52 || keyCode === 54)) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              });
                              
                              const domNode = editor.getDomNode();
                              if (domNode) {
                                const prevent = (e: any) => { e.preventDefault(); e.stopPropagation(); };
                                domNode.addEventListener('copy', prevent, true);
                                domNode.addEventListener('paste', prevent, true);
                                domNode.addEventListener('cut', prevent, true);
                              }
                            }}
                            onChange={(value) => setCodingSolutions(prev => ({
                              ...prev,
                              [currentP.id]: {
                                ...prev[currentP.id],
                                code: value || ''
                              }
                            }))}
                            options={{
                              minimap: { enabled: false },
                              fontSize: editorFontSize,
                              lineNumbers: 'on',
                              roundedSelection: false,
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              padding: { top: 10, bottom: 10 },
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              scrollbar: {
                                verticalScrollbarSize: 10,
                                horizontalScrollbarSize: 10
                              },
                              readOnly: false,
                              theme: 'vs-dark',
                              smoothScrolling: true,
                              cursorBlinking: 'smooth',
                              cursorSmoothCaretAnimation: 'on',
                              contextmenu: false,
                              quickSuggestions: false,
                              snippetSuggestions: 'none',
                              wordBasedSuggestions: 'off',
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Execution Result Box */}
                    {(lastRunResult || isRunning) && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 h-64 shrink-0 mt-3 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Console Output</h4>
                          {lastRunResult?.success === true && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">PASSED</span>}
                          {lastRunResult?.success === false && <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">FAILED</span>}
                        </div>
                        {isRunning ? (
                          <div className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                            <p className="text-zinc-500 font-mono text-sm animate-pulse">Executing code against test cases...</p>
                          </div>
                        ) : (
                          <div className="font-mono text-xs">
                             {lastRunResult.error ? (
                               <div className="space-y-2">
                                 <div className="flex items-center gap-2 text-red-500 font-bold mb-1">
                                   <RefreshCw className="w-3 h-3 animate-spin" />
                                   <span>Execution Error</span>
                                 </div>
                                 <pre className="text-red-400 whitespace-pre-wrap text-xs bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                                   {lastRunResult.error === 'fetch failed' 
                                     ? 'The code execution engine is temporarily unavailable. This is usually a network issue with the remote compiler. Please try again in a few moments.' 
                                     : lastRunResult.error}
                                 </pre>
                                 {lastRunResult.details && (
                                   <div className="p-2 bg-red-900/10 border border-red-500/10 rounded text-[10px] text-red-300/60 font-mono italic">
                                     {lastRunResult.details}
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <div className="space-y-4">
                                 <div className="flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-emerald-500 transition-all duration-300"
                                        style={{ width: `${(lastRunResult.passed_count / lastRunResult.total_count) * 100}%` }}
                                      />
                                    </div>
                                    <span className={cn(
                                      "text-xs font-bold",
                                      lastRunResult.passed_count === lastRunResult.total_count ? "text-emerald-500" : "text-amber-500"
                                    )}>
                                      {lastRunResult.passed_count} / {lastRunResult.total_count} Passed
                                    </span>
                                 </div>
                                  <div className="space-y-6 mt-4">
                                    {(lastRunResult.testResults || []).map((res: any, i: number) => (
                                      <div key={i} className="border-l-2 border-zinc-800 pl-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                            {res.is_hidden ? `Test Case ${i + 1}  #hidden` : `Test Case ${i + 1}`}
                                          </span>
                                          {res.success ? (
                                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">Passed</span>
                                          ) : (
                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20">Failed</span>
                                          )}
                                        </div>
                                        
                                        {(!res.is_hidden || contestEnded) ? (
                                          <div className="grid grid-cols-1 gap-3">
                                            <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/50">
                                              <div className="text-[9px] text-zinc-600 uppercase font-bold mb-2 tracking-widest">Sample Input</div>
                                              <pre className="text-[11px] text-zinc-400 font-mono whitespace-pre-wrap">{res.input || '(Empty)'}</pre>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                                <div className="text-[9px] text-emerald-600 uppercase font-bold mb-2 tracking-widest">Expected Output</div>
                                                <pre className="text-[11px] text-emerald-200/70 font-mono whitespace-pre-wrap">{res.expected}</pre>
                                              </div>
                                              <div className={cn(
                                                "p-3 rounded-xl border", 
                                                res.success ? "bg-black/40 border-zinc-800/50" : "bg-red-500/5 border-red-500/10"
                                              )}>
                                                <div className={cn(
                                                  "text-[9px] uppercase font-bold mb-2 tracking-widest", 
                                                  res.success ? "text-zinc-600" : "text-red-400"
                                                )}>Our Output</div>
                                                <pre className={cn(
                                                  "text-[11px] font-mono whitespace-pre-wrap", 
                                                  res.success ? "text-zinc-300" : "text-red-300"
                                                )}>{res.actual || (res.error ? `Error: ${res.error}` : '(Empty Output)')}</pre>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-zinc-800/20 p-3 rounded-xl border border-zinc-800/30">
                                            <p className="text-[10px] text-zinc-500 italic">Input and output details are hidden for this test case.</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    
                                    {(!lastRunResult.testResults || lastRunResult.testResults.length === 0) && (
                                      <div className="bg-black/30 p-3 rounded-lg border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 mb-1 uppercase tracking-widest">Final Output:</div>
                                        <pre className={cn(
                                          "text-xs whitespace-pre-wrap",
                                          lastRunResult.success ? "text-zinc-300" : "text-red-300"
                                        )}>{lastRunResult.output || "(Empty Output)"}</pre>
                                      </div>
                                    )}
                                  </div>
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          <div className="flex justify-between items-center">
            <button 
              disabled={currentIdx === 0}
              onClick={() => {
                setCurrentIdx(prev => prev - 1);
                setLastRunResult(null);
              }}
              className="px-6 py-3 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            {currentIdx === totalItems - 1 ? (
              <button 
                disabled={isSubmitting}
                onClick={() => setShowSubmitConfirmation(true)}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : 'Submit Test'}
              </button>
            ) : (
              <button 
                onClick={() => {
                  setCurrentIdx(prev => prev + 1);
                  setLastRunResult(null);
                }}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
              >
                Next {testDetails?.type === 'mcq' ? 'Question' : 'Problem'} <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Sidebar */}
        <div className={cn(editorExpanded && "hidden")}>
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm sticky top-20">
            <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              Progress Palette
            </h3>
            
            <div className="grid grid-cols-5 gap-2 mb-6">
              {(testDetails?.type === 'mcq' ? questions : (problems || [])).map((item, idx) => {
                const runResult = testDetails?.type === 'coding' ? problemResults[item.id] : null;
                const isCompleted = testDetails?.type === 'coding' && hasRunFullyPassed(runResult);
                const isAnswered = testDetails?.type === 'mcq'
                  ? answers[item.id] !== undefined
                  : Boolean(codingSolutions[item.id]?.code.trim().length);
                const isCurrent = currentIdx === idx;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentIdx(idx);
                      setLastRunResult(null);
                    }}
                    className={cn(
                      "w-full aspect-square rounded-lg font-bold text-sm transition-all border flex items-center justify-center relative",
                      isCurrent 
                        ? isCompleted
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-110 z-10"
                          : "bg-indigo-600 text-white border-indigo-600 shadow-md scale-110 z-10" 
                        : isCompleted
                          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm"
                          : isAnswered
                          ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
                          : "bg-zinc-50 text-zinc-400 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100"
                    )}
                    title={isCompleted ? `Problem ${idx + 1}: all test cases passed` : isAnswered ? `Problem ${idx + 1}: attempted` : `Problem ${idx + 1}: not attempted`}
                  >
                    <span>{idx + 1}</span>
                    {isCompleted && (
                      <span className="absolute -right-1 -top-1 w-4 h-4 rounded-full bg-white text-emerald-600 shadow-sm flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
                <div className="w-3 h-3 rounded bg-indigo-600" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
                <div className="w-3 h-3 rounded bg-emerald-600 border border-emerald-600" />
                <span>Completed (all cases passed)</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
                <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
                <span>Attempted</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
                <div className="w-3 h-3 rounded bg-zinc-50 border border-zinc-200" />
                <span>Remaining</span>
              </div>
            </div>

            <div className="mt-8">
              <button 
                type="button"
                onClick={() => setShowSubmitConfirmation(true)}
                className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Finish Test
              </button>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => {
                    setCurrentIdx(prev => Math.max(0, prev - 1));
                    setLastRunResult(null);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-sm hover:bg-zinc-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentIdx >= totalItems - 1}
                  onClick={() => {
                    setCurrentIdx(prev => Math.min(totalItems - 1, prev + 1));
                    setLastRunResult(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showExitConfirmation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-zinc-200"
            >
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Submit and Logout?</h3>
              <p className="text-zinc-500 mb-6">
                Logging out during an active test will submit your current answers and exit full-screen mode.
              </p>

              <div className="flex gap-3">
                <button 
                  disabled={isSubmitting}
                  onClick={() => setShowExitConfirmation(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Stay in Test
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={async () => {
                    setShowExitConfirmation(false);
                    await handleSubmit();
                    window.dispatchEvent(new Event('adhi-arena:test-submitted-for-logout'));
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : 'Submit & Logout'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSubmitConfirmation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-zinc-200"
            >
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Submit Test?</h3>
              <p className="text-zinc-500 mb-6">
                Are you sure you want to finish the test? You won't be able to change your answers after submitting.
              </p>
              
              <div className="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-500">Total Items</span>
                  <span className="font-bold text-zinc-900">{testDetails?.type === 'mcq' ? questions.length : (problems || []).length}</span>
                </div>
                {testDetails?.type === 'mcq' ? (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-500">Answered</span>
                      <span className="font-bold text-emerald-600">{Object.keys(answers).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Unanswered</span>
                      <span className="font-bold text-amber-600">{questions.length - Object.keys(answers).length}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Problems Attempted</span>
                    <span className="font-bold text-indigo-600">{Object.values(codingSolutions).filter(s => s.code.trim().length > 0).length}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitConfirmation(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowSubmitConfirmation(false);
                    handleSubmit();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Grading...
                    </>
                  ) : 'Confirm Submit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

const BankQuestionsManagement = () => {
  const { id } = useParams();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [bankDetails, setBankDetails] = useState<QuestionBank | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [newBankTitle, setNewBankTitle] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<BankQuestion | null>(null);
  const [showDeleteBankConfirm, setShowDeleteBankConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newQ, setNewQ] = useState({
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    image_url: '',
    explanation: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
    fetchBankDetails();
  }, [id]);

  const fetchBankDetails = async () => {
    const res = await fetch(`/api/question-banks/${id}`);
    if (res.ok) {
      const data = await res.json();
      setBankDetails(data);
      setNewBankTitle(data.title);
    }
  };

  const fetchQuestions = async () => {
    const res = await fetch(`/api/question-banks/${id}/questions`);
    const data = await res.json();
    setQuestions(data);
  };

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/question-banks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBankTitle })
      });
      if (res.ok) {
        setIsEditingBank(false);
        fetchBankDetails();
      }
    } catch (error) {
      console.error('Failed to update question bank:', error);
    }
  };

  const handleDeleteBank = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/question-banks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/admin');
      }
    } catch (error) {
      console.error('Failed to delete question bank:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteBankConfirm(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingQuestionId 
        ? `/api/bank-questions/${editingQuestionId}`
        : `/api/question-banks/${id}/questions`;
        
      const method = editingQuestionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: newQ.text,
          correct_option_index: newQ.correct,
          options: newQ.options,
          image_url: newQ.image_url,
          explanation: newQ.explanation
        })
      });
      
      if (res.ok) {
        setIsAdding(false);
        setNewQ({ text: '', options: ['', '', '', ''], correct: 0, image_url: '', explanation: '' });
        setEditingQuestionId(null);
        fetchQuestions();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save question");
      }
    } catch (error) {
      console.error("Save bank question error:", error);
      alert("Error saving question. The image might be too large.");
    }
  };

  const handleEditQuestion = (q: BankQuestion) => {
    setNewQ({
      text: q.question_text,
      options: q.options.map(o => o.option_text),
      correct: q.correct_option_index,
      image_url: q.image_url || '',
      explanation: q.explanation || ''
    });
    setEditingQuestionId(q.id);
    setIsAdding(true);
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bank-questions/${questionToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchQuestions();
        setQuestionToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete question");
      }
    } catch (error) {
      console.error('Failed to delete question:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
            {isEditingBank ? (
              <form onSubmit={handleUpdateBank} className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newBankTitle}
                  onChange={e => setNewBankTitle(e.target.value)}
                  className="px-3 py-1 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none text-xl"
                  autoFocus
                />
                <button type="submit" className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => { setIsEditingBank(false); setNewBankTitle(bankDetails?.title || ''); }} className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200">
                  <XCircle className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <>
                {bankDetails?.title || 'Manage Bank Questions'}
                <button onClick={() => setIsEditingBank(true)} className="text-zinc-400 hover:text-indigo-600 transition-colors" title="Edit Bank Title">
                  <Edit2 className="w-5 h-5" />
                </button>
              </>
            )}
          </h1>
          <p className="text-zinc-500 mt-1">MCQ Question Bank • {questions.length} Questions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowDeleteBankConfirm(true)}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-all shadow-sm border border-red-100"
            title="Delete Entire Bank"
          >
            <Trash2 className="w-5 h-5" />
            Delete Bank
          </button>
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingQuestionId(null);
              setNewQ({ text: '', options: ['', '', '', ''], correct: 0, image_url: '', explanation: '' });
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Add Question
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => (
          <div key={q.id} className="bg-white border border-zinc-200 rounded-xl p-6 relative group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Question {idx + 1}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEditQuestion(q)}
                  className="text-zinc-400 hover:text-indigo-600 transition-colors"
                  title="Edit Question"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setQuestionToDelete(q)}
                  className="text-zinc-400 hover:text-red-600 transition-colors"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-zinc-900 font-medium text-lg mb-6">{q.question_text}</p>
            {q.image_url && (
              <div className="mb-6">
                <img src={q.image_url} alt="Reference" className="max-w-full h-auto rounded-lg shadow-sm border border-zinc-200 max-h-48 object-contain" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, oIdx) => (
                <div 
                  key={opt.id}
                  className={cn(
                    "p-3 rounded-lg border text-sm flex items-center justify-between",
                    oIdx === q.correct_option_index 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium" 
                      : "bg-zinc-50 border-zinc-100 text-zinc-600"
                  )}
                >
                  <span>{opt.option_text}</span>
                  {oIdx === q.correct_option_index && <CheckCircle2 className="w-4 h-4" />}
                </div>
              ))}
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <div className="py-20 text-center bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl">
            <p className="text-zinc-400">No questions added yet. Click "Add Question" to begin.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDeleteBankConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Delete Question Bank?</h3>
                  <p className="text-zinc-500 text-sm">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-zinc-600 mb-8">
                Are you sure you want to delete this entire question bank? This will permanently delete all questions inside this bank.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteBankConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteBank}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Bank'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {questionToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete Question?</h2>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setQuestionToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteQuestion}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">
                {editingQuestionId ? 'Edit Bank Question' : 'Add New Bank Question'}
              </h2>
              <form onSubmit={handleAddQuestion} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Question Text</label>
                  <textarea 
                    required
                    value={newQ.text}
                    onChange={e => setNewQ({...newQ, text: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Enter the question here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Reference Image (Optional)</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewQ({...newQ, image_url: reader.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {newQ.image_url && (
                    <div className="mt-4 relative inline-block">
                      <img src={newQ.image_url} alt="Preview" className="h-32 rounded-lg border border-zinc-200 object-contain" />
                      <button 
                        type="button" 
                        onClick={() => setNewQ({ ...newQ, image_url: '' })}
                        className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full p-1 shadow-md hover:bg-red-50 border border-zinc-200"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-zinc-700">Options (Select the correct one)</label>
                  {newQ.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="correct"
                        checked={newQ.correct === idx}
                        onChange={() => setNewQ({...newQ, correct: idx})}
                        className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <input 
                        type="text" 
                        required
                        value={opt}
                        onChange={e => {
                          const newOpts = [...newQ.options];
                          newOpts[idx] = e.target.value;
                          setNewQ({...newQ, options: newOpts});
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Explanation (Optional)</label>
                  <textarea 
                    value={newQ.explanation}
                    onChange={e => setNewQ({...newQ, explanation: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                    placeholder="Provide an explanation for the correct answer..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Save Question
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResultDetailView = ({ student }: { student: User }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentTimestamp = useCurrentTimestamp();

  useEffect(() => {
    const fetchAllData = async () => {
      const studentIdStr = (student.student_id?.trim() || student.id.toString());
      setLoading(true);
      setError(null);
      // Clear previous states
      setTest(null);
      setResult(null);
      setQuestions([]);
      setProblems([]);

      try {
        // Fetch all tests and find current 
        const testsRes = await fetch('/api/tests');
        if (!testsRes.ok) throw new Error("Failed to fetch test details");
        const testsData = await testsRes.json();
        const currentTest = testsData.find((t: any) => 
          String(t.id) === String(testId) || 
          String(t._id) === String(testId) ||
          (t.title && t.title.toLowerCase().replace(/\s+/g, '-') === String(testId).toLowerCase())
        );
        
        if (!currentTest) {
          setError("Test not found");
          setLoading(false);
          return;
        }
        setTest(currentTest);

        // Fetch user results
        const resultsRes = await fetch(`/api/results?student_id=${encodeURIComponent(studentIdStr)}`);
        if (!resultsRes.ok) throw new Error("Failed to fetch results");
        const resultsData = await resultsRes.json();
        
        // Match result for this specific test
        const currentResult = resultsData.find((r: any) => String(r.test_id) === String(testId));
        if (!currentResult) {
          setError("No result found for this test");
          setLoading(false);
          return;
        }
        setResult(currentResult);

        // Fetch based on type
        const isCoding = currentTest.type === 'coding' || currentResult.test_type === 'coding' || (Array.isArray(currentResult.coding_details) && currentResult.coding_details.length > 0);
        
        if (isCoding) {
          const problemsRes = await fetch(`/api/tests/${testId}/problems`);
          if (problemsRes.ok) {
            const problemsData = await problemsRes.json();
            setProblems(Array.isArray(problemsData) ? problemsData : []);
          }
        } else {
          const questionsRes = await fetch(`/api/tests/${testId}/questions`);
          if (questionsRes.ok) {
            const questionsData = await questionsRes.json();
            setQuestions(Array.isArray(questionsData) ? questionsData : []);
          }
        }
      } catch (err: any) {
        console.error("Error in ResultDetailView:", err);
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      fetchAllData();
    }
  }, [testId, student.student_id, student.id, student.username]);

  const isTimeOver = useMemo(() => {
    return hasContestEnded(test?.end_time, currentTimestamp);
  }, [test?.end_time, currentTimestamp]);

  const studentAnswers = useMemo(() => {
    if (!result || !result.responses) return {};
    try {
      const resp = result.responses;
      if (typeof resp === 'string') {
        const firstPass = JSON.parse(resp);
        if (typeof firstPass === 'string') return JSON.parse(firstPass);
        return firstPass;
      }
      return resp;
    } catch (e) {
      console.error("Error parsing student answers:", e);
      return {};
    }
  }, [result]);

  const isCodingResult = useMemo(() => {
    if (!result) return false;
    if (result.test_type === 'coding') return true;
    if (Array.isArray(result.coding_details) && result.coding_details.length > 0) return true;
    if (test?.type === 'coding') return true;
    return false;
  }, [result, test]);

  const isMcqResult = !isCodingResult;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium">Crunching your scores...</p>
        </div>
      </div>
    );
  }

  if (error || !result || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2 font-sans">Wait a moment!</h2>
          <p className="text-zinc-600 mb-8 font-sans leading-relaxed">{error || "We couldn't find the results for this test. It might still be processing or was not submitted properly."}</p>
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  const stats = (isMcqResult && questions.length > 0) ? questions.reduce((acc, q) => {
    const selectedIdx = studentAnswers[q.id];
    if (selectedIdx === undefined) acc.skipped++;
    else if (selectedIdx === q.correct_option_index) acc.correct++;
    else acc.incorrect++;
    return acc;
  }, { correct: 0, incorrect: 0, skipped: 0 }) : null;

  const codingStats = isCodingResult ? (result.coding_details || []).reduce((acc, detail) => {
    const status = getCodingEvaluationStatus(detail);
    if (status === 'Accepted') acc.passed++;
    else if (status === 'Partially Accepted') acc.partial++;
    else acc.failed++;
    return acc;
  }, { passed: 0, partial: 0, failed: 0 }) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate('/student/dashboard')}
        className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">{test.title} - Results</h1>
            <p className="text-zinc-500">Completed on {new Date(result.completed_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-8">
            {isMcqResult && stats && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="px-3 py-1 bg-emerald-50 rounded-lg">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Correct</div>
                  <div className="text-lg font-bold text-emerald-700">{stats.correct}</div>
                </div>
                <div className="px-3 py-1 bg-red-50 rounded-lg">
                  <div className="text-xs font-bold text-red-600 uppercase tracking-wider">Wrong</div>
                  <div className="text-lg font-bold text-red-700">{stats.incorrect}</div>
                </div>
                <div className="px-3 py-1 bg-zinc-100 rounded-lg">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Skipped</div>
                  <div className="text-lg font-bold text-zinc-600">{stats.skipped}</div>
                </div>
              </div>
            )}
            {isCodingResult && codingStats && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="px-3 py-1 bg-emerald-50 rounded-lg">
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Passed</div>
                  <div className="text-lg font-bold text-emerald-700">{codingStats.passed}</div>
                </div>
                <div className="px-3 py-1 bg-amber-50 rounded-lg">
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Partial</div>
                  <div className="text-lg font-bold text-amber-700">{codingStats.partial}</div>
                </div>
                <div className="px-3 py-1 bg-red-50 rounded-lg">
                  <div className="text-xs font-bold text-red-600 uppercase tracking-wider">Failed</div>
                  <div className="text-lg font-bold text-red-700">{codingStats.failed}</div>
                </div>
              </div>
            )}
            <div className="h-12 w-px bg-zinc-200" />
            <div className="text-right">
              <div className="text-4xl font-bold text-indigo-600">{result.score}</div>
              <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Final Score</div>
            </div>
          </div>
        </div>
        {Boolean(test.negative_marks) && isMcqResult && (
          <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Negative marking was active for this test. Final score is capped at 0.
          </div>
        )}
      </div>

      <div className="space-y-8">
        {isMcqResult && questions.map((q, idx) => {
          const selectedIdx = studentAnswers[q.id];
          const isCorrect = selectedIdx === q.correct_option_index;

          return (
            <div key={q.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Question {idx + 1}</span>
                {selectedIdx === undefined ? (
                  <span className="text-xs font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">Not Answered</span>
                ) : isCorrect ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Correct
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Incorrect
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-zinc-900 mb-4">{q.question_text}</h3>
              
              {q.image_url && (
                <div className="mb-6 rounded-xl overflow-hidden border border-zinc-200">
                  <img src={q.image_url} alt="Question" className="max-w-full h-auto mx-auto" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {q.options.map((opt, oIdx) => {
                  const isSelected = selectedIdx === oIdx;
                  const isCorrectOption = q.correct_option_index === oIdx;
                  
                  let bgColor = "bg-zinc-50 border-zinc-200";
                  let textColor = "text-zinc-700";
                  let icon = null;

                  if (isCorrectOption) {
                    bgColor = "bg-emerald-50 border-emerald-200";
                    textColor = "text-emerald-700";
                    icon = <CheckCircle2 className="w-4 h-4" />;
                  } else if (isSelected && !isCorrect) {
                    bgColor = "bg-red-50 border-red-200";
                    textColor = "text-red-700";
                    icon = <XCircle className="w-4 h-4" />;
                  }

                  return (
                    <div 
                      key={opt.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        bgColor,
                        textColor
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="font-medium">{opt.option_text}</span>
                      </div>
                      {icon}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Explanation
                  </h4>
                  <p className="text-sm text-indigo-700 leading-relaxed whitespace-pre-wrap">
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {isCodingResult && (result.coding_details || []).map((detail, idx) => (
          <div key={detail.problem_id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Problem {idx + 1}</span>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {problems.find(p => p.id === detail.problem_id)?.title || detail.problem_title || 'Coding Problem'}
                  </h3>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-2",
                    getCodingEvaluationStatus(detail) === 'Accepted' ? "bg-emerald-100 text-emerald-700" :
                    getCodingEvaluationStatus(detail) === 'Partially Accepted' ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {getCodingEvaluationStatus(detail)}
                  </div>
                  <div className="text-sm font-bold text-zinc-500">
                    {detail.test_cases_passed} / {detail.total_test_cases} Cases Passed
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    Submitted Solution ({detail.language})
                  </h4>
                  <div className="bg-zinc-900 rounded-2xl p-6 font-mono text-sm text-zinc-300 overflow-x-auto relative group">
                    <pre className="whitespace-pre">{detail.solution_code}</pre>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(detail.solution_code);
                      }}
                      className="absolute top-4 right-4 p-2 bg-zinc-800 text-zinc-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                   <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-600" />
                      Test Case Details
                   </h4>
                   <CodingTestCaseResults 
                       testCaseResults={detail.test_case_results}
                       problems={problems}
                       problemId={detail.problem_id}
                       isTimeOver={isTimeOver}
                       isAdmin={false}
                   />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BankCodingProblemsManagement = () => {
  const { id } = useParams();
  const [problems, setProblems] = useState<BankCodingProblem[]>([]);
  const [bankDetails, setBankDetails] = useState<CodingQuestionBank | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [newBankTitle, setNewBankTitle] = useState('');
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [problemToDelete, setProblemToDelete] = useState<BankCodingProblem | null>(null);
  const [showDeleteBankConfirm, setShowDeleteBankConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newProblem, setNewProblem] = useState({
    title: '',
    description: '',
    constraints: '',
    input_format: '',
    output_format: '',
    sample_input: '',
    sample_output: '',
    test_cases: [] as TestCase[]
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProblems();
    fetchBankDetails();
  }, [id]);

  const fetchBankDetails = async () => {
    const res = await fetch(`/api/coding-banks/${id}`);
    if (res.ok) {
      const data = await res.json();
      setBankDetails(data);
      setNewBankTitle(data.title);
    }
  };

  const fetchProblems = async () => {
    const res = await fetch(`/api/coding-banks/${id}/problems`);
    const data = await res.json();
    setProblems(data);
  };

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/coding-banks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newBankTitle })
      });
      if (res.ok) {
        setIsEditingBank(false);
        fetchBankDetails();
      }
    } catch (error) {
      console.error('Failed to update coding bank:', error);
    }
  };

  const handleDeleteBank = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/coding-banks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/admin');
      }
    } catch (error) {
      console.error('Failed to delete coding bank:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteBankConfirm(false);
    }
  };

  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProblemId 
      ? `/api/bank-coding-problems/${editingProblemId}` 
      : `/api/coding-banks/${id}/problems`;
    const method = editingProblemId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProblem)
    });

    if (res.ok) {
      setIsAdding(false);
      setEditingProblemId(null);
      setNewProblem({
        title: '', description: '', constraints: '', input_format: '', output_format: '',
        sample_input: '', sample_output: '', test_cases: []
      });
      fetchProblems();
    }
  };

  const addTestCase = () => {
    setNewProblem({
      ...newProblem,
      test_cases: [...newProblem.test_cases, { id: Math.random().toString(36).substr(2, 9), input: '', expected_output: '', is_hidden: false }]
    });
  };

  const updateTestCase = (tcId: string, field: keyof TestCase, value: any) => {
    setNewProblem({
      ...newProblem,
      test_cases: newProblem.test_cases.map(tc => tc.id === tcId ? { ...tc, [field]: value } : tc)
    });
  };

  const removeTestCase = (tcId: string) => {
    setNewProblem({
      ...newProblem,
      test_cases: newProblem.test_cases.filter(tc => tc.id !== tcId)
    });
  };

  const handleEditProblem = (p: BankCodingProblem) => {
    setNewProblem({
      title: p.title,
      description: p.description,
      constraints: p.constraints,
      input_format: p.input_format,
      output_format: p.output_format,
      sample_input: p.sample_input,
      sample_output: p.sample_output,
      test_cases: p.test_cases || []
    });
    setEditingProblemId(p.id);
    setIsAdding(true);
  };

  const handleDeleteProblem = async () => {
    if (!problemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bank-coding-problems/${problemToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProblems();
        setProblemToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete problem");
      }
    } catch (error) {
      console.error('Failed to delete problem:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!bankDetails) return <div className="p-8 text-center text-zinc-500">
    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
    Loading bank details...
  </div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <button 
            onClick={() => navigate('/admin')}
            className="text-sm text-zinc-500 hover:text-indigo-600 flex items-center gap-1 mb-2 transition-colors font-medium outline-none"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Banks
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{bankDetails.title}</h1>
            <button 
              onClick={() => setIsEditingBank(true)}
              className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shadow-sm bg-white border border-zinc-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-zinc-500 mt-1 font-medium italic">Coding Question Bank • {problems.length} Problems</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search bank problems..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowDeleteBankConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all shadow-sm"
          >
            <Trash2 className="w-5 h-5 shadow-sm" />
            Delete Bank
          </button>
          <button 
            onClick={() => {
              setEditingProblemId(null);
              setNewProblem({
                title: '', description: '', constraints: '', input_format: '', output_format: '',
                sample_input: '', sample_output: '', test_cases: []
              });
              setIsAdding(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <PlusCircle className="w-5 h-5" />
            Add Problem
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredProblems.map((p, idx) => (
          <div key={p.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500">
                  {idx + 1}
                </span>
                <h3 className="text-xl font-bold text-zinc-900">{p.title}</h3>
              </div>
              <div className="flex gap-2 text-zinc-400">
                <button 
                  onClick={() => handleEditProblem(p)}
                  className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setProblemToDelete(p)}
                  className="p-2 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <p className="text-zinc-600 mb-6 leading-relaxed line-clamp-2">{p.description}</p>
            
            <div className="flex flex-wrap gap-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-emerald-500" />
                {p.test_cases?.length || 0} Test Cases
              </div>
            </div>
          </div>
        ))}

        {problems.length === 0 && (
          <div className="py-20 text-center bg-white border-2 border-dashed border-zinc-200 rounded-3xl">
            <Code2 className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900">This bank is empty</h3>
            <p className="text-zinc-500 mt-2 mb-8">Start adding coding problems to build your repository.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <PlusCircle className="w-5 h-5" />
              Add First Problem
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl font-sans"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-zinc-900">{editingProblemId ? 'Edit Problem' : 'Add New Problem'}</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-100 rounded-full"><XCircle className="w-6 h-6 text-zinc-400" /></button>
              </div>
              
              <form onSubmit={handleSaveProblem} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Problem Title</label>
                      <input 
                        type="text" required value={newProblem.title}
                        onChange={e => setNewProblem({...newProblem, title: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none transition-all"
                        placeholder="e.g. Factorial of a Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Problem Description</label>
                      <textarea 
                        required value={newProblem.description}
                        onChange={e => setNewProblem({...newProblem, description: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-32 resize-none transition-all"
                        placeholder="Describe the problem details..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Input Format</label>
                        <textarea 
                          value={newProblem.input_format}
                          onChange={e => setNewProblem({...newProblem, input_format: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Output Format</label>
                        <textarea 
                          value={newProblem.output_format}
                          onChange={e => setNewProblem({...newProblem, output_format: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">Constraints</label>
                      <textarea 
                        value={newProblem.constraints}
                        onChange={e => setNewProblem({...newProblem, constraints: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Sample Input</label>
                        <textarea 
                          value={newProblem.sample_input}
                          onChange={e => setNewProblem({...newProblem, sample_input: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Sample Output</label>
                        <textarea 
                          value={newProblem.sample_output}
                          onChange={e => setNewProblem({...newProblem, sample_output: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none h-24 resize-none transition-all font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">Test Cases</h3>
                      <p className="text-sm text-zinc-500">Add hidden test cases to verify student solutions.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={addTestCase}
                      className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-zinc-800 transition-all"
                    >
                      <PlusCircle className="w-5 h-5" /> Add Case
                    </button>
                  </div>

                  <div className="space-y-4">
                    {newProblem.test_cases.map((tc, tcIdx) => (
                      <div key={tc.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl relative group">
                        <button 
                          type="button"
                          onClick={() => removeTestCase(tc.id)}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-zinc-200 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50 hover:border-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Input</label>
                            <textarea 
                              value={tc.input}
                              onChange={e => updateTestCase(tc.id, 'input', e.target.value)}
                              className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 bg-white outline-none h-24 resize-none font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Expected Output</label>
                            <textarea 
                              value={tc.expected_output}
                              onChange={e => updateTestCase(tc.id, 'expected_output', e.target.value)}
                              className="w-full px-4 py-2 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 bg-white outline-none h-24 resize-none font-mono text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                           <input 
                             type="checkbox" 
                             id={`hidden-${tc.id}`}
                             checked={tc.is_hidden}
                             onChange={e => updateTestCase(tc.id, 'is_hidden', e.target.checked)}
                             className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                           />
                           <label htmlFor={`hidden-${tc.id}`} className="text-sm font-medium text-zinc-600 select-none cursor-pointer">
                             Hidden Test Case (revealed to students after the contest ends)
                           </label>
                        </div>
                      </div>
                    ))}
                    {newProblem.test_cases.length === 0 && (
                      <div className="text-center py-10 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                        No test cases added yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-8 sticky bottom-0 bg-white pb-2 border-t border-zinc-100">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-all border-2 border-transparent"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-4 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    {editingProblemId ? 'Update Problem' : 'Create Problem'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isEditingBank && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-900 mb-6 font-sans">Rename Bank</h2>
              <form onSubmit={handleUpdateBank} className="space-y-4 font-sans">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">Bank Title</label>
                  <input 
                    type="text" required autoFocus
                    value={newBankTitle}
                    onChange={e => setNewBankTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-zinc-200 border-2 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditingBank(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {problemToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete Problem?</h2>
              <p className="text-zinc-600 mb-6">
                Are you sure you want to delete "{problemToDelete.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setProblemToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteProblem}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Problem'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteBankConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">Delete Entire Bank?</h2>
              <p className="text-zinc-600 mb-6">
                This will delete "{bankDetails.title}" and all {problems.length} problems it contains. This action CANNOT be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteBankConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteBank}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm flex justify-center items-center"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isChangingOwnPassword, setIsChangingOwnPassword] = useState(false);
  const [newOwnPassword, setNewOwnPassword] = useState('');
  const [showNetworkPanel, setShowNetworkPanel] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [appVersion, setAppVersion] = useState('');
  const pendingTestLogoutRef = useRef(false);

  useEffect(() => {
    const unsubscribe = window.adhiArena?.updates.onStatus(setUpdateStatus);
    window.adhiArena?.updates.getVersion().then(setAppVersion).catch(() => undefined);
    return () => unsubscribe?.();
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    if (user?.role === 'student' && window.location.pathname.includes('/student/test/')) {
      pendingTestLogoutRef.current = true;
      window.dispatchEvent(new Event('adhi-arena:request-test-logout'));
      return;
    }
    setUser(null);
  };

  useEffect(() => {
    const completeTestLogout = () => {
      if (!pendingTestLogoutRef.current) return;
      pendingTestLogoutRef.current = false;
      setUser(null);
    };

    window.addEventListener('adhi-arena:test-submitted-for-logout', completeTestLogout);
    return () => window.removeEventListener('adhi-arena:test-submitted-for-logout', completeTestLogout);
  }, []);

  const handleCheckUpdates = async () => {
    if (!window.adhiArena?.updates) {
      alert('Update checks are available in the installed ADHI ARENA application.');
      return;
    }

    if (['checking', 'downloading', 'installing'].includes(updateStatus.state)) return;

    if (updateStatus.state === 'downloaded') {
      setUpdateStatus(prev => ({ ...prev, state: 'installing' }));
      const result = await window.adhiArena.updates.install();
      if (!result.ok && result.message) {
        setUpdateStatus({ state: 'downloaded', version: updateStatus.version, message: result.message });
        alert(result.message);
      }
      return;
    }

    if (['available', 'deferred'].includes(updateStatus.state)) {
      setUpdateStatus(prev => ({ ...prev, state: 'downloading', percent: 0 }));
      const result = await window.adhiArena.updates.download();
      if (!result.ok && result.message) {
        setUpdateStatus({ state: 'available', version: updateStatus.version, message: result.message });
        alert(result.message);
      }
      return;
    }

    setUpdateStatus({ state: 'checking' });
    const result = await window.adhiArena.updates.check();
    if (!result.ok && result.message) {
      setUpdateStatus({ state: 'error', message: result.message });
      alert(result.message);
    }
  };

  const handleOwnPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, newPassword: newOwnPassword })
    });

    if (res.ok) {
      setIsChangingOwnPassword(false);
      setNewOwnPassword('');
      alert('Password updated successfully');
    } else {
      alert('Failed to update password');
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 flex flex-col">
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          onChangePassword={() => setIsChangingOwnPassword(true)}
          onOpenNetwork={() => setShowNetworkPanel(true)}
          onCheckUpdates={handleCheckUpdates}
          updateStatus={updateStatus}
          appVersion={appVersion}
        />
        
        <main className="flex-1">
          {!user ? (
            <LoginView onLogin={handleLogin} />
          ) : (
            <Routes>
              {user.role === 'admin' ? (
                <>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/test/:id" element={<TestManagement />} />
                  <Route path="/admin/banks/:id" element={<BankQuestionsManagement />} />
                  <Route path="/admin/coding-banks/:id" element={<BankCodingProblemsManagement />} />
                  <Route path="*" element={<AdminDashboard />} />
                </>
              ) : (
                <>
                  <Route path="/student" element={<StudentDashboard student={user} />} />
                  <Route path="/student/test/:id" element={<TestSession student={user} />} />
                  <Route path="/student/results/:testId" element={<ResultDetailView student={user} />} />
                  <Route path="*" element={<StudentDashboard student={user} />} />
                </>
              )}
            </Routes>
          )}
        </main>

        <AnimatePresence>
          {isChangingOwnPassword && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"
              >
                <h2 className="text-2xl font-bold text-zinc-900 mb-6">Change Your Password</h2>
                <form onSubmit={handleOwnPasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">New Password</label>
                    <input 
                      type="password" 
                      required
                      autoFocus
                      value={newOwnPassword}
                      onChange={e => setNewOwnPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsChangingOwnPassword(false);
                        setNewOwnPassword('');
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <NetworkPanel open={showNetworkPanel} onClose={() => setShowNetworkPanel(false)} />
      </div>
    </Router>
  );
}
