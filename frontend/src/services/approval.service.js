import api from './api';

export const approvalService = {
  getPendingApprovals: async () => api.get('/approvals/pending'),
  approveBooking: async (id, payload) => api.post(`/approvals/${id}`, payload),
};
