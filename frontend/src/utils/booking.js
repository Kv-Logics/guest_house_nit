export const getFormattedBookingId = (booking) => {
    if (!booking) return '';
    
    let bookingId = '';
    let formattedId = '';
    let roomIndex = null;
    let seq = null;
    let cat = null;
    
    if (typeof booking === 'object') {
        bookingId = booking.booking_id || booking.bookingId;
        formattedId = booking.formatted_id || booking.formattedId || '';
        seq = booking.booking_seq !== undefined ? booking.booking_seq : booking.bookingSeq;
        cat = booking.category_id !== undefined ? booking.category_id : booking.categoryId;
        if (booking.room_index !== undefined && booking.room_index !== null) {
            roomIndex = booking.room_index;
        } else if (booking.roomIndex !== undefined && booking.roomIndex !== null) {
            roomIndex = booking.roomIndex;
        }
    } else if (typeof booking === 'string') {
        bookingId = booking;
    }
    
    if (!bookingId) return '';
    
    // If formatted_id is missing, fallback to APP/CAT-{cat}/{seq} or shortId
    if (!formattedId) {
        if (seq) {
            const catMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
            const catRoman = catMap[cat] || 'NA';
            formattedId = `APP/CAT-${catRoman}/${String(seq).padStart(4, '0')}`;
        } else {
            formattedId = String(bookingId).substring(0, 8).toUpperCase();
        }
    }
    
    if (roomIndex !== null) {
        return `${formattedId}:${roomIndex + 1}`;
    }
    
    return formattedId;
};

export const getGstRate = () => {
  try {
    const sysConfigStr = localStorage.getItem('sys-config');
    if (sysConfigStr) {
      const sysConfig = JSON.parse(sysConfigStr);
      if (sysConfig.gst_rate !== undefined) return Number(sysConfig.gst_rate);
    }
  } catch (e) {}
  return 12;
};

