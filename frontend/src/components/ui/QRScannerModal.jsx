import React, { useEffect, useState, useMemo } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, AlertCircle } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
    const [error, setError] = useState('');
    
    // Generate a unique ID for this instance to prevent DOM conflicts between routes
    const readerId = useMemo(() => `qr-reader-${Math.random().toString(36).substr(2, 9)}`, []);

    useEffect(() => {
        if (!isOpen) return;

        let scanner = null;

        const initScanner = () => {
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                rememberLastUsedCamera: true,
            };

            scanner = new Html5QrcodeScanner(readerId, config, false);

            scanner.render(
                (decodedText) => {
                    // Do NOT call scanner.clear() here. 
                    // onScanSuccess sets isOpen to false in the parent, which triggers the useEffect cleanup.
                    onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    if (!errorMessage?.includes('NotFound')) {
                        console.log(errorMessage);
                    }
                }
            );
        };

        // Timeout ensures the modal animation finishes and the div is mounted
        const timer = setTimeout(initScanner, 300);

        return () => {
            clearTimeout(timer);
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isOpen, onScanSuccess, readerId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">Scan Application QR Pass</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm font-medium text-slate-600 mb-4 text-center">
                        Position the QR code within the frame to automatically load the application.
                    </p>
                    
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex gap-3 text-sm font-medium">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="rounded-2xl overflow-hidden border-2 border-indigo-100 bg-slate-900 min-h-[250px]">
                        <div id={readerId} className="w-full h-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
