'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

// Dialog Types
type DialogVariant = 'confirm' | 'alert' | 'success' | 'error' | 'warning';

interface DialogOptions {
    title: string;
    message: string;
    variant?: DialogVariant;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
}

interface DialogContextType {
    confirm: (options: Omit<DialogOptions, 'variant'>) => Promise<boolean>;
    alert: (options: Omit<DialogOptions, 'variant' | 'cancelText'>) => Promise<void>;
    success: (message: string, title?: string) => Promise<void>;
    error: (message: string, title?: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialogState, setDialogState] = useState<(DialogOptions & { isOpen: boolean }) | null>(null);
    const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

    const closeDialog = useCallback((confirmed: boolean) => {
        if (resolvePromise) {
            resolvePromise(confirmed);
            setResolvePromise(null);
        }
        setDialogState(null);
    }, [resolvePromise]);

    const confirm = useCallback((options: Omit<DialogOptions, 'variant'>) => {
        return new Promise<boolean>((resolve) => {
            setDialogState({
                ...options,
                variant: 'confirm',
                isOpen: true,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel'
            });
            setResolvePromise(() => resolve);
        });
    }, []);

    const alert = useCallback((options: Omit<DialogOptions, 'variant' | 'cancelText'>) => {
        return new Promise<void>((resolve) => {
            setDialogState({
                ...options,
                variant: 'alert',
                isOpen: true,
                confirmText: options.confirmText || 'OK'
            });
            setResolvePromise(() => () => resolve());
        });
    }, []);

    const success = useCallback((message: string, title = 'Success') => {
        return new Promise<void>((resolve) => {
            setDialogState({
                title,
                message,
                variant: 'success',
                isOpen: true,
                confirmText: 'OK'
            });
            setResolvePromise(() => () => resolve());
        });
    }, []);

    const error = useCallback((message: string, title = 'Error') => {
        return new Promise<void>((resolve) => {
            setDialogState({
                title,
                message,
                variant: 'error',
                isOpen: true,
                confirmText: 'OK'
            });
            setResolvePromise(() => () => resolve());
        });
    }, []);

    return (
        <DialogContext.Provider value={{ confirm, alert, success, error }}>
            {children}
            {dialogState?.isOpen && (
                <DialogComponent
                    {...dialogState}
                    onClose={(confirmed) => {
                        if (confirmed && dialogState.onConfirm) {
                            dialogState.onConfirm();
                        } else if (!confirmed && dialogState.onCancel) {
                            dialogState.onCancel();
                        }
                        closeDialog(confirmed);
                    }}
                />
            )}
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within DialogProvider');
    }
    return context;
}

// Dialog Component
function DialogComponent({
    title,
    message,
    variant = 'confirm',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onClose
}: DialogOptions & { isOpen: boolean; onClose: (confirmed: boolean) => void }) {

    const icons = {
        confirm: <AlertTriangle className="w-6 h-6" />,
        alert: <Info className="w-6 h-6" />,
        success: <CheckCircle className="w-6 h-6" />,
        error: <AlertCircle className="w-6 h-6" />,
        warning: <AlertTriangle className="w-6 h-6" />
    };

    const headerStyles = {
        confirm: 'bg-rudark-volt text-black',
        alert: 'bg-blue-600 text-white',
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-orange-600 text-white'
    };

    const showCancel = variant === 'confirm';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] animate-[fadeIn_0.2s_ease-out]"
                onClick={() => onClose(false)}
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-rudark-carbon border-2 border-rudark-grey rounded-sm shadow-2xl w-full max-w-md pointer-events-auto animate-[scaleIn_0.3s_ease-out]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`${headerStyles[variant]} px-6 py-4 flex items-center gap-3`}>
                        {icons[variant]}
                        <h2 className="font-condensed font-bold text-xl uppercase tracking-wide flex-1">
                            {title}
                        </h2>
                        <button
                            onClick={() => onClose(false)}
                            className="hover:opacity-70 transition-opacity"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6">
                        <p className="text-white text-base leading-relaxed whitespace-pre-line">
                            {message}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-rudark-grey flex justify-end gap-3">
                        {showCancel && (
                            <button
                                onClick={() => onClose(false)}
                                className="px-6 py-2 bg-transparent border-2 border-rudark-grey text-white hover:border-rudark-volt hover:text-rudark-volt transition-colors font-condensed uppercase tracking-wider text-sm rounded-sm"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={() => onClose(true)}
                            className="px-6 py-2 bg-rudark-volt text-black hover:bg-white transition-colors font-condensed font-bold uppercase tracking-wider text-sm rounded-sm"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// Add animations to globals.css
export const dialogAnimations = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
`;
