/**
 * Calculates the number of hotel nights between two dates.
 * It ignores the time portion of the dates.
 * Arrival: 7 Jun 6:30 AM, Departure: 8 Jun 12:00 PM => 1 Night
 * Arrival: 7 Jun 8:00 AM, Departure: 7 Jun 8:00 PM => 1 Night (minimum 1)
 */
export const calculateHotelNights = (arrivalDatetime, departureDatetime) => {
    if (!arrivalDatetime || !departureDatetime) return 1;

    const start = new Date(arrivalDatetime);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(departureDatetime);
    end.setHours(0, 0, 0, 0);

    // If same-day check-in and check-out, or departure is somehow before arrival, minimum 1 night
    if (end <= start) {
        return 1;
    }

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays);
};
