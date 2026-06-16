import api from './api';

export const paymentService = {
  uploadProof: async (id, file, remarks) => {
    const formData = new FormData();
    formData.append('payment_proof', file);
    if (remarks) formData.append('remarks', remarks);
    return api.post(`/payments/${id}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getProofHistory: async (id) => api.get(`/payments/${id}/proofs`),
  verifyPayment: async (id, action, reason) => api.post(`/payments/${id}/verify`, { action, reason }),
  sendWarning: async (id, warning_level, message) => api.post(`/payments/${id}/warn`, { warning_level, message }),
  posComplete: async (id, pos_reference) => api.post(`/payments/${id}/pos-complete`, { pos_reference }),
  posConfirm: async (id) => api.post(`/payments/${id}/pos-confirm`)
};