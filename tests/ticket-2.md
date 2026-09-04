# Ticket 2 Test Sheet

## Test Item

Use the published Ticket 1 Test Item (or publish it first):

```
name: Black Water Bottle
category: Drink Bottle
foundLocation: Library Level 2
foundDate: 2026-08-21
publicDescription: Black metal bottle with a silver lid.
privateClue: A small dinosaur sticker is under the base.
status: PUBLISHED
```

## Test Claim

```
claimantName: Alex Chen
contact: alex.chen@campus.edu
evidence: The bottle has a dinosaur sticker under the base.
```

For every test, record:

```
Result: PASS / FAIL
Expected:
Actual:
Evidence:
```

These tests use the Visitor / Staff switch. There is no login server. Stored data is in the browser (`findit.items`, `findit.claims`, `findit.myClaimIds`). Inspect the page markup and storage; hiding private fields with CSS only does not count as a pass.

## T2-01: Submit a Claim for a Published Item

Starting condition:

- The Test Item is PUBLISHED.
- Switch to Visitor.
- Record how many claims exist in storage.

Action:

- Open the Test Item.
- Choose Claim item.
- Submit the Test Claim.

Expected:

- Exactly one new claim is created.
- The application generates its `id`.
- `itemId` is the Test Item `id`.
- `claimantName`, `contact`, and `evidence` match what was entered.
- `status` is SUBMITTED.
- `decision` is empty.
- A clear success message appears.
- The item status remains PUBLISHED.

## T2-02: Required Field Validation

Starting condition:

- The Test Item is still PUBLISHED.
- Record the current claim count.

Action:

- Open Claim item.
- Try to submit with `claimantName` empty.
- Repeat with `contact` empty.
- Repeat with `evidence` empty.

Expected:

- No new claim is created.
- Stored claims do not change.
- A clear validation message identifies the missing field.
- The other form values are not unexpectedly lost.

## T2-03: Claims Are Allowed Only for PUBLISHED Items

Starting condition:

- There is a DRAFT item (report a new item as Staff and do not publish it).
- The Test Item is PUBLISHED.

Action:

- As Visitor, confirm the DRAFT item is not on the public list and cannot be claimed.
- As Staff, open the DRAFT item and confirm there is no Claim item action.
- As Visitor, open the PUBLISHED Test Item and confirm Claim item is available.
- Try to submit a claim while the selected item is not PUBLISHED (switch role or use a reserved/draft item if one exists).

Expected:

- Claim item appears only on PUBLISHED items for Visitors.
- A claim cannot be saved against a DRAFT item.
- The application rejects the claim and does not create a record.

## T2-04: Evidence Is Private from Other Visitors

Starting condition:

- The Test Claim has been submitted.

Action:

- Stay as Visitor and open the public item list and item details.
- Open My claims and Your claims under the Test Item.
- Inspect the page markup for the public item view (not the claim form you are filling in).
- If possible, open the app in another browser or private window as a second Visitor.

Expected:

- Other visitors do not see `evidence`, `claimantName`, or `contact` on the public item view.
- The public item details still show `publicDescription`.
- `evidence` is not present in the visitor item-details markup.
- A second browser / private window does not show Alex Chen’s claim as “my claim”.
- Hiding evidence only with CSS does not count as a pass.

## T2-05: Visitor Can See Their Own Claims and Status

Starting condition:

- The Test Claim belongs to this Visitor (`SUBMITTED`).

Action:

- Open My claims.
- From Browse items, select the Test Item and look under it for Your claims.

Expected:

- My claims lists every claim this Visitor submitted.
- Each claim shows `status` (SUBMITTED).
- Selecting the Test Item shows that claim below the item.
- The visitor can see their own `evidence`.
- The Test Item card is light yellow while the claim is SUBMITTED.

## T2-06: Visitor Cannot Perform Staff Claim Decisions

Action:

- As Visitor, try to open Review claims.
- Try to approve or reject a claim from the Visitor UI.

Expected:

- Review claims is not available to Visitors.
- The Visitor cannot change claim `status` to APPROVED or REJECTED.
- The Test Claim remains SUBMITTED.
- Hiding a Staff button alone does not count as a pass; the Visitor must have no working decide action.

## T2-07: Repeat Submit Does Not Crash

Action:

- Submit a second claim for the same PUBLISHED item (Ticket 2 still allows more than one SUBMITTED claim).
- Refresh the page.

Expected:

- Both SUBMITTED claims exist and keep the same `itemId`.
- The application does not crash.
- No item record is duplicated.
- The item status is still PUBLISHED.

## T2-08: Persistence of Claims

Action:

- Refresh the browser.
- Close and reopen the application in the same browser.

Expected:

- The claim still exists.
- Field names are still `id`, `itemId`, `claimantName`, `contact`, `evidence`, `status`, `decision`.
- `status` is still SUBMITTED.
- My claims still lists it after refresh.

## Completion Check

Ticket 2 is complete only when:

- All eight tests pass.
- Claims are created only for PUBLISHED items.
- New claims are saved as SUBMITTED.
- Other visitors never see claim evidence.
- The visitor can see their own claims and status.
- Visitors cannot decide claims.
- The student can explain:

```
User action
-> Claim form submit
-> Client validation
-> Claim stored (SUBMITTED)
-> Screen update
```
