import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Shield, Mail, User as UserIcon, Building, Briefcase, Hash, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function UserManagementTab() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        department: '',
        designation: '',
        employee_id: '',
        role_id: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = async (query = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/coordinator/users?query=${encodeURIComponent(query)}`);
            if (res.data.success) {
                setUsers(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await api.get('/coordinator/roles');
            if (res.data.success) {
                setRoles(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch roles', err);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchUsers(searchQuery);
    };

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedUser(null);
        setFormData({
            full_name: '',
            email: '',
            department: '',
            designation: '',
            employee_id: '',
            role_id: roles[0]?.role_id || ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setModalMode('edit');
        setSelectedUser(user);
        setFormData({
            full_name: user.full_name || '',
            email: user.email || '',
            department: user.department || '',
            designation: user.designation || '',
            employee_id: user.employee_id || '',
            role_id: user.role_id || ''
        });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (modalMode === 'create') {
                const res = await api.post('/coordinator/users', formData);
                if (res.data.success) {
                    alert('User created successfully!');
                    setIsModalOpen(false);
                    fetchUsers(searchQuery);
                }
            } else {
                const res = await api.put(`/coordinator/users/${selectedUser.user_id}`, formData);
                if (res.data.success) {
                    alert('User updated successfully!');
                    setIsModalOpen(false);
                    fetchUsers(searchQuery);
                }
            }
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`Are you sure you want to delete user ${userEmail}?`)) return;
        try {
            const res = await api.delete(`/coordinator/users/${userId}`);
            if (res.data.success) {
                alert('User deleted successfully!');
                fetchUsers(searchQuery);
            }
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in font-sans">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Name, Email, or Emp ID..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all">
                        Search
                    </button>
                </form>

                <button 
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all self-stretch md:self-auto justify-center"
                >
                    <Plus className="w-4 h-4" /> Add New User
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <p className="font-bold">Fetching user records...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold">
                        No users found matching your search.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 text-slate-550 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="p-4 pl-6">User</th>
                                    <th className="p-4">Contact Info</th>
                                    <th className="p-4">Department & Designation</th>
                                    <th className="p-4">Assigned Role</th>
                                    <th className="p-4 pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                                {users.map(u => (
                                    <tr key={u.user_id} className="hover:bg-slate-50/50">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                                    {u.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-slate-800 font-bold">{u.full_name}</div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Hash className="w-3 h-3" /> {u.employee_id || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" /> {u.email}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs">
                                            <div className="text-slate-700">{u.designation || 'N/A'}</div>
                                            <div className="text-slate-400 text-[10px] mt-0.5">{u.department || 'N/A'}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-55 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">
                                                {u.role_name || 'No Role'}
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => openEditModal(u)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(u.user_id, u.email)}
                                                    className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-800">
                                {modalMode === 'create' ? 'Create New User' : 'Edit User Settings'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {modalMode === 'create' ? 'Register a new user in the Guest House system database' : 'Update this user profile details and role mapping'}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                        <UserIcon className="w-3.5 h-3.5" /> Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5" /> Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                            <Briefcase className="w-3.5 h-3.5" /> Designation
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                            <Hash className="w-3.5 h-3.5" /> Employee/Student ID
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                                            value={formData.employee_id}
                                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                            <Building className="w-3.5 h-3.5" /> Department
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                            <Shield className="w-3.5 h-3.5" /> System Role *
                                        </label>
                                        <select
                                            required
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                                            value={formData.role_id}
                                            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                        >
                                            {roles.map(r => (
                                                <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl border border-slate-200 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
