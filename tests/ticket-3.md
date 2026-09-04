# Ticket 3 Test Sheet

## Test Item

Use the published Ticket 1 Test Item:

```
name: Black Water Bottle
category: Drink Bottle
foundLocation: Library Level 2
foundDate: 2026-08-21
publicDescription: Black metal bottle with a silver lid.
privateClue: A small dinosaur sticker is under the base.
status: PUBLISHED
```

## Test Claims

Claim A (first visitor / this browser):

```
claimantName: Alex Chen
contact: alex.chen@campus.edu
evidence: The bottle has a dinosaur sticker under the base.
```

Claim B (second claim on the same item, still SUBMITTED):

```
claimantName: Jordan Lee
contact: jordan.lee@campus.edu
evidence: I left it on a desk in Library Level 2 after class.
```

For every test, record:

```
Result: PASS / FAIL
Expected:
Actual:
Evidence:
```

Use the Visitor / Staff switch. Decision reason is stored on the claim as `decision`. Inspect markup and storage (`findit.items`, `findit.claims`); hiding private fields with CSS only does not count as a pass.

## T3-01: Staff Can List Submitted Claims

Starting condition:

- At least one SUBMITTED claim exists for the Test Item (Claim A).

Action:

- Switch to Staff.
- Open Review claims.

Expected:

- Every SUBMITTED claim is listed.
- The linked item is shown (name and identifying public fields).
- Private evidence is shown to Staff.
- The item’s `privateClue` is visible to Staff.
- Visitors still cannot open this review list.

## T3-02: Decision Reason Is Required

Starting condition:

- Claim A is SUBMITTED.
- Record claim `status` and item `status`.

Action:

- As Staff, open Review claims.
- Leave Decision reason empty.
- Click Approve.
- Click Reject.

Expected:

- No confirm popup is enough to complete the decision without a reason.
- Claim `status` stays SUBMITTED.
- The item stays PUBLISHED.
- A clear message says a decision reason is required.

## T3-03: Confirm Popup Before a Decision

Starting condition:

- Claim A is SUBMITTED.
- A decision reason is entered, for example: `Sticker matches the private clue.`

Action:

- Click Approve.
- Cancel the confirm popup.
- Confirm that storage did not change.
- Click Approve again and accept the popup.

Expected:

- A confirm popup appears before the decision is applied.
- Cancelling leaves the claim SUBMITTED and the item PUBLISHED.
- Accepting applies the decision.

## T3-04: Approve Changes the Claim and Reserves the Item

Starting condition:

- Claim A is SUBMITTED.
- The Test Item is PUBLISHED.

Action:

- As Staff, approve Claim A with a non-empty decision reason and accept the confirm popup.

Expected:

- Claim A `status` becomes APPROVED.
- Claim A `decision` stores the entered reason.
- The same claim `id` is kept; a second claim is not created.
- The Test Item `status` becomes RESERVED.
- A second item is not created.
- A success message appears.

## T3-05: Only One Claim Can Be Approved for an Item

Starting condition:

- Claim A is already APPROVED and the Test Item is RESERVED.
- Claim B is SUBMITTED for the same item (submit Claim B as Visitor before approving Claim A, or keep a leftover SUBMITTED claim).

Action:

- As Staff, try to approve Claim B with a valid decision reason.

Expected:

- Claim B is not APPROVED.
- The application reports that only one claim can be approved for an item.
- The Test Item remains RESERVED.
- Claim A remains the only APPROVED claim.

If Claim B cannot appear because the item was already reserved, that is also a pass for “no further claims”, provided Staff still cannot approve a second claim on that item.

## T3-06: Reject Leaves the Item Published

Starting condition:

- Use a different PUBLISHED item, or reset so a claim is SUBMITTED and the item is still PUBLISHED.
- Submit a claim and reject it.

Action:

- As Staff, reject the claim with reason `Does not match the private clue.` and accept the confirm popup.

Expected:

- The claim `status` becomes REJECTED.
- `decision` stores the entered reason.
- The item `status` remains PUBLISHED (not RESERVED).
- A visitor who owns that claim sees it as REJECTED (light red on My claims / Your claims).
- The item list shows light red until that visitor opens the item; then the red highlight on the list is cleared.

## T3-07: Reserved Items Stay Visible and Cannot Be Claimed

Starting condition:

- The Test Item is RESERVED after T3-04.

Action:

- Switch to Visitor.
- Open the item list.
- Open the reserved Test Item.
- Try to submit a new claim.

Expected:

- The RESERVED item appears on the visitor list.
- Claim item is not available.
- A new claim is not created.
- DRAFT items still do not appear on the visitor list.

## T3-08: Approved Visitor Sees a Green Item

Starting condition:

- Claim A (this Visitor) is APPROVED for the Test Item.

Action:

- Switch to Visitor.
- Open Browse items.

Expected:

- The Test Item card is light green for the visitor whose claim was approved.
- My claims / Your claims for that claim are also light green.
- Another visitor who does not own the approved claim does not get that green “my claim” highlight.

## T3-09: Visitor Cannot Decide Claims

Action:

- As Visitor, try to approve or reject any claim.
- Try to change an item to RESERVED without Staff.

Expected:

- The Visitor cannot apply APPROVED or REJECTED.
- The Visitor cannot reserve an item.
- Existing statuses stay unchanged.
- Hiding the Staff review button alone does not count as a pass.

## T3-10: Repeat Approve Does Not Duplicate Data

Starting condition:

- Claim A is already APPROVED and the item is RESERVED.

Action:

- As Staff, try to approve Claim A again if it still appears, or refresh and confirm stored records.

Expected:

- Still only one item record.
- Still only one APPROVED claim for that item.
- Statuses remain APPROVED / RESERVED.
- The application does not crash.

## Completion Check

Ticket 3 is complete only when:

- All ten tests pass.
- Staff can see submitted claims, the linked item, and private evidence.
- A decision requires a reason and a confirm popup.
- Approving sets the claim to APPROVED and the item to RESERVED.
- A second approval for the same item is blocked.
- RESERVED items remain visible and cannot receive new claims.
- The visitor with the approved claim sees the item in light green.
- The student can explain:

```
User action
-> Decision reason + confirm popup
-> Validation (reason required, one approval, item still PUBLISHED)
-> Claim status change
-> Item status PUBLISHED -> RESERVED (on approve)
-> Screen update
```
