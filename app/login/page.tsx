'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { app, initError } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { checkTotpEnabled, verifyTotp } from '@/actions/totp-actions';
import { createSession } from '@/actions/session-actions';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpToken, setTotpToken] = useState('');
    const [showTotpChallenge, setShowTotpChallenge] = useState(false);
    const [pendingUid, setPendingUid] = useState<string | null>(null);
    const [pendingIdToken, setPendingIdToken] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!app) {
            setError(initError || 'System Configuration Error: Firebase not initialized.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const auth = getAuth(app);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            const idToken = await userCredential.user.getIdToken();

            // Check if 2FA is enabled for this user
            const is2faEnabled = await checkTotpEnabled(uid);

            if (is2faEnabled) {
                setPendingUid(uid);
                setPendingIdToken(idToken);
                setShowTotpChallenge(true);
                setLoading(false);
            } else {
                const result = await createSession(idToken);
                if (result.success) {
                    router.push('/admin');
                } else {
                    setError('Session creation failed. Please try again.');
                    setLoading(false);
                }
            }
        } catch (err: any) {
            console.error(err);
            setError('Invalid credentials. Access denied.');
            setLoading(false);
        }
    };

    const handleTotpVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingUid || !totpToken || !pendingIdToken) return;

        setLoading(true);
        setError('');

        const isValid = await verifyTotp(pendingUid, totpToken);

        if (isValid) {
            const result = await createSession(pendingIdToken);
            if (result.success) {
                router.push('/admin');
            } else {
                setError('Session creation failed. Please try again.');
                setLoading(false);
            }
        } else {
            setError('Invalid 2FA code. Please try again.');
            setLoading(false);
        }
    };

    if (!app) {
        return (
            <div className="min-h-screen bg-rudark-matte flex items-center justify-center p-4">
                <div className="bg-red-900/20 text-red-400 p-8 border border-red-900 rounded-sm max-w-md text-center">
                    <AlertCircle size={48} className="mx-auto mb-4" />
                    <h1 className="text-xl font-bold uppercase mb-2">System Error</h1>
                    <p className="font-mono text-sm mb-4">{initError || "Firebase API Keys are missing."}</p>
                    <div className="text-xs bg-black/50 p-4 rounded text-left overflow-x-auto">
                        {initError ? "Please check console or .env.local" : "Please configure .env.local"}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-rudark-matte flex flex-col items-center justify-center p-4">

            <div className="mb-8 text-center">
                <img src="/logo.png" alt="Rud'Ark" className="h-24 mx-auto mb-4 opacity-80" />
                <h1 className="text-3xl font-condensed font-bold text-white uppercase tracking-widest">
                    Command <span className="text-rudark-volt">Center</span>
                </h1>
            </div>

            <div className="w-full max-w-md bg-rudark-carbon border border-rudark-grey p-8 rounded-sm shadow-2xl relative overflow-hidden group">
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-rudark-volt opacity-50" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-rudark-volt opacity-50" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-rudark-volt opacity-50" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-rudark-volt opacity-50" />

                {!showTotpChallenge ? (
                    <form onSubmit={handleLogin} className="space-y-6">

                        {error && (
                            <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-sm flex items-center gap-2 text-sm font-mono">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs text-rudark-volt font-mono uppercase tracking-wider">Officer ID (Email)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-mono transition-colors"
                                placeholder="admin@rudark.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-rudark-volt font-mono uppercase tracking-wider">Passcode</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-mono transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-rudark-volt text-black font-condensed font-bold uppercase py-3 hover:bg-white transition-colors flex items-center justify-center gap-2 tracking-widest disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : 'Authorize Access'}
                            {!loading && <Lock size={16} />}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleTotpVerify} className="space-y-6 text-center">
                        <div className="bg-rudark-volt/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-rudark-volt/20">
                            <ShieldCheck className="text-rudark-volt" size={32} />
                        </div>
                        
                        <div>
                            <h2 className="text-white font-bold uppercase tracking-widest">2FA Verification</h2>
                            <p className="text-xs text-gray-500 mt-1">Enter the 6-digit security code from your authentication app.</p>
                        </div>

                        {error && (
                            <div className="bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-sm flex items-center gap-2 text-sm font-mono text-left">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <input
                                type="text"
                                maxLength={6}
                                value={totpToken}
                                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-rudark-matte text-white px-4 py-4 border border-rudark-grey focus:border-rudark-volt focus:outline-none font-mono text-2xl text-center tracking-[0.5em] transition-colors"
                                placeholder="000000"
                                required
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || totpToken.length !== 6}
                            className="w-full bg-rudark-volt text-black font-condensed font-bold uppercase py-3 hover:bg-white transition-colors flex items-center justify-center gap-2 tracking-widest disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Enter'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowTotpChallenge(false); setTotpToken(''); }}
                            className="text-[10px] text-gray-600 uppercase font-mono hover:text-gray-400"
                        >
                            ← Back to Credentials
                        </button>
                    </form>
                )}
            </div>

            <p className="mt-8 text-gray-600 text-[10px] font-mono uppercase tracking-widest">
                Restricted Area • Authorized Personnel Only
            </p>

        </div>
    );
}
