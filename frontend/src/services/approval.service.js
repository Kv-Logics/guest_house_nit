import api from './api';

export const approvalService = {
  getPendingApprovals: async () => api.get('/approvals/pending'),
  getApprovalHistory: async (action) => api.get(`/approvals/history?action=${action}`),
  approveBooking: async (id, payload) => api.post(`/approvals/${id}`, payload),
};
