import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import RoomMatrix from '../dashboard/RoomMatrix';
import ActiveRegistry from './ActiveRegistry';
import PricingLedger from './PricingLedger';

export default function RoomsTab({
    rooms,
    activeRoomId,
    setActiveRoomId,
    selectedRoom,
    now,
    userRole,
    handleMarkAsCleaned,
    handleCheckOutStay,
    handleOpenTransfer,
    handleSendToCleaning,
    handleOpenHistory,
    handleCheckInGuest,
    handlePreviewBill,
    timeline,
    totalBill
}) {
    return (
        <div className="flex flex-col gap-6 w-full font-sans">
            {/* TOP PANEL: Room Navigation Matrix */}
            <RoomMatrix 
                rooms={rooms} 
                activeRoomIds={[activeRoomId]} 
                onRoomClick={setActiveRoomId} 
                now={now} 
            />

            {/* BOTTOM PANEL: Reception Operations & Dynamic Invoice Engine */}
            <div className="w-full space-y-6">

                {/* Cleaning Banner */}
                {selectedRoom?.status === 'CLEANING' && (
                    <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/30 text-center animate-fade-in mb-6">
                        <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Room is currently in Cleaning</h2>
                        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">This room was recently vacated and is being serviced by housekeeping. Mark it as clean to return it to the available pool.</p>
                        <button 
                            onClick={() => handleMarkAsCleaned(selectedRoom.roomId)}
                            className="bg-amber-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors shadow-md text-sm animate-pulse-subtle"
                        >
                            Mark as Cleaned & Available
                        </button>
                    </div>
                )}

                {/* Operations & Registry Grid */}
                {selectedRoom && (
                    <>
                        <ActiveRegistry 
                            selectedRoom={selectedRoom}
                            now={now}
                            userRole={userRole}
                            onCheckOutStay={handleCheckOutStay}
                            onOpenTransfer={handleOpenTransfer}
                            onSendToCleaning={handleSendToCleaning}
                            onOpenHistory={handleOpenHistory}
                            onCheckInGuest={handleCheckInGuest}
                            onPreviewBill={handlePreviewBill}
                        />

                        <PricingLedger 
                            selectedRoom={selectedRoom}
                            timeline={timeline}
                            totalBill={totalBill}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
