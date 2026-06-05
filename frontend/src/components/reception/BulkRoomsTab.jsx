import React, { useState, useEffect } from 'react';
import { Users, Calendar, DoorOpen, Plus, UserPlus, CheckCircle, Clock } from 'lucide-react';
import { receptionService } from '../../services/reception.service';

const BulkRoomsTab = ({ allRooms }) => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState(null);
    
    // Create block form
    const [createForm, setCreateForm] = useState({ arrival: '', departure: '', purpose: '', room_ids: [] });
    // Check-in form
    const [checkInForm, setCheckInForm] = useState({ roomId: '', guest_name: '', email: '', phone: '', gender: 'Male', age: '', identity_proof_type: 'Aadhar', identity_proof_number: '', departure_datetime: '' });

    const loadBlocks = async () => {
        try {
            setLoading(true);
            const res = await receptionService.getActiveBulkBlocks();
            if (res.success) setBlocks(res.data);
        } catch (err) {
            setError(err.message || 'Failed to load bulk blocks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBlocks();
    }, []);

    const handleCreateBlock = async (e) => {
        e.preventDefault();
        try {
            await receptionService.createBulkBlock({
                arrival_datetime: createForm.arrival,
                departure_datetime: createForm.departure,
                purpose_of_visit: createForm.purpose,
                room_ids: createForm.room_ids
            });
            setIsCreateModalOpen(false);
            setCreateForm({ arrival: '', departure: '', purpose: '', room_ids: [] });
            loadBlocks();
        } catch (err) {
            alert('Failed to create block: ' + err.message);
        }
    };

    const handleCheckInGuest = async (e) => {
        e.preventDefault();
        try {
            await receptionService.checkInBulkGuest(selectedBlock.booking_id, checkInForm.roomId, checkInForm);
            setIsCheckInModalOpen(false);
            loadBlocks();
        } catch (err) {
            alert('Failed to check in guest: ' + err.message);
        }
    };

    const toggleRoomSelection = (roomId) => {
        setCreateForm(prev => {
            const isSelected = prev.room_ids.includes(roomId);
            return {
                ...prev,
                room_ids: isSelected ? prev.room_ids.filter(id => id !== roomId) : [...prev.room_ids, roomId]
            };
        });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Bulk Rooms Management</h2>
                    <p className="text-gray-500">Block rooms for conferences and manage walk-ins within blocks.</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center shadow-sm"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Bulk Block
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-6">{error}</div>}

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
            ) : blocks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <DoorOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No Active Blocks</h3>
                    <p className="text-gray-500">Create a bulk block to reserve a group of rooms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {blocks.map(block => (
                        <div key={block.booking_id} className="bg-white rounded-xl shadow-sm border p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Block {block.booking_id.split('-')[0].toUpperCase()}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        {new Date(block.arrival_datetime).toLocaleDateString()} to {new Date(block.departure_datetime).toLocaleDateString()}
                                    </div>
                                </div>
                                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                    {block.rooms_required} Rooms Blocked
                                </span>
                            </div>
                            
                            <div className="mb-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Allocated Rooms</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(block.allocated_rooms || []).map(r => (
                                        <div key={r.room_id} className={`px-2 py-1 rounded border text-sm font-medium ${r.current_status === 'occupied' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                            {r.room_number} {r.current_status === 'occupied' ? '(Occupied)' : '(Free)'}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t flex justify-between items-center">
                                <button className="text-blue-600 text-sm font-medium hover:underline">Edit Duration</button>
                                <button 
                                    onClick={() => {
                                        setSelectedBlock(block);
                                        setCheckInForm(prev => ({ ...prev, departure_datetime: block.departure_datetime.split('T')[0] + 'T12:00' }));
                                        setIsCheckInModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm transition-colors flex items-center"
                                >
                                    <UserPlus className="h-4 w-4 mr-2" /> Walk-in Check-in
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Block Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">Create Bulk Block</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleCreateBlock}>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                        <input type="datetime-local" required className="w-full border rounded-lg px-3 py-2" value={createForm.arrival} onChange={e => setCreateForm({...createForm, arrival: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                        <input type="datetime-local" required className="w-full border rounded-lg px-3 py-2" value={createForm.departure} onChange={e => setCreateForm({...createForm, departure: e.target.value})} />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Group Name</label>
                                    <input type="text" required placeholder="e.g. Science Conference 2026" className="w-full border rounded-lg px-3 py-2" value={createForm.purpose} onChange={e => setCreateForm({...createForm, purpose: e.target.value})} />
                                </div>
                                
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Rooms to Block</label>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                                        {(allRooms || []).map(r => (
                                            <button 
                                                type="button"
                                                key={r.room_id}
                                                onClick={() => toggleRoomSelection(r.room_id)}
                                                className={`py-2 px-1 text-center rounded text-sm font-bold border transition-colors ${createForm.room_ids.includes(r.room_id) ? 'bg-blue-600 text-white border-blue-600 shadow-inner' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                                            >
                                                {r.roomNumber}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">{createForm.room_ids.length} rooms selected</p>
                                </div>

                                <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Block Rooms</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Check-In Walk-in Modal */}
            {isCheckInModalOpen && selectedBlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">Walk-in Check-in</h3>
                            <button onClick={() => setIsCheckInModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleCheckInGuest}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Room from Block</label>
                                    <select required className="w-full border rounded-lg px-3 py-2" value={checkInForm.roomId} onChange={e => setCheckInForm({...checkInForm, roomId: e.target.value})}>
                                        <option value="">-- Choose a Free Room --</option>
                                        {selectedBlock.allocated_rooms?.filter(r => r.current_status !== 'occupied').map(r => (
                                            <option key={r.room_id} value={r.room_id}>{r.room_number}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                                        <input type="text" required className="w-full border rounded-lg px-3 py-2" value={checkInForm.guest_name} onChange={e => setCheckInForm({...checkInForm, guest_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input type="text" required className="w-full border rounded-lg px-3 py-2" value={checkInForm.phone} onChange={e => setCheckInForm({...checkInForm, phone: e.target.value})} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                                        <select className="w-full border rounded-lg px-3 py-2" value={checkInForm.identity_proof_type} onChange={e => setCheckInForm({...checkInForm, identity_proof_type: e.target.value})}>
                                            <option>Aadhar</option>
                                            <option>PAN</option>
                                            <option>Passport</option>
                                            <option>Driving License</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                                        <input type="text" required className="w-full border rounded-lg px-3 py-2" value={checkInForm.identity_proof_number} onChange={e => setCheckInForm({...checkInForm, identity_proof_number: e.target.value})} />
                                    </div>
                                </div>
                                
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Checkout Datetime (Default: Block End)</label>
                                    <input type="datetime-local" required className="w-full border rounded-lg px-3 py-2" value={checkInForm.departure_datetime} onChange={e => setCheckInForm({...checkInForm, departure_datetime: e.target.value})} />
                                </div>

                                <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold flex items-center justify-center">
                                    <UserPlus className="h-5 w-5 mr-2" /> Complete Check-In
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkRoomsTab;
