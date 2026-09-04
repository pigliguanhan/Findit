(function () {
  const STORAGE_KEY = "findit.items";
  const CLAIMS_KEY = "findit.claims";
  const MY_CLAIMS_KEY = "findit.myClaimIds";
  const SEEN_REJECTED_KEY = "findit.seenRejectedClaimIds";
  const ROLE_KEY = "findit.role";
  const VISITOR_ROLES = ["visitor-1", "visitor-2", "visitor-3"];
  const CLAIM_FIELDS = ["claimantName", "contact", "evidence"];
  const REQUIRED_FIELDS = [
    "name",
    "category",
    "foundLocation",
    "foundDate",
    "publicDescription",
    "privateClue",
  ];

  const els = {
    resetSystem: document.getElementById("reset-system"),
    initializeSystem: document.getElementById("initialize-system"),
    runTests: document.getElementById("run-tests"),
    resetTests: document.getElementById("reset-tests"),
    navReport: document.getElementById("nav-report"),
    navMine: document.getElementById("nav-mine"),
    navReview: document.getElementById("nav-review"),
    navHistory: document.getElementById("nav-history"),
    navTests: document.getElementById("nav-tests"),
    testsTickets: document.getElementById("tests-tickets"),
    testsListWrap: document.getElementById("tests-list-wrap"),
    testsList: document.getElementById("tests-list"),
    testsDetail: document.getElementById("tests-detail"),
    testsBack: document.getElementById("tests-back"),
    testsHelper: document.getElementById("tests-helper"),
    reviewClaimList: document.getElementById("review-claim-list"),
    historyClaimList: document.getElementById("history-claim-list"),
    historyClaimFilter: document.getElementById("history-claim-filter"),
    historyClaimSort: document.getElementById("history-claim-sort"),
    reviewClaimSort: document.getElementById("review-claim-sort"),
    claimSort: document.getElementById("claim-sort"),
    itemClaims: document.getElementById("item-claims"),
    itemClaimsHeading: document.getElementById("item-claims-heading"),
    myClaimList: document.getElementById("my-claim-list"),
    claimFilter: document.getElementById("claim-filter"),
    claimDetail: document.getElementById("claim-detail"),
    claimDetailBack: document.getElementById("claim-detail-back"),
    banner: document.getElementById("banner"),
    listHeading: document.getElementById("list-heading"),
    listHelper: document.getElementById("list-helper"),
    itemList: document.getElementById("item-list"),
    itemSidebar: document.getElementById("item-sidebar"),
    itemDetail: document.getElementById("item-detail"),
    reportForm: document.getElementById("report-form"),
    formError: document.getElementById("form-error"),
    foundDay: document.getElementById("found-day"),
    foundMonth: document.getElementById("found-month"),
    foundYear: document.getElementById("found-year"),
    foundDate: document.getElementById("foundDate"),
    foundDatePicker: document.getElementById("foundDatePicker"),
    foundDateCalendar: document.getElementById("found-date-calendar"),
    foundDateField: document.getElementById("found-date-field"),
    claimForm: document.getElementById("claim-form"),
    claimFormError: document.getElementById("claim-form-error"),
    retractClaim: document.getElementById("retract-claim"),
    claimItemId: document.getElementById("claim-item-id"),
    views: {
      list: document.getElementById("view-list"),
      detail: document.getElementById("view-detail"),
      claim: document.getElementById("view-claim"),
      mine: document.getElementById("view-mine"),
      review: document.getElementById("view-review"),
      history: document.getElementById("view-history"),
      itemClaims: document.getElementById("view-item-claims"),
      report: document.getElementById("view-report"),
      tests: document.getElementById("view-tests"),
      claimDetail: document.getElementById("view-claim-detail"),
    },
  };

  const state = {
    role: loadRole(),
    view: "list",
    selectedId: null,
    selectedClaimId: null,
    claimDetailFrom: "review",
    claimFilter: "all",
    claimSort: "new",
    historyFilter: "all",
    historySort: "new",
    reviewSort: "new",
    testRun: null,
    testTicket: null,
    testCaseId: null,
    testsScreen: "tickets",
  };

  const CLAIM_FILTERS = {
    all: null,
    pending: "SUBMITTED",
    approved: "APPROVED",
    disapproved: "REJECTED",
    finalised: "finalised",
  };

  function isStaff() {
    return state.role === "staff";
  }

  function isVisitor() {
    return VISITOR_ROLES.indexOf(state.role) !== -1;
  }

  function visitorLabel(role) {
    if (role === "visitor-1") {
      return "Visitor 1";
    }
    if (role === "visitor-2") {
      return "Visitor 2";
    }
    if (role === "visitor-3") {
      return "Visitor 3";
    }
    return role || "";
  }

  function normalizeRole(role) {
    if (role === "staff") {
      return "staff";
    }
    if (VISITOR_ROLES.indexOf(role) !== -1) {
      return role;
    }
    if (role === "visitor") {
      return "visitor-1";
    }
    return "visitor-1";
  }

  function loadRole() {
    return normalizeRole(sessionStorage.getItem(ROLE_KEY));
  }

  function setRole(role) {
    state.role = normalizeRole(role);
    sessionStorage.setItem(ROLE_KEY, state.role);
    if (
      isVisitor() &&
      (state.view === "report" ||
        state.view === "review" ||
        state.view === "history" ||
        state.view === "tests" ||
        state.view === "claim-detail")
    ) {
      clearFieldErrors();
      state.selectedClaimId = null;
      state.view = "list";
    }
    if (isStaff() && (state.view === "claim" || state.view === "mine")) {
      clearClaimFieldErrors();
      state.view = "list";
    }
    if (isVisitor()) {
      const selected = getItem(state.selectedId);
      if (selected && selected.status === "DRAFT") {
        state.selectedId = null;
        state.view = "list";
      }
    }
    render();
  }

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (error) {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function loadClaims() {
    try {
      const raw = localStorage.getItem(CLAIMS_KEY);
      const claims = raw ? JSON.parse(raw) : [];
      return Array.isArray(claims) ? claims : [];
    } catch (error) {
      return [];
    }
  }

  function saveClaims(claims) {
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));
  }

  function myClaims() {
    if (!isVisitor()) {
      return [];
    }
    return loadClaims().filter(function (claim) {
      return claim.visitorId === state.role;
    });
  }

  function myClaimsForItem(itemId) {
    return myClaims().filter(function (claim) {
      return claim.itemId === itemId;
    });
  }

  function seenRejectedStorageKey() {
    return SEEN_REJECTED_KEY + "." + state.role;
  }

  function loadSeenRejectedIds() {
    try {
      const raw = localStorage.getItem(seenRejectedStorageKey());
      const ids = raw ? JSON.parse(raw) : [];
      return Array.isArray(ids) ? ids : [];
    } catch (error) {
      return [];
    }
  }

  function saveSeenRejectedIds(ids) {
    localStorage.setItem(seenRejectedStorageKey(), JSON.stringify(ids));
  }

  function isRejectedSeen(claimId) {
    return loadSeenRejectedIds().indexOf(claimId) !== -1;
  }

  function markRejectedClaimsSeen(itemId) {
    if (!isVisitor() || !itemId) {
      return;
    }
    const seen = loadSeenRejectedIds();
    let changed = false;
    myClaimsForItem(itemId).forEach(function (claim) {
      if (claim.status === "REJECTED" && seen.indexOf(claim.id) === -1) {
        seen.push(claim.id);
        changed = true;
      }
    });
    if (changed) {
      saveSeenRejectedIds(seen);
    }
  }

  function showsReservedBox(item) {
    return Boolean(item) && item.status === "RESERVED";
  }

  function itemListClaimClass(item) {
    if (!isVisitor()) {
      return "";
    }
    const claims = myClaimsForItem(item.id);
    const unseenRejected = claims.some(function (claim) {
      return claim.status === "REJECTED" && !isRejectedSeen(claim.id);
    });
    if (unseenRejected) {
      return " is-claim-rejected";
    }
    const submitted = claims.some(function (claim) {
      return claim.status === "SUBMITTED";
    });
    const approved = claims.some(function (claim) {
      return claim.status === "APPROVED";
    });
    if (approved) {
      return " is-claim-approved";
    }
    if (submitted) {
      return " is-claim-submitted";
    }
    return "";
  }

  function itemStatusPillClass(item) {
    if (item.status === "DRAFT") {
      return " is-draft";
    }
    if (item.status === "PUBLISHED") {
      return " is-published";
    }
    if (showsReservedBox(item)) {
      return " is-reserved";
    }
    return "";
  }

  function claimStatusClass(status) {
    if (status === "SUBMITTED") {
      return " is-submitted";
    }
    if (status === "APPROVED") {
      return " is-approved";
    }
    if (status === "REJECTED") {
      return " is-rejected";
    }
    return "";
  }

  function canClaimItem(item) {
    return Boolean(item) && item.status === "PUBLISHED";
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "item-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function getItem(id) {
    return loadItems().find(function (item) {
      return item.id === id;
    });
  }

  function getClaim(id) {
    return loadClaims().find(function (claim) {
      return claim.id === id;
    });
  }

  function claimsForItem(itemId) {
    if (!itemId) {
      return [];
    }
    return loadClaims()
      .filter(function (claim) {
        return claim.itemId === itemId;
      })
      .slice()
      .reverse();
  }

  function visibleItems() {
    const items = loadItems();
    if (isStaff()) {
      return items.slice().reverse();
    }
    return items
      .filter(function (item) {
        return item.status === "PUBLISHED" || item.status === "RESERVED";
      })
      .reverse();
  }

  function showView(view) {
    const next =
      view === "report"
        ? "report"
        : view === "claim"
          ? "claim"
          : view === "mine"
            ? "mine"
            : view === "review"
              ? "review"
              : view === "history"
                ? "history"
                : view === "tests"
                  ? "tests"
                  : view === "claim-detail"
                    ? "claim-detail"
                    : "list";
    if (next !== "report") {
      clearFieldErrors();
    }
    if (next !== "claim") {
      clearClaimFieldErrors();
    }
    if (next !== "claim-detail") {
      state.selectedClaimId = null;
    }
    if (next === "mine") {
      state.claimFilter = "all";
      state.claimSort = "new";
    }
    if (next === "history") {
      state.historyFilter = "all";
      state.historySort = "new";
    }
    if (next === "review") {
      state.reviewSort = "new";
    }
    if (next === "tests") {
      state.testsScreen = "tickets";
      state.testTicket = null;
      state.testCaseId = null;
    }
    state.view = next;
    render();
  }

  function showBanner(message, tone) {
    state.banner = {
      message: message,
      isError: tone === true || tone === "error",
      isSuccess: tone === "success",
    };
    render();
  }

  function clearBanner() {
    state.banner = null;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value + "T00:00:00");
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function renderRole() {
    document.querySelectorAll("[data-role]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.role === state.role);
    });
    els.navReport.hidden = !isStaff();
    els.navReview.hidden = !isStaff();
    els.navHistory.hidden = !isStaff();
    els.navTests.hidden = !isStaff();
    els.navMine.hidden = !isVisitor();
    if (els.resetSystem) {
      els.resetSystem.hidden = !isStaff();
    }
    if (els.initializeSystem) {
      els.initializeSystem.hidden = !isStaff();
    }
    if (els.runTests) {
      els.runTests.hidden = !isStaff();
    }
    if (els.resetTests) {
      els.resetTests.hidden = !isStaff();
    }
  }

  function renderNav() {
    const activeView =
      state.view === "claim-detail"
        ? state.claimDetailFrom === "list"
          ? "list"
          : state.claimDetailFrom === "history"
            ? "history"
            : "review"
        : state.view;
    document.querySelectorAll(".nav-link").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.view === activeView);
    });
    const pending = loadClaims().filter(function (claim) {
      return claim.status === "SUBMITTED";
    }).length;
    els.navReview.textContent =
      pending > 0
        ? "Review claims (" + (pending > 3 ? "3+" : pending) + ")"
        : "Review claims";
    els.navReview.classList.toggle("has-pending", pending > 0);
  }

  function renderBanner() {
    if (!state.banner) {
      els.banner.hidden = true;
      els.banner.textContent = "";
      els.banner.classList.remove("is-error", "is-success");
      return;
    }
    els.banner.hidden = false;
    els.banner.textContent = state.banner.message;
    els.banner.classList.toggle("is-error", state.banner.isError);
    els.banner.classList.toggle("is-success", Boolean(state.banner.isSuccess));
  }

  function renderList() {
    const items = visibleItems();
    const staffView = isStaff();

    els.listHeading.textContent = staffView ? "Staff item catalogue" : "Available items";
    els.listHelper.textContent = staffView
      ? "Drafts stay off the public list until you publish them."
      : "Published and reserved items are shown. Reserved items cannot be claimed.";

    if (items.length === 0) {
      els.itemList.innerHTML =
        '<div class="empty-state">' +
        (staffView
          ? "No items reported yet. Use Report found item to add a draft."
          : "No published or reserved items yet. Check back after staff publish a found item.") +
        "</div>";
      return;
    }

    els.itemList.innerHTML = items
      .map(function (item) {
        return (
          '<button type="button" class="item-card' +
          (item.id === state.selectedId ? " is-selected" : "") +
          itemListClaimClass(item) +
          '" data-item-id="' +
          escapeHtml(item.id) +
          '">' +
          '<span class="status-pill' +
          itemStatusPillClass(item) +
          '">' +
          escapeHtml(item.status) +
          "</span>" +
          "<h3>" +
          escapeHtml(item.name) +
          "</h3>" +
          '<p class="item-meta">' +
          escapeHtml(item.category) +
          " · Found at " +
          escapeHtml(item.foundLocation) +
          "</p>" +
          '<p class="item-meta">Found ' +
          escapeHtml(formatDate(item.foundDate)) +
          "</p>" +
          "</button>"
        );
      })
      .join("");
  }

  function publicDetailFields(item) {
    return [
      ["Category", item.category],
      ["Found location", item.foundLocation],
      ["Found date", formatDate(item.foundDate)],
      ["Public description", item.publicDescription],
      ["Status", item.status],
    ];
  }

  function renderDetail() {
    const item = getItem(state.selectedId);
    const staffView = isStaff();

    if (!item || (item.status === "DRAFT" && !staffView)) {
      els.itemDetail.innerHTML =
        '<div class="empty-state">This item is not available in the public catalogue.</div>';
      return;
    }
    const fields = publicDetailFields(item)
      .map(function (entry) {
        return (
          "<div><span>" +
          escapeHtml(entry[0]) +
          "</span><strong>" +
          escapeHtml(entry[1]) +
          "</strong></div>"
        );
      })
      .join("");

    const privateBlock =
      staffView
        ? '<div class="private-box"><span>Private clue (staff only)</span><p>' +
          escapeHtml(item.privateClue) +
          "</p></div>"
        : "";

    const publishAction =
      staffView && item.status === "DRAFT"
        ? '<div class="detail-actions"><button type="button" class="btn btn-primary" id="publish-item">Publish item</button></div>'
        : "";

    const claimAction =
      !staffView && canClaimItem(item)
        ? state.view === "claim"
          ? '<div class="detail-actions"><button type="button" class="btn" id="retract-claim-item">Retract claim</button></div>'
          : '<div class="detail-actions"><button type="button" class="btn btn-primary" id="claim-item">Claim item</button></div>'
        : "";

    els.itemDetail.innerHTML =
      '<span class="status-pill' +
      itemStatusPillClass(item) +
      '">' +
      escapeHtml(item.status) +
      "</span>" +
      "<h2 id=\"detail-heading\">" +
      escapeHtml(item.name) +
      "</h2>" +
      '<div class="detail-list">' +
      fields +
      "</div>" +
      privateBlock +
      publishAction +
      claimAction;
  }

  function claimCardHtml(claim, clickable) {
    const item = getItem(claim.itemId);
    const itemName = item ? item.name : "Unknown item";
    const decisionBlock =
      claim.decision
        ? "<div><span>Decision</span><strong>" +
          escapeHtml(claim.decision) +
          "</strong></div>"
        : "";
    const tag = clickable ? "button" : "article";
    const extra = clickable
      ? ' type="button" data-claim-item-id="' + escapeHtml(claim.itemId) + '"'
      : "";

    return (
      "<" +
      tag +
      ' class="claim-card' +
      claimStatusClass(claim.status) +
      '"' +
      extra +
      ">" +
      '<span class="status-pill' +
      claimStatusClass(claim.status) +
      '">' +
      escapeHtml(claim.status) +
      "</span>" +
      "<h3>" +
      escapeHtml(itemName) +
      "</h3>" +
      '<div class="detail-list">' +
      "<div><span>Claimant name</span><strong>" +
      escapeHtml(claim.claimantName) +
      "</strong></div>" +
      "<div><span>Contact</span><strong>" +
      escapeHtml(claim.contact) +
      "</strong></div>" +
      "<div><span>Evidence</span><strong>" +
      escapeHtml(claim.evidence) +
      "</strong></div>" +
      decisionBlock +
      "</div></" +
      tag +
      ">"
    );
  }

  function renderItemClaims() {
    if (isStaff()) {
      const claims = claimsForItem(state.selectedId);
      els.itemClaimsHeading.textContent = "Claims for this item";
      if (claims.length === 0) {
        els.itemClaims.innerHTML = "";
        return;
      }
      els.itemClaims.innerHTML = claims
        .map(function (claim) {
          return staffClaimRowHtml(claim);
        })
        .join("");
      return;
    }

    const claims = myClaimsForItem(state.selectedId);
    els.itemClaimsHeading.textContent = "Your claims";
    if (claims.length === 0) {
      els.itemClaims.innerHTML = "";
      return;
    }
    els.itemClaims.innerHTML = claims
      .map(function (claim) {
        return claimCardHtml(claim, false);
      })
      .join("");
  }

  function isFinalisedClaim(claim) {
    return claim.status === "APPROVED" || claim.status === "REJECTED";
  }

  function claimTime(claim, index) {
    return Number(claim.decidedAt) || Number(claim.createdAt) || index;
  }

  function visitorClaimTime(claim, index) {
    return Number(claim.createdAt) || Number(claim.decidedAt) || index;
  }

  function sortClaims(claims, direction, getTime) {
    const timeOf = getTime || claimTime;
    return claims
      .map(function (claim, index) {
        return { claim: claim, index: index, time: timeOf(claim, index) };
      })
      .sort(function (a, b) {
        if (a.time !== b.time) {
          return direction === "old" ? a.time - b.time : b.time - a.time;
        }
        return direction === "old" ? a.index - b.index : b.index - a.index;
      })
      .map(function (entry) {
        return entry.claim;
      });
  }

  function renderSortButtons(container, current) {
    if (!container) {
      return;
    }
    container.querySelectorAll("[data-sort]").forEach(function (button) {
      const active = button.dataset.sort === current;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function bindSort(container, key, renderFn) {
    if (!container) {
      return;
    }
    container.addEventListener("click", function (event) {
      const button = event.target.closest("[data-sort]");
      if (!button) {
        return;
      }
      const sort = button.dataset.sort;
      if (sort !== "new" && sort !== "old") {
        return;
      }
      state[key] = sort;
      renderFn();
    });
  }

  function filteredMyClaims() {
    const claims = myClaims();
    if (state.claimFilter === "all") {
      return claims;
    }
    if (state.claimFilter === "finalised") {
      return claims.filter(isFinalisedClaim);
    }
    const status = CLAIM_FILTERS[state.claimFilter];
    if (!status) {
      return claims;
    }
    return claims.filter(function (claim) {
      return claim.status === status;
    });
  }

  function renderClaimFilter() {
    if (!els.claimFilter) {
      return;
    }
    els.claimFilter.querySelectorAll("[data-claim-filter]").forEach(function (button) {
      const active = button.dataset.claimFilter === state.claimFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function emptyFilterMessage() {
    if (state.claimFilter === "pending") {
      return "You have no pending claims.";
    }
    if (state.claimFilter === "approved") {
      return "You have no approved claims.";
    }
    if (state.claimFilter === "disapproved") {
      return "You have no disapproved claims.";
    }
    if (state.claimFilter === "finalised") {
      return "You have no finalised claims.";
    }
    return "You have not submitted any claims yet.";
  }

  function claimCardsHtml(claims) {
    return claims
      .map(function (claim) {
        return claimCardHtml(claim, true);
      })
      .join("");
  }

  function claimGroupHtml(title, helper, claims, emptyMessage) {
    const body =
      claims.length > 0
        ? '<div class="claim-list">' + claimCardsHtml(claims) + "</div>"
        : '<div class="empty-state">' + emptyMessage + "</div>";
    return (
      '<section class="claim-group">' +
      "<h3>" +
      title +
      "</h3>" +
      (helper ? '<p class="helper">' + helper + "</p>" : "") +
      body +
      "</section>"
    );
  }

  function renderMyClaims() {
    renderClaimFilter();
    renderSortButtons(els.claimSort, state.claimSort);
    const allMine = sortClaims(myClaims(), state.claimSort, visitorClaimTime);
    if (allMine.length === 0) {
      els.myClaimList.innerHTML =
        '<div class="empty-state">You have not submitted any claims yet.</div>';
      return;
    }

    if (state.claimFilter === "all" || state.claimFilter === "finalised") {
      const finalised = allMine.filter(isFinalisedClaim);
      const groups = [];
      if (state.claimFilter === "all") {
        groups.push(
          claimGroupHtml(
            "Pending claims",
            "",
            allMine.filter(function (claim) {
              return claim.status === "SUBMITTED";
            }),
            "You have no pending claims."
          )
        );
      }
      groups.push(
        claimGroupHtml(
          "Finalised claims",
          "Approved and disapproved claims.",
          finalised,
          "You have no finalised claims."
        )
      );
      els.myClaimList.innerHTML = groups.join("");
      return;
    }

    const claims = sortClaims(filteredMyClaims(), state.claimSort, visitorClaimTime);
    if (claims.length === 0) {
      els.myClaimList.innerHTML =
        '<div class="empty-state">' + emptyFilterMessage() + "</div>";
      return;
    }
    els.myClaimList.innerHTML =
      '<div class="claim-list">' + claimCardsHtml(claims) + "</div>";
  }

  function itemHasApprovedClaim(itemId, claims) {
    return claims.some(function (claim) {
      return claim.itemId === itemId && claim.status === "APPROVED";
    });
  }

  function staffClaimRowHtml(claim, options) {
    const item = getItem(claim.itemId);
    const when =
      options && options.showWhen && claim.decidedAt
        ? " · " + escapeHtml(formatDateTime(claim.decidedAt))
        : "";
    return (
      '<article class="claim-row' +
      claimStatusClass(claim.status) +
      '">' +
      '<div class="claim-row-main">' +
      '<div class="claim-row-top">' +
      '<span class="status-pill' +
      claimStatusClass(claim.status) +
      '">' +
      escapeHtml(claim.status) +
      "</span>" +
      "<h3>" +
      escapeHtml(item ? item.name : "Unknown item") +
      "</h3>" +
      "</div>" +
      '<p class="claim-row-meta">' +
      escapeHtml(visitorLabel(claim.visitorId) || "Unknown visitor") +
      " · " +
      escapeHtml(claim.claimantName) +
      when +
      "</p>" +
      "</div>" +
      '<button type="button" class="btn" data-open-claim="' +
      escapeHtml(claim.id) +
      '">More info</button></article>'
    );
  }

  function openClaimDetail(claimId, fromView) {
    if (!isStaff()) {
      return;
    }
    const claim = getClaim(claimId);
    if (!claim) {
      showBanner("That claim could not be found.", true);
      return;
    }
    clearBanner();
    state.selectedClaimId = claim.id;
    state.selectedId = claim.itemId;
    state.claimDetailFrom =
      fromView === "list" ? "list" : fromView === "history" ? "history" : "review";
    state.view = "claim-detail";
    render();
  }

  function renderClaimDetail() {
    const claim = getClaim(state.selectedClaimId);
    if (!claim) {
      els.claimDetail.className = "detail-card";
      els.claimDetail.innerHTML =
        '<div class="empty-state">This claim could not be found.</div>';
      return;
    }

    const item = getItem(claim.itemId);
    const itemBlock = item
      ? '<div class="detail-row">' +
        "<div><span>Item</span><strong>" +
        escapeHtml(item.name) +
        "</strong></div>" +
        "<div><span>Item status</span><strong>" +
        escapeHtml(item.status) +
        "</strong></div>" +
        "<div><span>Category</span><strong>" +
        escapeHtml(item.category) +
        "</strong></div>" +
        "</div>" +
        '<div class="detail-row is-two">' +
        "<div><span>Found location</span><strong>" +
        escapeHtml(item.foundLocation) +
        "</strong></div>" +
        "<div><span>Found date</span><strong>" +
        escapeHtml(formatDate(item.foundDate)) +
        "</strong></div>" +
        "</div>" +
        '<div class="detail-row is-two">' +
        "<div><span>Public description</span><strong>" +
        escapeHtml(item.publicDescription) +
        "</strong></div>" +
        '<div class="private-box"><span>Private clue (staff only)</span><p>' +
        escapeHtml(item.privateClue) +
        "</p></div>" +
        "</div>"
      : "<div><span>Item</span><strong>Unknown item</strong></div>";

    const decisionBlock =
      claim.decision
        ? "<div><span>Decision</span><strong>" +
          escapeHtml(claim.decision) +
          "</strong></div>"
        : "";

    const actions =
      claim.status === "SUBMITTED"
        ? '<div class="staff-decision">' +
          '<span class="field-error" id="decision-reason-error" hidden>This field is required.</span>' +
          '<div class="detail-actions staff-claim-actions">' +
          '<input type="text" data-decision-for="' +
          escapeHtml(claim.id) +
          '" maxlength="300" placeholder="Decision reason" aria-label="Decision reason" />' +
          '<button type="button" class="btn btn-approve" data-decide="APPROVED" data-claim-id="' +
          escapeHtml(claim.id) +
          '">Approve</button>' +
          '<button type="button" class="btn btn-reject" data-decide="REJECTED" data-claim-id="' +
          escapeHtml(claim.id) +
          '">Reject</button></div></div>'
        : "";

    els.claimDetail.className = "detail-card" + claimStatusClass(claim.status);
    els.claimDetail.innerHTML =
      '<div class="claim-detail-title">' +
      "<h2>" +
      escapeHtml(item ? item.name : "Unknown item") +
      "</h2>" +
      '<span class="status-pill' +
      claimStatusClass(claim.status) +
      '">' +
      escapeHtml(claim.status) +
      "</span>" +
      "</div>" +
      '<div class="detail-list is-compact">' +
      itemBlock +
      '<div class="detail-row">' +
      "<div><span>Submitted by</span><strong>" +
      escapeHtml(visitorLabel(claim.visitorId) || "Unknown visitor") +
      "</strong></div>" +
      "<div><span>Claimant name</span><strong>" +
      escapeHtml(claim.claimantName) +
      "</strong></div>" +
      "<div><span>Contact</span><strong>" +
      escapeHtml(claim.contact) +
      "</strong></div>" +
      "</div>" +
      "<div><span>Evidence</span><strong>" +
      escapeHtml(claim.evidence) +
      "</strong></div>" +
      decisionBlock +
      "</div>" +
      actions;
  }

  function historyClaims() {
    return loadClaims()
      .map(function (claim, index) {
        return { claim: claim, index: index };
      })
      .filter(function (entry) {
        return isFinalisedClaim(entry.claim);
      })
      .filter(function (entry) {
        if (state.historyFilter === "approved") {
          return entry.claim.status === "APPROVED";
        }
        if (state.historyFilter === "disapproved") {
          return entry.claim.status === "REJECTED";
        }
        return true;
      })
      .sort(function (a, b) {
        const aTime = Number(a.claim.decidedAt) || Number(a.claim.createdAt) || 0;
        const bTime = Number(b.claim.decidedAt) || Number(b.claim.createdAt) || 0;
        if (aTime !== bTime) {
          return state.historySort === "old" ? aTime - bTime : bTime - aTime;
        }
        return state.historySort === "old" ? a.index - b.index : b.index - a.index;
      })
      .map(function (entry) {
        return entry.claim;
      });
  }

  function renderHistoryFilter() {
    if (!els.historyClaimFilter) {
      return;
    }
    els.historyClaimFilter.querySelectorAll("[data-history-filter]").forEach(function (button) {
      const active = button.dataset.historyFilter === state.historyFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function emptyHistoryMessage() {
    if (state.historyFilter === "approved") {
      return "No approved claims in the archive.";
    }
    if (state.historyFilter === "disapproved") {
      return "No disapproved claims in the archive.";
    }
    return "No finalised claims yet.";
  }

  function renderHistoryClaims() {
    renderHistoryFilter();
    renderSortButtons(els.historyClaimSort, state.historySort);
    const claims = historyClaims();
    if (claims.length === 0) {
      els.historyClaimList.innerHTML =
        '<div class="empty-state">' + emptyHistoryMessage() + "</div>";
      return;
    }
    els.historyClaimList.innerHTML = claims
      .map(function (claim) {
        return staffClaimRowHtml(claim, { showWhen: true });
      })
      .join("");
  }

  function renderReviewClaims() {
    renderSortButtons(els.reviewClaimSort, state.reviewSort);
    const claims = sortClaims(
      loadClaims().filter(function (claim) {
        return claim.status === "SUBMITTED";
      }),
      state.reviewSort,
      visitorClaimTime
    );
    if (claims.length === 0) {
      els.reviewClaimList.innerHTML =
        '<div class="empty-state">No submitted claims to review.</div>';
      return;
    }
    els.reviewClaimList.innerHTML = claims
      .map(function (claim) {
        return staffClaimRowHtml(claim);
      })
      .join("");
  }

  function showDecisionReasonError() {
    const error = document.getElementById("decision-reason-error");
    const input = document.querySelector("[data-decision-for]");
    if (error) {
      error.hidden = false;
    }
    if (input) {
      input.classList.add("is-invalid");
      input.focus();
    }
  }

  function clearDecisionReasonError() {
    const error = document.getElementById("decision-reason-error");
    const input = document.querySelector("[data-decision-for]");
    if (error) {
      error.hidden = true;
    }
    if (input) {
      input.classList.remove("is-invalid");
    }
  }

  function decideClaim(claimId, nextStatus) {
    if (!isStaff()) {
      showBanner("Only staff can decide a claim.", true);
      return;
    }
    if (nextStatus !== "APPROVED" && nextStatus !== "REJECTED") {
      return;
    }

    const claims = loadClaims();
    const claim = claims.find(function (entry) {
      return entry.id === claimId;
    });
    if (nextStatus === "APPROVED" && claim && itemHasApprovedClaim(claim.itemId, claims)) {
      window.alert(
        "Warning! Item already has an approved claim. Cannot approve further claims."
      );
      return;
    }

    const input = document.querySelector(
      '[data-decision-for="' + claimId + '"]'
    );
    const decisionReason = input ? String(input.value || "").trim() : "";
    if (!decisionReason) {
      showDecisionReasonError();
      return;
    }
    clearDecisionReasonError();

    const confirmText =
      nextStatus === "APPROVED"
        ? "Approve this claim? The item will be reserved and no further claims will be accepted."
        : "Reject this claim?";
    if (!window.confirm(confirmText)) {
      return;
    }

    if (!claim || claim.status !== "SUBMITTED") {
      showBanner("Only a SUBMITTED claim can be decided.", true);
      return;
    }

    const items = loadItems();
    const item = items.find(function (entry) {
      return entry.id === claim.itemId;
    });

    if (nextStatus === "APPROVED") {
      if (!item || item.status !== "PUBLISHED") {
        showBanner("Only a PUBLISHED item can be reserved.", true);
        return;
      }
      item.status = "RESERVED";
      saveItems(items);
    }

    claim.status = nextStatus;
    claim.decision = decisionReason;
    claim.decidedAt = Date.now();
    saveClaims(claims);
    showBanner(
      nextStatus === "APPROVED"
        ? "Claim approved. The item is now reserved."
        : "Claim rejected.",
      "success"
    );
    els.banner.scrollIntoView({ block: "nearest" });
  }

  function padDatePart(value, size) {
    return String(value).padStart(size, "0");
  }

  function isValidYmd(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
      return false;
    }
    if (String(year).length !== 4 || m < 1 || m > 12 || d < 1 || d > 31) {
      return false;
    }
    const date = new Date(y, m - 1, d);
    return (
      date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d
    );
  }

  function foundDateParts() {
    return {
      day: els.foundDay.value.trim(),
      month: els.foundMonth.value.trim(),
      year: els.foundYear.value.trim(),
    };
  }

  function composeFoundDate() {
    const parts = foundDateParts();
    if (!parts.day || !parts.month || !parts.year) {
      return "";
    }
    if (!isValidYmd(parts.year, parts.month, parts.day)) {
      return "";
    }
    return (
      padDatePart(parts.year, 4) +
      "-" +
      padDatePart(parts.month, 2) +
      "-" +
      padDatePart(parts.day, 2)
    );
  }

  function syncFoundDateFromParts() {
    const iso = composeFoundDate();
    els.foundDate.value = iso;
    els.foundDatePicker.value = iso;
  }

  function setFoundDateFromIso(iso) {
    if (!iso) {
      els.foundDay.value = "";
      els.foundMonth.value = "";
      els.foundYear.value = "";
      els.foundDate.value = "";
      els.foundDatePicker.value = "";
      return;
    }
    const bits = iso.split("-");
    els.foundYear.value = bits[0] || "";
    els.foundMonth.value = bits[1] || "";
    els.foundDay.value = bits[2] || "";
    els.foundDate.value = iso;
    els.foundDatePicker.value = iso;
  }

  function foundDateError() {
    const parts = foundDateParts();
    if (!parts.day && !parts.month && !parts.year) {
      return "This field is required.";
    }
    if (!parts.day || !parts.month || !parts.year) {
      return "Enter the date as DD/MM/YYYY.";
    }
    if (!isValidYmd(parts.year, parts.month, parts.day)) {
      return "Enter a valid date as DD/MM/YYYY.";
    }
    return "";
  }

  function digitsOnly(value) {
    return String(value).replace(/\D/g, "");
  }

  function bindFoundDateInputs() {
    const boxes = [
      { input: els.foundDay, max: 2, next: els.foundMonth },
      { input: els.foundMonth, max: 2, next: els.foundYear },
      { input: els.foundYear, max: 4, next: null },
    ];

    boxes.forEach(function (box) {
      box.input.addEventListener("input", function () {
        box.input.value = digitsOnly(box.input.value).slice(0, box.max);
        syncFoundDateFromParts();
        if (box.next && box.input.value.length === box.max) {
          box.next.focus();
        }
      });
    });

    els.foundDatePicker.addEventListener("change", function () {
      setFoundDateFromIso(els.foundDatePicker.value);
    });

    els.foundDateCalendar.addEventListener("click", function () {
      if (typeof els.foundDatePicker.showPicker === "function") {
        try {
          els.foundDatePicker.showPicker();
          return;
        } catch (error) {
          // Fall through to a click if the browser blocks showPicker.
        }
      }
      els.foundDatePicker.click();
    });
  }

  function clearClaimFieldErrors() {
    if (!els.claimForm) {
      return;
    }
    els.claimFormError.hidden = true;
    els.claimFormError.textContent = "";
    els.claimForm.querySelectorAll("label").forEach(function (label) {
      label.classList.remove("is-invalid");
    });
    els.claimForm.querySelectorAll(".field-error").forEach(function (node) {
      node.remove();
    });
  }

  function showClaimFieldError(field, message) {
    const input = els.claimForm.elements[field];
    const label = input.closest("label");
    label.classList.add("is-invalid");
    const error = document.createElement("span");
    error.className = "field-error";
    error.textContent = message;
    label.appendChild(error);
  }

  function validateClaim(data) {
    const errors = {};
    CLAIM_FIELDS.forEach(function (field) {
      if (!data[field] || !String(data[field]).trim()) {
        errors[field] = "This field is required.";
      }
    });
    return errors;
  }

  function openClaimForm() {
    if (!isVisitor()) {
      showBanner("Only visitors can submit a claim.", true);
      return;
    }
    const item = getItem(state.selectedId);
    if (!canClaimItem(item)) {
      showBanner("A claim can only be submitted for a PUBLISHED item.", true);
      return;
    }
    clearBanner();
    showView("claim");
  }

  function retractClaimForm() {
    els.claimForm.reset();
    autosizeClaimTextareas();
    clearClaimFieldErrors();
    clearBanner();
    showView("list");
  }

  function handleClaimSubmit(event) {
    event.preventDefault();
    clearClaimFieldErrors();

    if (!isVisitor()) {
      showBanner("Only visitors can submit a claim.", true);
      return;
    }

    const item = getItem(state.selectedId);
    if (!canClaimItem(item)) {
      showBanner("A claim can only be submitted for a PUBLISHED item.", true);
      return;
    }

    const formData = new FormData(els.claimForm);
    const data = {
      claimantName: String(formData.get("claimantName") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      evidence: String(formData.get("evidence") || "").trim(),
    };

    const errors = validateClaim(data);
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      errorFields.forEach(function (field) {
        showClaimFieldError(field, errors[field]);
      });
      els.claimFormError.hidden = false;
      els.claimFormError.textContent = "Please complete the required fields before submitting.";
      return;
    }

    const claim = {
      id: createId(),
      itemId: item.id,
      visitorId: state.role,
      claimantName: data.claimantName,
      contact: data.contact,
      evidence: data.evidence,
      status: "SUBMITTED",
      decision: "",
      createdAt: Date.now(),
    };

    const claims = loadClaims();
    claims.push(claim);
    saveClaims(claims);
    els.claimForm.reset();
    autosizeClaimTextareas();
    state.view = "list";
    showBanner("Claim submitted. Staff can review it; other visitors cannot see your evidence.");
  }

  function clearFieldErrors() {
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.reportForm.querySelectorAll("label, .date-field").forEach(function (field) {
      field.classList.remove("is-invalid");
    });
    els.reportForm.querySelectorAll(".field-error").forEach(function (node) {
      node.remove();
    });
  }

  function showFieldError(field, message) {
    const input = els.reportForm.elements[field];
    const label = input.closest("label") || els.foundDateField;
    label.classList.add("is-invalid");
    const error = document.createElement("span");
    error.className = "field-error";
    error.textContent = message;
    label.appendChild(error);
  }

  function validateReport(data) {
    const errors = {};
    REQUIRED_FIELDS.forEach(function (field) {
      if (field === "foundDate") {
        const dateError = foundDateError();
        if (dateError) {
          errors[field] = dateError;
        }
        return;
      }
      if (!data[field] || !String(data[field]).trim()) {
        errors[field] = "This field is required.";
      }
    });
    return errors;
  }

  function handleReportSubmit(event) {
    event.preventDefault();
    clearFieldErrors();

    if (!isStaff()) {
      showBanner("Only staff can report a found item.", true);
      return;
    }

    syncFoundDateFromParts();
    const formData = new FormData(els.reportForm);
    const data = {
      name: String(formData.get("name") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      foundLocation: String(formData.get("foundLocation") || "").trim(),
      foundDate: String(formData.get("foundDate") || "").trim(),
      publicDescription: String(formData.get("publicDescription") || "").trim(),
      privateClue: String(formData.get("privateClue") || "").trim(),
    };

    const errors = validateReport(data);
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      errorFields.forEach(function (field) {
        showFieldError(field, errors[field]);
      });
      els.formError.hidden = false;
      els.formError.textContent = "Please complete the required fields before saving.";
      return;
    }

    const item = {
      id: createId(),
      name: data.name,
      category: data.category,
      foundLocation: data.foundLocation,
      foundDate: data.foundDate,
      publicDescription: data.publicDescription,
      privateClue: data.privateClue,
      status: "DRAFT",
    };

    const items = loadItems();
    items.push(item);
    saveItems(items);
    els.reportForm.reset();
    autosizeReportTextareas();
    state.selectedId = item.id;
    state.view = "list";
    showBanner("Draft saved. Visitors cannot see this item until you publish it.", "success");
  }

  function publishSelectedItem() {
    if (!isStaff()) {
      showBanner("Only staff can publish an item.", true);
      return;
    }

    const items = loadItems();
    const item = items.find(function (entry) {
      return entry.id === state.selectedId;
    });

    if (!item) {
      showBanner("That item could not be found.", true);
      return;
    }

    if (item.status !== "DRAFT") {
      showBanner("Only a DRAFT item can be published.", true);
      return;
    }

    item.status = "PUBLISHED";
    saveItems(items);
    showBanner("Item published. Visitors can now browse it on the public list.", "success");
  }

  function selectedItemIsVisible() {
    const item = getItem(state.selectedId);
    if (!item) {
      return false;
    }
    return isStaff() || item.status !== "DRAFT";
  }

  function renderViews() {
    const onReport = state.view === "report";
    const onReview = state.view === "review" && isStaff();
    const onHistory = state.view === "history" && isStaff();
    const onClaimDetail = state.view === "claim-detail" && isStaff();
    const onTests = state.view === "tests" && isStaff();
    const onMine = state.view === "mine" && isVisitor();
    const selected = getItem(state.selectedId);
    const onClaim =
      state.view === "claim" &&
      isVisitor() &&
      canClaimItem(selected);
    if (state.view === "claim" && !onClaim) {
      state.view = "list";
    }
    if (state.view === "mine" && !onMine) {
      state.view = "list";
    }
    if (state.view === "review" && !onReview) {
      state.view = "list";
    }
    if (state.view === "history" && !onHistory) {
      state.view = "list";
    }
    if (state.view === "claim-detail" && !onClaimDetail) {
      state.selectedClaimId = null;
      state.view = "list";
    }
    if (state.view === "tests" && !onTests) {
      state.view = "list";
    }
    const hideCatalogue =
      onReport || onMine || onReview || onHistory || onClaimDetail || onTests;
    const listedItemClaims = isStaff()
      ? claimsForItem(state.selectedId)
      : isVisitor()
        ? myClaimsForItem(state.selectedId)
        : [];
    els.views.list.hidden = hideCatalogue;
    els.itemSidebar.hidden = hideCatalogue;
    els.views.report.hidden = !onReport;
    els.views.review.hidden = !onReview;
    els.views.history.hidden = !onHistory;
    els.views.claimDetail.hidden = !onClaimDetail;
    els.views.tests.hidden = !onTests;
    els.views.mine.hidden = !onMine;
    els.views.claim.hidden = !onClaim;
    els.views.detail.hidden = hideCatalogue || !selectedItemIsVisible();
    els.views.itemClaims.hidden =
      hideCatalogue ||
      !selectedItemIsVisible() ||
      listedItemClaims.length === 0;
    if (onClaim && els.claimItemId) {
      els.claimItemId.value = state.selectedId || "";
    }
    if (!hideCatalogue) {
      renderList();
    }
    renderDetail();
    if (!els.views.itemClaims.hidden) {
      renderItemClaims();
    }
    if (onMine) {
      renderMyClaims();
    }
    if (onReview) {
      renderReviewClaims();
    }
    if (onHistory) {
      renderHistoryClaims();
    }
    if (onClaimDetail) {
      renderClaimDetail();
    }
    if (onTests) {
      renderTestResults();
    }
  }

  function ticketPassed(ticket) {
    return ticket.tests.every(function (test) {
      return test.passed;
    });
  }

  function renderTestResults() {
    if (!els.testsTickets) {
      return;
    }
    const run = state.testRun;
    if (!run || !run.tickets || run.tickets.length === 0) {
      els.testsHelper.textContent =
        "Run tests from Staff to see pass and fail results for each ticket.";
      els.testsTickets.innerHTML = "";
      els.testsTickets.hidden = true;
      els.testsListWrap.hidden = true;
      els.testsDetail.hidden = true;
      return;
    }

    els.testsHelper.textContent =
      state.testsScreen === "tickets"
        ? "Open a ticket to see its tests."
        : state.testsScreen === "list"
          ? "Open a test to see full details."
          : "Full result for the selected test.";

    if (state.testsScreen === "tickets") {
      els.testsTickets.hidden = false;
      els.testsListWrap.hidden = true;
      els.testsDetail.hidden = true;
      els.testsTickets.innerHTML = run.tickets
        .map(function (ticket) {
          return (
            '<button type="button" class="btn' +
            (ticketPassed(ticket) ? " is-passed" : " is-failed") +
            '" data-test-ticket="' +
            escapeHtml(ticket.id) +
            '">' +
            escapeHtml(ticket.title) +
            "</button>"
          );
        })
        .join("");
      return;
    }

    const ticket = run.tickets.find(function (entry) {
      return entry.id === state.testTicket;
    });
    if (!ticket) {
      state.testsScreen = "tickets";
      renderTestResults();
      return;
    }

    if (state.testsScreen === "list") {
      els.testsTickets.hidden = true;
      els.testsListWrap.hidden = false;
      els.testsDetail.hidden = true;
      els.testsList.innerHTML = ticket.tests
        .map(function (test) {
          return (
            '<button type="button" class="test-row' +
            (test.passed ? " is-passed" : " is-failed") +
            '" data-test-id="' +
            escapeHtml(test.id) +
            '">' +
            '<span class="test-row-main">' +
            "<h3>" +
            escapeHtml(test.id) +
            " · " +
            escapeHtml(test.title) +
            "</h3>" +
            '<p class="test-row-meta">' +
            (test.passed ? "PASS" : "FAIL") +
            "</p></span></button>"
          );
        })
        .join("");
      return;
    }

    const test = ticket.tests.find(function (entry) {
      return entry.id === state.testCaseId;
    });
    els.testsTickets.hidden = true;
    els.testsListWrap.hidden = false;
    els.testsList.innerHTML = "";
    els.testsDetail.hidden = false;
    if (!test) {
      els.testsDetail.innerHTML =
        '<div class="empty-state">That test result could not be found.</div>';
      return;
    }
    els.testsDetail.innerHTML =
      '<span class="status-pill' +
      (test.passed ? " is-approved" : " is-rejected") +
      '">' +
      (test.passed ? "PASS" : "FAIL") +
      "</span>" +
      "<h2>" +
      escapeHtml(test.id) +
      " · " +
      escapeHtml(test.title) +
      "</h2>" +
      '<div class="detail-list">' +
      "<div><span>Starting condition</span><strong>" +
      escapeHtml(test.starting || "—") +
      "</strong></div>" +
      "<div><span>Action</span><strong>" +
      escapeHtml(test.action || "—") +
      "</strong></div>" +
      "<div><span>Expected</span><strong>" +
      escapeHtml(test.expected || "—") +
      "</strong></div>" +
      "<div><span>Actual</span><strong>" +
      escapeHtml(test.actual || "—") +
      "</strong></div>" +
      "<div><span>Evidence</span><strong>" +
      escapeHtml(test.evidence || "—") +
      "</strong></div>" +
      "</div>";
  }

  function runStaffTests() {
    if (!isStaff()) {
      showBanner("Only staff can run tests.", true);
      return;
    }
    if (!window.FinditTests || typeof window.FinditTests.runAll !== "function") {
      showBanner("The test runner could not be loaded.", true);
      return;
    }
    state.testRun = window.FinditTests.runAll(window.FinditTestApi);
    state.testsScreen = "tickets";
    state.testTicket = null;
    state.testCaseId = null;
    state.view = "tests";

    const failed = [];
    state.testRun.tickets.forEach(function (ticket) {
      ticket.tests.forEach(function (test) {
        if (!test.passed) {
          failed.push(test.id);
        }
      });
    });
    window.alert(
      failed.length === 0 ? "Tests succeeded" : "Test #" + failed[0] + " failed"
    );
    render();
  }

  function resetStaffTests() {
    if (!isStaff()) {
      showBanner("Only staff can reset tests.", true);
      return;
    }
    state.testRun = null;
    state.testsScreen = "tickets";
    state.testTicket = null;
    state.testCaseId = null;
    showBanner("Test results cleared.", "success");
  }

  function resetSystem() {
    if (!isStaff()) {
      showBanner("Only staff can reset the system.", true);
      return false;
    }
    if (
      !window.confirm(
        "Reset the system? This will delete all items and claims."
      )
    ) {
      return false;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CLAIMS_KEY);
    localStorage.removeItem(MY_CLAIMS_KEY);
    localStorage.removeItem(SEEN_REJECTED_KEY);
    VISITOR_ROLES.forEach(function (role) {
      localStorage.removeItem(SEEN_REJECTED_KEY + "." + role);
    });

    state.selectedId = null;
    state.selectedClaimId = null;
    state.view = "list";
    els.reportForm.reset();
    els.claimForm.reset();
    clearFieldErrors();
    clearClaimFieldErrors();
    autosizeReportTextareas();
    autosizeClaimTextareas();
    showBanner("System reset. All items and claims have been cleared.");
    return true;
  }

  function initializeSystem() {
    if (!isStaff()) {
      showBanner("Only staff can initialize the system.", true);
      return;
    }
    if (!resetSystem()) {
      return;
    }

    const seedTypes = [
      { category: "Electronics", type: "electronics" },
      { category: "ID / Cards", type: "id/cards" },
      { category: "Keys", type: "keys" },
      { category: "Clothing", type: "clothing" },
      { category: "Bag", type: "bag" },
      { category: "Stationery", type: "stationery" },
    ];
    const today = new Date();
    const foundDate =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");
    const items = [];
    seedTypes.forEach(function (entry) {
      for (let n = 1; n <= 3; n += 1) {
        items.push({
          id: createId(),
          name: entry.type + "_" + n,
          category: entry.category,
          foundLocation: "Gym",
          foundDate: foundDate,
          publicDescription: "public description",
          privateClue: "private clue",
          status: "PUBLISHED",
        });
      }
    });
    saveItems(items);
    showBanner("Initialized with 18 test items.");
  }

  function render() {
    renderRole();
    renderNav();
    renderBanner();
    renderViews();
  }

  document.querySelectorAll("[data-role]").forEach(function (button) {
    button.addEventListener("click", function () {
      clearBanner();
      setRole(button.dataset.role);
    });
  });

  if (els.resetSystem) {
    els.resetSystem.addEventListener("click", resetSystem);
  }
  if (els.initializeSystem) {
    els.initializeSystem.addEventListener("click", initializeSystem);
  }
  if (els.runTests) {
    els.runTests.addEventListener("click", function () {
      clearBanner();
      runStaffTests();
    });
  }
  if (els.resetTests) {
    els.resetTests.addEventListener("click", function () {
      resetStaffTests();
    });
  }

  if (els.testsTickets) {
    els.testsTickets.addEventListener("click", function (event) {
      const button = event.target.closest("[data-test-ticket]");
      if (!button) {
        return;
      }
      state.testTicket = button.dataset.testTicket;
      state.testsScreen = "list";
      state.testCaseId = null;
      render();
    });
  }

  if (els.testsList) {
    els.testsList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-test-id]");
      if (!button) {
        return;
      }
      state.testCaseId = button.dataset.testId;
      state.testsScreen = "detail";
      render();
    });
  }

  if (els.testsBack) {
    els.testsBack.addEventListener("click", function () {
      if (state.testsScreen === "detail") {
        state.testsScreen = "list";
        state.testCaseId = null;
      } else {
        state.testsScreen = "tickets";
        state.testTicket = null;
      }
      render();
    });
  }

  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      const view = button.dataset.view;
      if (view === "report" && !isStaff()) {
        return;
      }
      if (view === "mine" && !isVisitor()) {
        return;
      }
      if (view === "review" && !isStaff()) {
        return;
      }
      if (view === "history" && !isStaff()) {
        return;
      }
      if (view === "tests" && !isStaff()) {
        return;
      }
      clearBanner();
      showView(view);
    });
  });

  function handleOpenClaimClick(event, fromView) {
    const button = event.target.closest("[data-open-claim]");
    if (!button) {
      return;
    }
    openClaimDetail(button.dataset.openClaim, fromView);
  }

  els.reviewClaimList.addEventListener("click", function (event) {
    handleOpenClaimClick(event, "review");
  });

  els.historyClaimList.addEventListener("click", function (event) {
    handleOpenClaimClick(event, "history");
  });

  els.itemClaims.addEventListener("click", function (event) {
    handleOpenClaimClick(event, "list");
  });

  els.claimDetail.addEventListener("click", function (event) {
    const button = event.target.closest("[data-decide]");
    if (!button) {
      return;
    }
    decideClaim(button.dataset.claimId, button.dataset.decide);
  });

  els.claimDetail.addEventListener("input", function (event) {
    if (event.target.matches("[data-decision-for]")) {
      clearDecisionReasonError();
    }
  });

  els.claimDetailBack.addEventListener("click", function () {
    clearBanner();
    state.selectedClaimId = null;
    state.view =
      state.claimDetailFrom === "list"
        ? "list"
        : state.claimDetailFrom === "history"
          ? "history"
          : "review";
    render();
  });

  els.historyClaimFilter.addEventListener("click", function (event) {
    const button = event.target.closest("[data-history-filter]");
    if (!button) {
      return;
    }
    const filter = button.dataset.historyFilter;
    if (filter !== "all" && filter !== "approved" && filter !== "disapproved") {
      return;
    }
    state.historyFilter = filter;
    renderHistoryClaims();
  });

  bindSort(els.claimSort, "claimSort", renderMyClaims);
  bindSort(els.historyClaimSort, "historySort", renderHistoryClaims);
  bindSort(els.reviewClaimSort, "reviewSort", renderReviewClaims);

  els.claimFilter.addEventListener("click", function (event) {
    const button = event.target.closest("[data-claim-filter]");
    if (!button) {
      return;
    }
    const filter = button.dataset.claimFilter;
    if (!Object.prototype.hasOwnProperty.call(CLAIM_FILTERS, filter)) {
      return;
    }
    state.claimFilter = filter;
    renderMyClaims();
  });

  els.myClaimList.addEventListener("click", function (event) {
    const card = event.target.closest("[data-claim-item-id]");
    if (!card) {
      return;
    }
    clearBanner();
    state.selectedId = card.dataset.claimItemId;
    markRejectedClaimsSeen(state.selectedId);
    state.view = "list";
    render();
  });

  els.itemList.addEventListener("click", function (event) {
    const card = event.target.closest("[data-item-id]");
    if (!card) {
      return;
    }
    clearBanner();
    clearClaimFieldErrors();
    const nextId =
      state.selectedId === card.dataset.itemId ? null : card.dataset.itemId;
    if (nextId) {
      markRejectedClaimsSeen(nextId);
    }
    state.selectedId = nextId;
    state.view = "list";
    render();
  });

  els.itemDetail.addEventListener("click", function (event) {
    if (event.target.id === "publish-item") {
      publishSelectedItem();
    }
    if (event.target.id === "claim-item") {
      openClaimForm();
    }
    if (event.target.id === "retract-claim-item") {
      retractClaimForm();
    }
  });

  function autosizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  function autosizeReportTextareas() {
    els.reportForm.querySelectorAll("textarea").forEach(autosizeTextarea);
  }

  function autosizeClaimTextareas() {
    els.claimForm.querySelectorAll("textarea").forEach(autosizeTextarea);
  }

  function bindAutosizeTextareas() {
    els.reportForm.querySelectorAll("textarea").forEach(function (textarea) {
      textarea.addEventListener("input", function () {
        autosizeTextarea(textarea);
      });
    });
    els.claimForm.querySelectorAll("textarea").forEach(function (textarea) {
      textarea.addEventListener("input", function () {
        autosizeTextarea(textarea);
      });
    });
    autosizeReportTextareas();
    autosizeClaimTextareas();
  }

  els.reportForm.addEventListener("submit", handleReportSubmit);
  els.claimForm.addEventListener("submit", handleClaimSubmit);
  els.retractClaim.addEventListener("click", retractClaimForm);
  window.FinditTestApi = {
    STORAGE_KEY: STORAGE_KEY,
    CLAIMS_KEY: CLAIMS_KEY,
    ROLE_KEY: ROLE_KEY,
    VISITOR_ROLES: VISITOR_ROLES,
    SEEN_REJECTED_KEY: SEEN_REJECTED_KEY,
    state: state,
    els: els,
    setRole: setRole,
    isStaff: isStaff,
    isVisitor: isVisitor,
    loadItems: loadItems,
    saveItems: saveItems,
    loadClaims: loadClaims,
    saveClaims: saveClaims,
    getItem: getItem,
    getClaim: getClaim,
    handleReportSubmit: handleReportSubmit,
    handleClaimSubmit: handleClaimSubmit,
    publishSelectedItem: publishSelectedItem,
    decideClaim: decideClaim,
    openClaimDetail: openClaimDetail,
    showView: showView,
    render: render,
    renderDetail: renderDetail,
    renderList: renderList,
    renderReviewClaims: renderReviewClaims,
    renderClaimDetail: renderClaimDetail,
    renderMyClaims: renderMyClaims,
    canClaimItem: canClaimItem,
    visibleItems: visibleItems,
    myClaims: myClaims,
    myClaimsForItem: myClaimsForItem,
    itemListClaimClass: itemListClaimClass,
    claimsForItem: claimsForItem,
    markRejectedClaimsSeen: markRejectedClaimsSeen,
    setFoundDateFromIso: setFoundDateFromIso,
    selectedItemIsVisible: selectedItemIsVisible,
  };

  bindFoundDateInputs();
  bindAutosizeTextareas();

  render();
})();
