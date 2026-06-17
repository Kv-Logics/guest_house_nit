# Bulk Booking — Sample Flow Walkthrough

## The Full Flow

```
Bulk Booking CREATED (by reception)
         ↓
  Sent for APPROVAL
         ↓
   APPROVED (by authority/admin)
         ↓
  ── STAY RECORDS PHASE ─────────────────────────────────────────────
  Reception / GHC open the bulk booking.
  They add stay records one by one:
  
    [+ Add Record]
    → Guest Name:  "Dr. Ramesh Kumar"
    → Room No:     [Dropdown from allocated rooms: 12, 13, 14]
    → Check-in:    2026-06-10
    → Check-out:   2026-06-13
    → Auto-calc:   3 nights × ₹800 = ₹2,400
    → Occupancy:   Single / Double
    → Extra Bed:   Yes/No
  
  More records:
    Guest "Prof. Anjali"   → Room 12 → Jun 11 to Jun 13 → 2 nights → ₹1,600
    Guest "Mr. Suresh"     → Room 13 → Jun 10 to Jun 14 → 4 nights → ₹3,200
    Guest "Ms. Priya"      → Room 14 → Jun 12 to Jun 15 → 3 nights → ₹2,400
    Guest "Dr. Vivek"      → Room 14 → Jun 10 to Jun 12 → 2 nights → ₹1,600
  
  Occupancy check runs automatically:
    Room 12: Dr. Ramesh + Prof. Anjali on Jun 11-12 → 2 guests → OK ✅
    Room 14: Ms. Priya + Dr. Vivek → overlapping Jun 12 → 2 guests → OK ✅
    (If 4 guests overlap same room same day → ❌ BLOCKED)

  ── BILL GROUPING PHASE ────────────────────────────────────────────
  Reception / GHC click "Create Bill Groups"
  
  They see all stay records as a list.
  They assign each record to a "Bill Group":
  
    ┌─────────────────────────────────────────────────────────────┐
    │  STAY RECORD          │  BILL GROUP                        │
    ├─────────────────────────────────────────────────────────────┤
    │  Dr. Ramesh, Rm 12    │  [Group A ▼]  (dept pays)         │
    │  Prof. Anjali, Rm 12  │  [Group A ▼]                      │
    │  Mr. Suresh, Rm 13    │  [Group B ▼]  (self pays)         │
    │  Ms. Priya, Rm 14     │  [Group C ▼]  (sponsor pays)      │
    │  Dr. Vivek, Rm 14     │  [Group C ▼]                      │
    └─────────────────────────────────────────────────────────────┘
    
    3 Groups = 3 Bills will be generated.
    
    [+ New Group] button to create Group D, E, etc.

  ── BILL PREVIEW PHASE ─────────────────────────────────────────────
  UI shows a preview card for each Bill Group:
  
  ╔═══════════════════════════════════════╗
  ║  BILL GROUP A — Preview              ║
  ╠═══════════════════════════════════════╣
  ║  Dr. Ramesh Kumar    3N × ₹800  ₹2,400 ║
  ║  Prof. Anjali        2N × ₹800  ₹1,600 ║
  ║                            ─────────── ║
  ║  Subtotal                       ₹4,000 ║
  ║  GST (12%)                        ₹480 ║
  ║  TOTAL                          ₹4,480 ║
  ╚═══════════════════════════════════════╝
  
  ╔═══════════════════════════════════════╗
  ║  BILL GROUP B — Preview              ║
  ╠═══════════════════════════════════════╣
  ║  Mr. Suresh          4N × ₹800  ₹3,200 ║
  ║                            ─────────── ║
  ║  Subtotal                       ₹3,200 ║
  ║  GST (12%)                        ₹384 ║
  ║  TOTAL                          ₹3,584 ║
  ╚═══════════════════════════════════════╝
  
  ╔═══════════════════════════════════════╗
  ║  BILL GROUP C — Preview              ║
  ╠═══════════════════════════════════════╣
  ║  Ms. Priya           3N × ₹800  ₹2,400 ║
  ║  Dr. Vivek           2N × ₹800  ₹1,600 ║
  ║                            ─────────── ║
  ║  Subtotal                       ₹4,000 ║
  ║  GST (12%)                        ₹480 ║
  ║  TOTAL                          ₹4,480 ║
  ╚═══════════════════════════════════════╝

  ── GHC LOCK PHASE ─────────────────────────────────────────────────
  GHC reviews all stay records + bill groups.
  GHC clicks [🔒 Lock & Generate Bills]
  
  → All stay records become READ-ONLY
  → 3 final_bill entries are created in DB (one per group)
  → Each bill gets a unique invoice number
  → Status changes to STAY_LOCKED / CHECKED_OUT
```

---

## Database Design

```
bulk_stay_records table:
  record_id, booking_id, guest_name, room_number (FK to rooms),
  check_in, check_out, nights, occupancy_type, extra_bed,
  tariff_per_night, total_amount, bill_group_label, is_locked,
  remarks, created_by

bulk_bill_groups table (or stored in JSONB):
  group_id, booking_id, group_label (A/B/C),
  group_name (optional: "Dept of Physics"),
  record_ids[], subtotal, gst, total,
  invoice_number (after lock), is_locked
```

---

## Is This Understanding Correct?

Please confirm or correct:
1. ✅ **Stay Records**: Reception AND GHC can add/edit stay records. Applicant (coordinator) can ALSO see and add stay records.
2. ✅ **Rooms dropdown**: From rooms already allocated to this bulk booking
3. ✅ **Bill Groups**: User creates groups (A, B, C...) and assigns each stay record to a group
4. ✅ **Bill Preview**: Each group shows a summary bill card with subtotal + GST + total
5. ✅ **GHC Lock**: Only GHC can lock → triggers generation of one final bill per group
6. ✅ **Occupancy Rule**: >3 guests in same room on same day is blocked
