'use client';

import { StoreSettings } from "@/types";
import { X } from "lucide-react";
import { useState } from "react";

export default function AnnouncementBar({ settings }: { settings: StoreSettings }) {
    const [isVisible, setIsVisible] = useState(true);

    if (!settings.announcementEnabled || !isVisible || !settings.announcementText) {
        return null;
    }

    return (
        <div className="bg-rudark-volt text-black py-2 px-4 relative z-[60] text-center font-condensed font-bold uppercase tracking-widest text-sm flex items-center justify-center">
            <span className="flex-1">{settings.announcementText}</span>
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-4 p-1 hover:bg-black/10 rounded-full transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
}
