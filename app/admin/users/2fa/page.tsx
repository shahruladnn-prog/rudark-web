'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { generateTotpSecret, verifyTotp, enableTotp } from '@/actions/totp-actions';
import { useToast } from '@/components/ui/toast';
import { Shield, Smartphone, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function TwoFactorSetupPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [qrData, setQrData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
    const [token, setToken] = useState('');
    const [enabled, setEnabled] = useState(false);

    const handleGenerate = async () => {
        if (!user) return;
        setLoading(true);
        const res = await generateTotpSecret(user.uid);
        setLoading(false);

        if (res.success) {
            setQrData({ secret: res.secret!, qrDataUrl: res.qrDataUrl! });
        } else {
            showToast('error', res.error || 'Failed to generate secret');
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !token) return;

        setVerifying(true);
        const isValid = await verifyTotp(user.uid, token);
        
        if (isValid) {
            const res = await enableTotp(user.uid);
            setVerifying(false);
            if (res.success) {
                setEnabled(true);
                showToast('success', '2FA enabled successfully!');
            } else {
                showToast('error', res.error || 'Failed to enable 2FA');
            }
        } else {
            setVerifying(false);
            showToast('error', 'Invalid code. Please try again.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="mb-8">
                <Link href="/admin" className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm mb-4">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rudark-volt/10 text-rudark-volt rounded-lg">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
                        <p className="text-gray-500 text-sm">Secure your Command Center access</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                {!qrData && !enabled ? (
                    <div className="text-center py-10">
                        <Smartphone size={64} className="mx-auto text-gray-300 mb-6" />
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Protect Your Account</h2>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            Add an extra layer of security by requiring a code from your authentication app (Google Authenticator, Authy, etc.) when you log in.
                        </p>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="bg-black text-white px-8 py-3 rounded-sm font-bold uppercase tracking-widest hover:bg-rudark-volt hover:text-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Begin Setup'}
                        </button>
                    </div>
                ) : enabled ? (
                    <div className="text-center py-10">
                        <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-6" />
                        <h2 className="text-lg font-bold text-gray-900 mb-2">2FA is Enabled</h2>
                        <p className="text-gray-500 mb-8">
                            Your account is now protected with two-factor authentication. 
                            You will be prompted for a code each time you log in.
                        </p>
                        <Link
                            href="/admin"
                            className="inline-block border border-gray-200 px-8 py-3 rounded-sm font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="bg-white p-2 border-4 border-gray-100 rounded-lg shrink-0">
                                <img src={qrData?.qrDataUrl} alt="QR Code" className="w-48 h-48" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900">1. Scan this QR Code</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Open your authenticator app and scan the code. 
                                    If you can't scan, use this manual key:
                                </p>
                                <div className="bg-gray-50 p-3 rounded font-mono text-sm border border-gray-100 break-all">
                                    {qrData?.secret}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4">2. Verify Setup</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Enter the 6-digit code from your app to confirm it's working correctly.
                            </p>
                            <form onSubmit={handleVerify} className="flex gap-4">
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded px-4 py-3 font-mono text-xl tracking-[0.5em] text-center focus:outline-none focus:border-rudark-volt"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={verifying || token.length !== 6}
                                    className="bg-black text-white px-8 rounded-sm font-bold uppercase tracking-widest hover:bg-rudark-volt hover:text-black transition-colors disabled:opacity-50"
                                >
                                    {verifying ? 'Verifying...' : 'Enable 2FA'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                <Shield size={20} className="shrink-0" />
                <p>
                    <strong>Security Note:</strong> Store your recovery codes safely. If you lose access to your authenticator app, you will need them to regain access to your account.
                </p>
            </div>
        </div>
    );
}
