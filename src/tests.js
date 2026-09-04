(function () {
  const TEST_ITEM = {
    name: "Black Water Bottle",
    category: "Drink Bottle",
    foundLocation: "Library Level 2",
    foundDate: "2026-08-21",
    publicDescription: "Black metal bottle with a silver lid.",
    privateClue: "A small dinosaur sticker is under the base.",
  };
  const CLAIM_A = {
    claimantName: "Alex Chen",
    contact: "alex.chen@campus.edu",
    evidence: "The bottle has a dinosaur sticker under the base.",
  };
  const CLAIM_B = {
    claimantName: "Jordan Lee",
    contact: "jordan.lee@campus.edu",
    evidence: "I left it on a desk in Library Level 2 after class.",
  };

  function check(condition, expected, actual) {
    if (!condition) {
      const error = new Error(String(actual));
      error.expected = expected;
      error.actual = actual;
      throw error;
    }
  }

  function snapshot(api) {
    const local = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.indexOf("findit") === 0) {
        local[key] = localStorage.getItem(key);
      }
    }
    return {
      local: local,
      role: api.state.role,
      view: api.state.view,
      selectedId: api.state.selectedId,
      selectedClaimId: api.state.selectedClaimId,
    };
  }

  function restore(api, snap) {
    Object.keys(snap.local).forEach(function (key) {
      localStorage.setItem(key, snap.local[key]);
    });
    const keep = {};
    Object.keys(snap.local).forEach(function (key) {
      keep[key] = true;
    });
    const remove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.indexOf("findit") === 0 && !keep[key]) {
        remove.push(key);
      }
    }
    remove.forEach(function (key) {
      localStorage.removeItem(key);
    });
    api.els.reportForm.reset();
    api.els.claimForm.reset();
    api.state.selectedId = snap.selectedId;
    api.state.selectedClaimId = snap.selectedClaimId;
    api.state.view = snap.view === "tests" ? "list" : snap.view;
    api.state.banner = null;
    api.setRole(snap.role);
  }

  function clearData(api) {
    api.saveItems([]);
    api.saveClaims([]);
    localStorage.removeItem(api.SEEN_REJECTED_KEY);
    api.VISITOR_ROLES.forEach(function (role) {
      localStorage.removeItem(api.SEEN_REJECTED_KEY + "." + role);
    });
    api.els.reportForm.reset();
    api.els.claimForm.reset();
    api.state.selectedId = null;
    api.state.selectedClaimId = null;
    api.state.view = "list";
    api.state.banner = null;
  }

  function withDialogs(confirms, fn) {
    const origConfirm = window.confirm;
    const origAlert = window.alert;
    const queue = confirms.slice();
    window.confirm = function () {
      return queue.length ? queue.shift() : false;
    };
    window.alert = function () {};
    try {
      return fn();
    } finally {
      window.confirm = origConfirm;
      window.alert = origAlert;
    }
  }

  function reportItem(api, fields) {
    api.setRole("staff");
    const form = api.els.reportForm;
    const category = form.elements.category;
    if (
      !Array.prototype.some.call(category.options, function (option) {
        return option.value === fields.category;
      })
    ) {
      const option = document.createElement("option");
      option.value = fields.category;
      option.textContent = fields.category;
      category.appendChild(option);
    }
    form.elements.name.value = fields.name;
    form.elements.category.value = fields.category;
    form.elements.foundLocation.value = fields.foundLocation;
    form.elements.publicDescription.value = fields.publicDescription;
    form.elements.privateClue.value = fields.privateClue;
    api.setFoundDateFromIso(fields.foundDate);
    api.handleReportSubmit({ preventDefault: function () {} });
    const items = api.loadItems();
    return items[items.length - 1];
  }

  function publish(api, itemId) {
    api.setRole("staff");
    api.state.selectedId = itemId;
    api.publishSelectedItem();
    return api.getItem(itemId);
  }

  function submitClaim(api, itemId, fields, role) {
    api.setRole(role || "visitor-1");
    api.state.selectedId = itemId;
    api.els.claimForm.elements.claimantName.value = fields.claimantName;
    api.els.claimForm.elements.contact.value = fields.contact;
    api.els.claimForm.elements.evidence.value = fields.evidence;
    api.handleClaimSubmit({ preventDefault: function () {} });
    const claims = api.loadClaims();
    return claims[claims.length - 1];
  }

  function decide(api, claimId, status, reason, confirms) {
    api.setRole("staff");
    api.openClaimDetail(claimId, "review");
    const input = document.querySelector('[data-decision-for="' + claimId + '"]');
    if (input && reason != null) {
      input.value = reason;
    }
    withDialogs(confirms || [true], function () {
      api.decideClaim(claimId, status);
    });
    return api.getClaim(claimId);
  }

  function visitorDetailHtml(api, itemId, role) {
    api.setRole(role || "visitor-1");
    api.state.selectedId = itemId;
    api.state.view = "list";
    api.render();
    return api.els.itemDetail.innerHTML;
  }

  const TICKETS = [
    {
      id: "1",
      title: "Ticket 1",
      tests: [
        {
          id: "T1-01",
          title: "Create a Found Item",
          starting: "Log in as Staff. Record the number of existing items.",
          action: "Submit the Test Item using the Report Found Item form.",
          expected:
            "Exactly one new item is created. The app generates its id. Status is DRAFT. All entered information is saved. A success message appears.",
          run: function (api) {
            clearData(api);
            const before = api.loadItems().length;
            const item = reportItem(api, TEST_ITEM);
            check(api.loadItems().length === before + 1, "one new item", api.loadItems().length);
            check(Boolean(item && item.id), "generated id", item && item.id);
            check(item.status === "DRAFT", "DRAFT", item.status);
            check(item.name === TEST_ITEM.name, TEST_ITEM.name, item.name);
            check(item.category === TEST_ITEM.category, TEST_ITEM.category, item.category);
            check(item.foundLocation === TEST_ITEM.foundLocation, TEST_ITEM.foundLocation, item.foundLocation);
            check(item.foundDate === TEST_ITEM.foundDate, TEST_ITEM.foundDate, item.foundDate);
            check(item.publicDescription === TEST_ITEM.publicDescription, TEST_ITEM.publicDescription, item.publicDescription);
            check(item.privateClue === TEST_ITEM.privateClue, TEST_ITEM.privateClue, item.privateClue);
            check(
              Boolean(api.state.banner && /draft/i.test(api.state.banner.message)),
              "success message about draft",
              api.state.banner && api.state.banner.message
            );
            return { actual: "Created DRAFT item " + item.id, evidence: JSON.stringify(item) };
          },
        },
        {
          id: "T1-02",
          title: "Required Field Validation",
          starting: "Staff reporting form is open.",
          action: "Try to submit with name empty, then with privateClue empty.",
          expected:
            "The item is not created. A validation message identifies the missing field. Other form values are kept.",
          run: function (api) {
            clearData(api);
            const before = api.loadItems().length;
            const form = api.els.reportForm;
            reportItem(api, TEST_ITEM);
            const afterCreate = api.loadItems().length;
            form.elements.name.value = TEST_ITEM.name;
            form.elements.category.value = TEST_ITEM.category;
            form.elements.foundLocation.value = TEST_ITEM.foundLocation;
            form.elements.publicDescription.value = TEST_ITEM.publicDescription;
            form.elements.privateClue.value = TEST_ITEM.privateClue;
            api.setFoundDateFromIso(TEST_ITEM.foundDate);
            form.elements.name.value = "";
            api.handleReportSubmit({ preventDefault: function () {} });
            check(api.loadItems().length === afterCreate, "no extra item", api.loadItems().length);
            check(
              Boolean(api.els.formError.textContent),
              "validation message",
              api.els.formError.textContent
            );
            check(
              form.elements.publicDescription.value === TEST_ITEM.publicDescription,
              "public description kept",
              form.elements.publicDescription.value
            );
            form.elements.name.value = TEST_ITEM.name;
            form.elements.privateClue.value = "";
            api.handleReportSubmit({ preventDefault: function () {} });
            check(api.loadItems().length === afterCreate, "still no extra item", api.loadItems().length);
            check(before + 1 === afterCreate, "only the valid item exists", afterCreate);
            return {
              actual: "Invalid submits created no items",
              evidence: api.els.formError.textContent,
            };
          },
        },
        {
          id: "T1-03",
          title: "Draft Items Are Private",
          starting: "The Test Item is still DRAFT.",
          action: "Switch to Visitor. Open the public list and try to open the item by id.",
          expected:
            "The Test Item does not appear on the public list. The Visitor cannot open its details or see privateClue.",
          run: function (api) {
            clearData(api);
            const item = reportItem(api, TEST_ITEM);
            api.setRole("visitor-1");
            const visible = api.visibleItems();
            check(
              visible.every(function (entry) {
                return entry.id !== item.id;
              }),
              "draft not on public list",
              visible.map(function (entry) {
                return entry.id;
              }).join(",")
            );
            const html = visitorDetailHtml(api, item.id);
            check(
              html.indexOf("not available") !== -1 || html.indexOf(TEST_ITEM.privateClue) === -1,
              "visitor cannot open draft details",
              html
            );
            check(html.indexOf(TEST_ITEM.privateClue) === -1, "privateClue hidden", html);
            return { actual: "Draft hidden from visitor", evidence: html };
          },
        },
        {
          id: "T1-04",
          title: "Publish the Item",
          starting: "The Test Item is DRAFT.",
          action: "Log in as Staff and publish the Test Item.",
          expected:
            "The existing item changes from DRAFT to PUBLISHED. A second item is not created. The Visitor can see it.",
          run: function (api) {
            clearData(api);
            const item = reportItem(api, TEST_ITEM);
            const published = publish(api, item.id);
            check(api.loadItems().length === 1, "one item", api.loadItems().length);
            check(published.status === "PUBLISHED", "PUBLISHED", published.status);
            api.setRole("visitor-1");
            const visible = api.visibleItems();
            check(visible.length === 1 && visible[0].id === item.id, "visitor sees published item", visible.length);
            check(visible[0].name === TEST_ITEM.name, TEST_ITEM.name, visible[0].name);
            return { actual: "Item published", evidence: published.status };
          },
        },
        {
          id: "T1-05",
          title: "Protect the Private Clue",
          starting: "The Test Item is PUBLISHED.",
          action: "Open the published item as a Visitor and inspect the markup.",
          expected:
            "The Visitor can see publicDescription. The Visitor cannot see the dinosaur-sticker clue in markup.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const html = visitorDetailHtml(api, item.id);
            check(html.indexOf(TEST_ITEM.publicDescription) !== -1, "public description visible", html);
            check(html.indexOf(TEST_ITEM.privateClue) === -1, "privateClue absent from markup", html);
            check(html.indexOf("dinosaur") === -1, "clue text absent", html);
            return { actual: "Visitor markup has no private clue", evidence: html };
          },
        },
        {
          id: "T1-06",
          title: "Visitor Permission",
          starting: "A DRAFT item exists.",
          action: "As Visitor, try to report and publish.",
          expected:
            "The Visitor cannot report or publish. Item status stays unchanged. Hiding a button is not enough.",
          run: function (api) {
            clearData(api);
            const item = reportItem(api, TEST_ITEM);
            api.setRole("visitor-1");
            api.handleReportSubmit({ preventDefault: function () {} });
            check(api.loadItems().length === 1, "visitor cannot create item", api.loadItems().length);
            api.state.selectedId = item.id;
            api.publishSelectedItem();
            check(api.getItem(item.id).status === "DRAFT", "DRAFT", api.getItem(item.id).status);
            check(api.els.navReport.hidden === true, "report nav hidden", String(api.els.navReport.hidden));
            return { actual: "Visitor report/publish rejected", evidence: api.getItem(item.id).status };
          },
        },
        {
          id: "T1-07",
          title: "Repeat the Publish Action",
          starting: "The Test Item is DRAFT.",
          action: "Publish twice.",
          expected: "Only one item exists. Status remains PUBLISHED. No duplicate. No crash.",
          run: function (api) {
            clearData(api);
            const item = reportItem(api, TEST_ITEM);
            publish(api, item.id);
            publish(api, item.id);
            check(api.loadItems().length === 1, "one item", api.loadItems().length);
            check(api.getItem(item.id).status === "PUBLISHED", "PUBLISHED", api.getItem(item.id).status);
            return { actual: "Repeat publish left one PUBLISHED item", evidence: "count=1" };
          },
        },
        {
          id: "T1-08",
          title: "Persistence and Shared Data",
          starting: "The Test Item is PUBLISHED.",
          action: "Read the stored records after save (localStorage).",
          expected:
            "The published item still exists in storage, not only in page memory.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const raw = localStorage.getItem(api.STORAGE_KEY);
            const parsed = JSON.parse(raw);
            const stored = parsed.find(function (entry) {
              return entry.id === item.id;
            });
            check(Boolean(stored), "item in localStorage", raw);
            check(stored.status === "PUBLISHED", "PUBLISHED", stored.status);
            return { actual: "Item persisted in localStorage", evidence: raw };
          },
        },
      ],
    },
    {
      id: "2",
      title: "Ticket 2",
      tests: [
        {
          id: "T2-01",
          title: "Submit a Claim for a Published Item",
          starting: "The Test Item is PUBLISHED. Switch to Visitor.",
          action: "Open Claim item and submit the Test Claim.",
          expected:
            "One new claim is created with generated id, itemId, SUBMITTED status, empty decision, and a success message. Item stays PUBLISHED.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const before = api.loadClaims().length;
            const claim = submitClaim(api, item.id, CLAIM_A);
            check(api.loadClaims().length === before + 1, "one new claim", api.loadClaims().length);
            check(Boolean(claim.id), "generated id", claim.id);
            check(claim.itemId === item.id, item.id, claim.itemId);
            check(claim.claimantName === CLAIM_A.claimantName, CLAIM_A.claimantName, claim.claimantName);
            check(claim.contact === CLAIM_A.contact, CLAIM_A.contact, claim.contact);
            check(claim.evidence === CLAIM_A.evidence, CLAIM_A.evidence, claim.evidence);
            check(claim.status === "SUBMITTED", "SUBMITTED", claim.status);
            check(!claim.decision, "empty decision", claim.decision);
            check(api.getItem(item.id).status === "PUBLISHED", "PUBLISHED", api.getItem(item.id).status);
            check(
              Boolean(api.state.banner && /claim submitted/i.test(api.state.banner.message)),
              "success message",
              api.state.banner && api.state.banner.message
            );
            return { actual: "Claim submitted", evidence: JSON.stringify(claim) };
          },
        },
        {
          id: "T2-02",
          title: "Required Field Validation",
          starting: "The Test Item is PUBLISHED.",
          action: "Submit with claimantName, contact, then evidence empty.",
          expected: "No new claim. Validation message. Other fields kept.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            api.setRole("visitor-1");
            api.state.selectedId = item.id;
            api.els.claimForm.elements.claimantName.value = "";
            api.els.claimForm.elements.contact.value = CLAIM_A.contact;
            api.els.claimForm.elements.evidence.value = CLAIM_A.evidence;
            api.handleClaimSubmit({ preventDefault: function () {} });
            check(api.loadClaims().length === 0, "no claim", api.loadClaims().length);
            check(
              api.els.claimForm.elements.evidence.value === CLAIM_A.evidence,
              "evidence kept",
              api.els.claimForm.elements.evidence.value
            );
            api.els.claimForm.elements.claimantName.value = CLAIM_A.claimantName;
            api.els.claimForm.elements.contact.value = "";
            api.handleClaimSubmit({ preventDefault: function () {} });
            check(api.loadClaims().length === 0, "no claim after empty contact", api.loadClaims().length);
            api.els.claimForm.elements.contact.value = CLAIM_A.contact;
            api.els.claimForm.elements.evidence.value = "";
            api.handleClaimSubmit({ preventDefault: function () {} });
            check(api.loadClaims().length === 0, "no claim after empty evidence", api.loadClaims().length);
            return { actual: "Invalid claims rejected", evidence: api.els.claimFormError.textContent };
          },
        },
        {
          id: "T2-03",
          title: "Claims Are Allowed Only for PUBLISHED Items",
          starting: "A DRAFT item and a PUBLISHED item exist.",
          action: "As Visitor, try to claim the draft. As Staff, confirm no Claim action.",
          expected: "Claim item only on PUBLISHED visitor items. No claim saved against DRAFT.",
          run: function (api) {
            clearData(api);
            const draft = reportItem(api, TEST_ITEM);
            const published = publish(api, reportItem(api, {
              name: "Published Bottle",
              category: "Drink Bottle",
              foundLocation: TEST_ITEM.foundLocation,
              foundDate: TEST_ITEM.foundDate,
              publicDescription: TEST_ITEM.publicDescription,
              privateClue: TEST_ITEM.privateClue,
            }).id);
            api.setRole("visitor-1");
            check(
              api.visibleItems().every(function (entry) {
                return entry.id !== draft.id;
              }),
              "draft not listed",
              "listed"
            );
            check(!api.canClaimItem(draft), "cannot claim draft", String(api.canClaimItem(draft)));
            api.state.selectedId = draft.id;
            submitClaim(api, draft.id, CLAIM_A);
            check(api.loadClaims().length === 0, "no draft claim", api.loadClaims().length);
            api.setRole("staff");
            api.state.selectedId = draft.id;
            api.state.view = "list";
            api.render();
            check(
              api.els.itemDetail.innerHTML.indexOf("claim-item") === -1,
              "staff draft has no Claim item",
              api.els.itemDetail.innerHTML
            );
            check(api.canClaimItem(published), "can claim published", String(api.canClaimItem(published)));
            return { actual: "Draft cannot be claimed", evidence: "claims=" + api.loadClaims().length };
          },
        },
        {
          id: "T2-04",
          title: "Evidence Is Private from Other Visitors",
          starting: "The Test Claim has been submitted by Visitor 1.",
          action: "Inspect public item markup. Switch to Visitor 2.",
          expected:
            "Other visitors do not see evidence on the public item view. Visitor 2 does not own the claim.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            submitClaim(api, item.id, CLAIM_A, "visitor-1");
            const html = visitorDetailHtml(api, item.id, "visitor-2");
            check(html.indexOf(TEST_ITEM.publicDescription) !== -1, "public description visible", html);
            check(html.indexOf(CLAIM_A.evidence) === -1, "evidence absent from item details", html);
            check(html.indexOf(CLAIM_A.claimantName) === -1, "claimant absent from item details", html);
            api.setRole("visitor-2");
            check(api.myClaims().length === 0, "visitor 2 has no claims", api.myClaims().length);
            api.setRole("visitor-1");
            check(api.myClaims().length === 1, "visitor 1 owns the claim", api.myClaims().length);
            return { actual: "Evidence private from other visitors", evidence: html };
          },
        },
        {
          id: "T2-05",
          title: "Visitor Can See Their Own Claims and Status",
          starting: "The Test Claim belongs to this Visitor (SUBMITTED).",
          action: "Open My claims and select the Test Item.",
          expected: "My claims lists the claim with SUBMITTED. Item card is light yellow.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            submitClaim(api, item.id, CLAIM_A, "visitor-1");
            api.setRole("visitor-1");
            const mine = api.myClaims();
            check(mine.length === 1, "one own claim", mine.length);
            check(mine[0].status === "SUBMITTED", "SUBMITTED", mine[0].status);
            check(mine[0].evidence === CLAIM_A.evidence, CLAIM_A.evidence, mine[0].evidence);
            const itemClaims = api.myClaimsForItem(item.id);
            check(itemClaims.length === 1, "claim under item", itemClaims.length);
            check(
              api.itemListClaimClass(item).indexOf("is-claim-submitted") !== -1,
              "yellow submitted class",
              api.itemListClaimClass(item)
            );
            return { actual: "Own SUBMITTED claim visible", evidence: api.itemListClaimClass(item) };
          },
        },
        {
          id: "T2-06",
          title: "Visitor Cannot Perform Staff Claim Decisions",
          starting: "A SUBMITTED claim exists.",
          action: "As Visitor, try to open Review claims and decide the claim.",
          expected: "Visitor cannot review or change status to APPROVED or REJECTED.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            api.setRole("visitor-1");
            api.showView("review");
            check(api.state.view !== "review", "review not available", api.state.view);
            check(api.els.navReview.hidden === true, "review nav hidden", String(api.els.navReview.hidden));
            api.decideClaim(claim.id, "APPROVED");
            check(api.getClaim(claim.id).status === "SUBMITTED", "SUBMITTED", api.getClaim(claim.id).status);
            return { actual: "Visitor cannot decide claims", evidence: api.getClaim(claim.id).status };
          },
        },
        {
          id: "T2-07",
          title: "Repeat Submit Does Not Crash",
          starting: "The Test Item is PUBLISHED.",
          action: "Submit a second claim for the same item.",
          expected: "Both SUBMITTED claims exist. No duplicate item. Item stays PUBLISHED.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            submitClaim(api, item.id, CLAIM_A, "visitor-1");
            submitClaim(api, item.id, CLAIM_B, "visitor-1");
            check(api.loadClaims().length === 2, "two claims", api.loadClaims().length);
            check(
              api.loadClaims().every(function (claim) {
                return claim.itemId === item.id && claim.status === "SUBMITTED";
              }),
              "both SUBMITTED for the item",
              JSON.stringify(api.loadClaims())
            );
            check(api.loadItems().length === 1, "one item", api.loadItems().length);
            check(api.getItem(item.id).status === "PUBLISHED", "PUBLISHED", api.getItem(item.id).status);
            return { actual: "Two claims saved", evidence: String(api.loadClaims().length) };
          },
        },
        {
          id: "T2-08",
          title: "Persistence of Claims",
          starting: "A SUBMITTED claim exists.",
          action: "Read claims from storage.",
          expected: "Claim fields persist with status SUBMITTED.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            const stored = JSON.parse(localStorage.getItem(api.CLAIMS_KEY))[0];
            ["id", "itemId", "claimantName", "contact", "evidence", "status", "decision"].forEach(function (field) {
              check(Object.prototype.hasOwnProperty.call(stored, field), field + " present", JSON.stringify(stored));
            });
            check(stored.status === "SUBMITTED", "SUBMITTED", stored.status);
            check(stored.id === claim.id, claim.id, stored.id);
            return { actual: "Claim persisted", evidence: JSON.stringify(stored) };
          },
        },
      ],
    },
    {
      id: "3",
      title: "Ticket 3",
      tests: [
        {
          id: "T3-01",
          title: "Staff Can List Submitted Claims",
          starting: "At least one SUBMITTED claim exists.",
          action: "Switch to Staff and open Review claims / claim details.",
          expected:
            "Submitted claims are listed. Linked item, evidence, and privateClue are shown to Staff. Visitors cannot open review.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            api.setRole("staff");
            api.showView("review");
            check(api.state.view === "review", "review view", api.state.view);
            api.renderReviewClaims();
            check(
              api.els.reviewClaimList.textContent.indexOf(TEST_ITEM.name) !== -1,
              "item name in review list",
              api.els.reviewClaimList.textContent
            );
            api.openClaimDetail(claim.id, "review");
            const html = api.els.claimDetail.innerHTML;
            check(html.indexOf(CLAIM_A.evidence) !== -1, "evidence visible to staff", html);
            check(html.indexOf(TEST_ITEM.privateClue) !== -1, "privateClue visible to staff", html);
            api.setRole("visitor-1");
            api.showView("review");
            check(api.state.view !== "review", "visitor cannot stay on review", api.state.view);
            return { actual: "Staff review shows item and evidence", evidence: html };
          },
        },
        {
          id: "T3-02",
          title: "Decision Reason Is Required",
          starting: "Claim A is SUBMITTED. Item is PUBLISHED.",
          action: "Approve and Reject with an empty decision reason.",
          expected: "Status stays SUBMITTED. Item stays PUBLISHED. A reason is required.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            decide(api, claim.id, "APPROVED", "", [true]);
            check(api.getClaim(claim.id).status === "SUBMITTED", "SUBMITTED", api.getClaim(claim.id).status);
            check(api.getItem(item.id).status === "PUBLISHED", "PUBLISHED", api.getItem(item.id).status);
            decide(api, claim.id, "REJECTED", "", [true]);
            check(api.getClaim(claim.id).status === "SUBMITTED", "still SUBMITTED", api.getClaim(claim.id).status);
            return { actual: "Empty reason blocked the decision", evidence: api.getClaim(claim.id).status };
          },
        },
        {
          id: "T3-03",
          title: "Confirm Popup Before a Decision",
          starting: "Claim A is SUBMITTED. A decision reason is entered.",
          action: "Cancel confirm, then accept confirm on Approve.",
          expected: "Cancelling leaves SUBMITTED. Accepting applies the decision.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            decide(api, claim.id, "APPROVED", "Sticker matches the private clue.", [false]);
            check(api.getClaim(claim.id).status === "SUBMITTED", "SUBMITTED after cancel", api.getClaim(claim.id).status);
            decide(api, claim.id, "APPROVED", "Sticker matches the private clue.", [true]);
            check(api.getClaim(claim.id).status === "APPROVED", "APPROVED after confirm", api.getClaim(claim.id).status);
            return { actual: "Confirm cancel then accept worked", evidence: api.getClaim(claim.id).status };
          },
        },
        {
          id: "T3-04",
          title: "Approve Changes the Claim and Reserves the Item",
          starting: "Claim A is SUBMITTED. Item is PUBLISHED.",
          action: "Approve with a reason and accept the popup.",
          expected:
            "Claim becomes APPROVED with the reason. Same id. Item becomes RESERVED. No extra records.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            const decided = decide(api, claim.id, "APPROVED", "Sticker matches the private clue.", [true]);
            check(decided.status === "APPROVED", "APPROVED", decided.status);
            check(decided.decision === "Sticker matches the private clue.", "reason saved", decided.decision);
            check(decided.id === claim.id, "same claim id", decided.id);
            check(api.loadClaims().length === 1, "one claim", api.loadClaims().length);
            check(api.getItem(item.id).status === "RESERVED", "RESERVED", api.getItem(item.id).status);
            check(api.loadItems().length === 1, "one item", api.loadItems().length);
            return { actual: "Approved and reserved", evidence: decided.status + "/" + api.getItem(item.id).status };
          },
        },
        {
          id: "T3-05",
          title: "Only One Claim Can Be Approved for an Item",
          starting: "Claim A is APPROVED and the item is RESERVED. Claim B is SUBMITTED.",
          action: "Try to approve Claim B.",
          expected: "Claim B is not APPROVED. Claim A remains the only approved claim.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claimA = submitClaim(api, item.id, CLAIM_A, "visitor-1");
            const claimB = submitClaim(api, item.id, CLAIM_B, "visitor-2");
            decide(api, claimA.id, "APPROVED", "Matches clue.", [true]);
            decide(api, claimB.id, "APPROVED", "Also looks right.", [true]);
            check(api.getClaim(claimB.id).status === "SUBMITTED", "B still SUBMITTED", api.getClaim(claimB.id).status);
            check(api.getClaim(claimA.id).status === "APPROVED", "A APPROVED", api.getClaim(claimA.id).status);
            check(api.getItem(item.id).status === "RESERVED", "RESERVED", api.getItem(item.id).status);
            const approved = api.loadClaims().filter(function (entry) {
              return entry.status === "APPROVED";
            });
            check(approved.length === 1, "one approved claim", approved.length);
            return { actual: "Second approval blocked", evidence: "approved=" + approved.length };
          },
        },
        {
          id: "T3-06",
          title: "Reject Leaves the Item Published",
          starting: "A SUBMITTED claim on a PUBLISHED item.",
          action: "Reject with a reason and accept the popup.",
          expected:
            "Claim is REJECTED. Item stays PUBLISHED. Visitor sees red until they open the item.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A, "visitor-1");
            decide(api, claim.id, "REJECTED", "Does not match the private clue.", [true]);
            check(api.getClaim(claim.id).status === "REJECTED", "REJECTED", api.getClaim(claim.id).status);
            check(
              api.getClaim(claim.id).decision === "Does not match the private clue.",
              "reason saved",
              api.getClaim(claim.id).decision
            );
            check(api.getItem(item.id).status === "PUBLISHED", "PUBLISHED", api.getItem(item.id).status);
            api.setRole("visitor-1");
            check(
              api.itemListClaimClass(item).indexOf("is-claim-rejected") !== -1,
              "red on list",
              api.itemListClaimClass(item)
            );
            api.markRejectedClaimsSeen(item.id);
            check(
              api.itemListClaimClass(item).indexOf("is-claim-rejected") === -1,
              "red cleared after open",
              api.itemListClaimClass(item)
            );
            return { actual: "Rejected, item still published, red cleared after open", evidence: api.getItem(item.id).status };
          },
        },
        {
          id: "T3-07",
          title: "Reserved Items Stay Visible and Cannot Be Claimed",
          starting: "The Test Item is RESERVED.",
          action: "As Visitor, open the list and try to claim.",
          expected: "RESERVED item is listed. Claim item is unavailable. No new claim. DRAFT stays hidden.",
          run: function (api) {
            clearData(api);
            const draft = reportItem(api, {
              name: "Draft Hat",
              category: "Clothing",
              foundLocation: "Gym",
              foundDate: TEST_ITEM.foundDate,
              publicDescription: "A hat",
              privateClue: "Initials inside",
            });
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            decide(api, claim.id, "APPROVED", "Matches clue.", [true]);
            api.setRole("visitor-1");
            const visible = api.visibleItems();
            check(
              visible.some(function (entry) {
                return entry.id === item.id && entry.status === "RESERVED";
              }),
              "reserved item listed",
              JSON.stringify(visible)
            );
            check(
              visible.every(function (entry) {
                return entry.id !== draft.id;
              }),
              "draft hidden",
              "ok"
            );
            check(!api.canClaimItem(api.getItem(item.id)), "cannot claim reserved", "canClaim");
            const before = api.loadClaims().length;
            submitClaim(api, item.id, CLAIM_B, "visitor-2");
            check(api.loadClaims().length === before, "no new claim", api.loadClaims().length);
            return { actual: "Reserved visible and not claimable", evidence: api.getItem(item.id).status };
          },
        },
        {
          id: "T3-08",
          title: "Approved Visitor Sees a Green Item",
          starting: "Claim A for Visitor 1 is APPROVED.",
          action: "Open Browse items as Visitor 1 and Visitor 2.",
          expected: "Visitor 1 sees light green. Visitor 2 does not get that highlight.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A, "visitor-1");
            decide(api, claim.id, "APPROVED", "Matches clue.", [true]);
            api.setRole("visitor-1");
            check(
              api.itemListClaimClass(api.getItem(item.id)).indexOf("is-claim-approved") !== -1,
              "green for approved visitor",
              api.itemListClaimClass(api.getItem(item.id))
            );
            api.setRole("visitor-2");
            check(
              api.itemListClaimClass(api.getItem(item.id)).indexOf("is-claim-approved") === -1,
              "no green for other visitor",
              api.itemListClaimClass(api.getItem(item.id))
            );
            return { actual: "Green only for the approved visitor", evidence: "ok" };
          },
        },
        {
          id: "T3-09",
          title: "Visitor Cannot Decide Claims",
          starting: "A SUBMITTED claim exists.",
          action: "As Visitor, try to approve or reserve.",
          expected: "Visitor cannot apply APPROVED/REJECTED or reserve the item.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            api.setRole("visitor-1");
            api.decideClaim(claim.id, "APPROVED");
            api.decideClaim(claim.id, "REJECTED");
            check(api.getClaim(claim.id).status === "SUBMITTED", "SUBMITTED", api.getClaim(claim.id).status);
            check(api.getItem(item.id).status === "PUBLISHED", "PUBLISHED", api.getItem(item.id).status);
            return { actual: "Visitor decide rejected", evidence: api.getClaim(claim.id).status };
          },
        },
        {
          id: "T3-10",
          title: "Repeat Approve Does Not Duplicate Data",
          starting: "Claim A is already APPROVED and the item is RESERVED.",
          action: "Try to approve Claim A again.",
          expected: "Still one item and one APPROVED claim. Statuses unchanged. No crash.",
          run: function (api) {
            clearData(api);
            const item = publish(api, reportItem(api, TEST_ITEM).id);
            const claim = submitClaim(api, item.id, CLAIM_A);
            decide(api, claim.id, "APPROVED", "Matches clue.", [true]);
            decide(api, claim.id, "APPROVED", "Matches clue again.", [true]);
            check(api.loadItems().length === 1, "one item", api.loadItems().length);
            check(api.loadClaims().length === 1, "one claim", api.loadClaims().length);
            check(api.getClaim(claim.id).status === "APPROVED", "APPROVED", api.getClaim(claim.id).status);
            check(api.getItem(item.id).status === "RESERVED", "RESERVED", api.getItem(item.id).status);
            return { actual: "Repeat approve did not duplicate", evidence: "items=1 claims=1" };
          },
        },
      ],
    },
  ];

  function runTest(api, test) {
    try {
      const result = test.run(api) || {};
      return {
        id: test.id,
        title: test.title,
        starting: test.starting,
        action: test.action,
        expected: test.expected,
        passed: true,
        actual: result.actual || "PASS",
        evidence: result.evidence || "",
      };
    } catch (error) {
      return {
        id: test.id,
        title: test.title,
        starting: test.starting,
        action: test.action,
        expected: test.expected || (error && error.expected) || "",
        passed: false,
        actual: (error && error.actual) || error.message || String(error),
        evidence: error && error.stack ? error.stack : String(error),
      };
    }
  }

  window.FinditTests = {
    tickets: TICKETS,
    runAll: function (api) {
      const original = snapshot(api);
      const tickets = TICKETS.map(function (ticket) {
        return {
          id: ticket.id,
          title: ticket.title,
          tests: ticket.tests.map(function (test) {
            clearData(api);
            return runTest(api, test);
          }),
        };
      });
      restore(api, original);
      return { tickets: tickets };
    },
  };
})();
