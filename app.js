(() => {
  const STORAGE_KEY = "student-dday-assignments-v1";
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const STATUSES = ["시작 전", "진행 중", "작성 완료", "제출 완료", "보관"];
  const ACTIVE_STATUSES = ["시작 전", "진행 중", "작성 완료"];
  const FREE_ACTIVE_LIMIT = 3;
  const FREE_LIMIT_MESSAGE =
    "무료 플랜에서는 진행 중인 할 일을 최대 3개까지 등록할 수 있어요. 기존 할 일을 완료하거나 프리미엄을 시작해주세요.";

  const state = {
    assignments: [],
    subjectFilter: "all",
    completionFilter: "all",
    sortMode: "deadline",
    storageMessage: "",
    noticeMessage: ""
  };

  const els = {};

  // 한국 시간 기준의 오늘 날짜를 YYYY-MM-DD 형태로 만듭니다.
  function getKoreanTodayString(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  // 날짜와 시간을 한국 시간(+09:00)으로 해석해서 Date 객체로 바꿉니다.
  function parseKoreanDateTime(dateText, timeText) {
    if (!dateText || !timeText) return null;
    if (!isValidDateText(dateText) || !isValidTimeText(timeText)) return null;
    const date = new Date(`${dateText}T${timeText}:00+09:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getAssignmentDueTime(assignment) {
    return isValidTimeText(assignment.dueTime) ? assignment.dueTime : "23:59";
  }

  function isValidDateText(dateText) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return false;
    const [year, month, day] = dateText.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  function isValidTimeText(timeText) {
    if (!/^\d{2}:\d{2}$/.test(timeText)) return false;
    const [hour, minute] = timeText.split(":").map(Number);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }

  function getKoreanDateStartMs(dateText) {
    return new Date(`${dateText}T00:00:00+09:00`).getTime();
  }

  function getDday(dueDate, now = new Date()) {
    const todayStart = getKoreanDateStartMs(getKoreanTodayString(now));
    const dueStart = getKoreanDateStartMs(dueDate);
    return Math.round((dueStart - todayStart) / MS_PER_DAY);
  }

  function getDdayLabel(daysLeft, overdue = false) {
    if (overdue || daysLeft < 0) return "기한 초과";
    if (daysLeft === 0) return "D-Day";
    return `D-${daysLeft}`;
  }

  function getDdayGuide(daysLeft, assignment, now = new Date()) {
    if (assignment.status === "보관") return "보관한 과제예요.";
    if (assignment.status === "제출 완료") return "제출을 완료했어요.";
    if (assignment.status === "작성 완료") return "작성은 끝났어요. 실제 제출 여부를 확인하세요.";
    if (isDeadlinePassed(assignment, now)) return "제출 가능 여부를 선생님께 확인하세요.";
    if (daysLeft === 0) return "오늘 제출해야 해요.";
    if (daysLeft === 1) return "오늘 반드시 마무리해야 해요.";
    if (daysLeft >= 2 && daysLeft <= 3) return "오늘 최소 한 단계를 완료하세요.";
    if (daysLeft <= 7) return "이번 주에 시작해야 해요.";
    if (daysLeft <= 13) return "첫 단계를 미리 시작하면 부담이 줄어요.";
    return "아직 여유가 있어요. 시작할 날짜를 정해보세요.";
  }

  function getChecklistProgress(checklist) {
    if (!checklist.length) return 0;
    const doneCount = checklist.filter((item) => item.done).length;
    return Math.round((doneCount / checklist.length) * 100);
  }

  function isSubmitted(assignment) {
    return assignment.status === "제출 완료";
  }

  function isActiveStatus(status) {
    return ACTIVE_STATUSES.includes(status);
  }

  function isActionable(assignment) {
    return assignment.status !== "제출 완료" && assignment.status !== "보관";
  }

  function getActiveAssignmentCount(excludeId = "") {
    return state.assignments.filter((item) => item.id !== excludeId && isActiveStatus(item.status)).length;
  }

  function isDeadlinePassed(assignment, now = new Date()) {
    const deadline = parseKoreanDateTime(assignment.dueDate, getAssignmentDueTime(assignment));
    return deadline ? deadline.getTime() < now.getTime() : false;
  }

  function makeId(prefix = "assignment") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function loadAssignments() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
          state.storageMessage = "저장된 데이터 형식이 맞지 않아 예제 과제로 다시 시작했습니다.";
          return getSampleAssignments();
        }
        const recovered = sanitizeAssignments(parsed);
        if (recovered.length !== parsed.length) {
          state.storageMessage = "저장된 데이터 중 읽을 수 없는 항목은 제외하고 복구 가능한 과제만 불러왔습니다.";
        }
        return recovered;
      } catch (error) {
        console.warn("저장된 과제 데이터를 읽지 못했습니다.", error);
        state.storageMessage = "저장된 데이터가 손상되어 예제 과제로 다시 시작했습니다.";
      }
    }

    return getSampleAssignments();
  }

  function getSampleAssignments() {
    return (window.SAMPLE_ASSIGNMENTS || []).map((item) => ({ ...item }));
  }

  function sanitizeAssignments(value) {
    if (!Array.isArray(value)) return [];

    return value
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const checklist = Array.isArray(item.checklist) ? item.checklist : [];
        return {
          id: typeof item.id === "string" && item.id ? item.id : makeId(),
          title: typeof item.title === "string" ? item.title.trim() : "",
          subject: typeof item.subject === "string" && item.subject.trim() ? item.subject.trim() : "미분류",
          dueDate: isValidDateText(item.dueDate) ? item.dueDate : "",
          dueTime: isValidTimeText(item.dueTime) ? item.dueTime : "23:59",
          priority: ["낮음", "보통", "높음"].includes(item.priority) ? item.priority : "보통",
          estimate: normalizeEstimateValue(item.estimate),
          status: STATUSES.includes(item.status) ? item.status : "시작 전",
          memo: typeof item.memo === "string" ? item.memo : "",
          checklist: checklist
            .filter((check) => check && typeof check.text === "string" && check.text.trim())
            .map((check) => ({
              id: typeof check.id === "string" && check.id ? check.id : makeId("check"),
              text: check.text.trim(),
              done: Boolean(check.done)
            })),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
        };
      })
      .filter((item) => item.title && item.dueDate && parseKoreanDateTime(item.dueDate, item.dueTime));
  }

  function normalizeEstimateValue(value) {
    if (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10) {
      return String(Number(value));
    }

    const legacyMap = {
      "30분 이내": "1",
      "1시간": "1",
      "2~3시간": "3",
      "며칠 필요": "8"
    };
    return legacyMap[value] || "3";
  }

  function formatEstimate(value) {
    return `예상 ${normalizeEstimateValue(value)}시간`;
  }

  function saveAssignments() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.assignments));
  }

  function createBackupPayload() {
    return {
      app: "student-assignment-dday",
      version: 1,
      exportedAt: new Date().toISOString(),
      assignments: state.assignments
    };
  }

  function downloadBackup() {
    const payload = createBackupPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-dday-backup-${getKoreanTodayString()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showNotice("과제 데이터를 JSON 파일로 백업했습니다.");
    render();
  }

  function openRestorePicker() {
    els.restoreFileInput.value = "";
    els.restoreFileInput.click();
  }

  function restoreFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const imported = Array.isArray(parsed) ? parsed : parsed.assignments;
        const recovered = sanitizeAssignments(imported);

        if (!recovered.length) {
          state.storageMessage = "복원할 수 있는 과제 데이터를 찾지 못했습니다.";
          render();
          return;
        }

        const ok = confirm("백업 파일의 과제로 현재 목록을 바꿀까요? 현재 브라우저에 저장된 과제 목록은 백업 내용으로 대체됩니다.");
        if (!ok) return;

        state.assignments = recovered;
        state.subjectFilter = "all";
        state.completionFilter = "all";
        state.sortMode = "deadline";
        state.storageMessage = recovered.length === (Array.isArray(imported) ? imported.length : 0)
          ? ""
          : "백업 파일에서 복구 가능한 과제만 불러왔습니다.";
        showNotice("백업 파일에서 과제를 복원했습니다.");
        saveAssignments();
        render();
      } catch (error) {
        console.warn("백업 파일을 읽지 못했습니다.", error);
        state.storageMessage = "백업 파일을 읽지 못했습니다. JSON 파일인지 확인해주세요.";
        render();
      }
    });
    reader.readAsText(file);
  }

  function normalizeChecklist(text) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ id: makeId("check"), text: line, done: false }));
  }

  function validateForm(data) {
    if (!data.title.trim()) return "과제명을 입력하세요.";
    if (!data.subject.trim()) return "과목을 입력하세요.";
    if (!data.dueDate) return "마감 날짜를 선택하세요.";
    if (!parseKoreanDateTime(data.dueDate, data.dueTime)) return "올바른 날짜와 시간을 입력하세요.";
    if (isActiveStatus(data.status) && getActiveAssignmentCount(data.id) >= FREE_ACTIVE_LIMIT) {
      return FREE_LIMIT_MESSAGE;
    }
    return "";
  }

  function readFormData() {
    return {
      id: els.assignmentId.value,
      title: els.titleInput.value.trim(),
      subject: els.subjectInput.value.trim(),
      dueDate: els.dueDateInput.value,
      dueTime: "23:59",
      priority: "보통",
      estimate: els.estimateInput.value,
      status: els.statusInput.value,
      memo: els.memoInput.value.trim(),
      checklist: normalizeChecklist(els.checklistInput.value)
    };
  }

  function resetForm() {
    els.assignmentForm.reset();
    els.assignmentId.value = "";
    els.estimateInput.value = "3";
    els.statusInput.value = "시작 전";
    els.formTitle.textContent = "과제 추가";
    els.saveButton.textContent = "과제 저장";
    els.cancelEditButton.hidden = true;
    els.formError.textContent = "";
  }

  function handleSubmit(event) {
    event.preventDefault();
    els.saveButton.disabled = true;
    const data = readFormData();
    const error = validateForm(data);

    if (error) {
      els.formError.textContent = error;
      els.saveButton.disabled = false;
      return;
    }

    const nowIso = new Date().toISOString();
    const existingIndex = state.assignments.findIndex((item) => item.id === data.id);

    if (existingIndex >= 0) {
      const existing = state.assignments[existingIndex];
      state.assignments[existingIndex] = {
        ...existing,
        ...data,
        checklist: mergeChecklistForEdit(existing.checklist, data.checklist),
        updatedAt: nowIso
      };
    } else {
      state.assignments.push({
        ...data,
        id: makeId(),
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }

    saveAssignments();
    resetForm();
    render();
    els.saveButton.disabled = false;
  }

  // 수정할 때 기존 체크 상태를 최대한 유지합니다.
  function mergeChecklistForEdit(oldChecklist, newChecklist) {
    return newChecklist.map((newItem) => {
      const oldItem = oldChecklist.find((item) => item.text === newItem.text);
      return oldItem ? { ...oldItem, text: newItem.text } : newItem;
    });
  }

  function editAssignment(id) {
    const assignment = state.assignments.find((item) => item.id === id);
    if (!assignment) return;

    els.assignmentId.value = assignment.id;
    els.titleInput.value = assignment.title;
    els.subjectInput.value = assignment.subject;
    els.dueDateInput.value = assignment.dueDate;
    els.estimateInput.value = normalizeEstimateValue(assignment.estimate);
    els.statusInput.value = assignment.status;
    els.memoInput.value = assignment.memo;
    els.checklistInput.value = assignment.checklist.map((item) => item.text).join("\n");
    els.formTitle.textContent = "과제 수정";
    els.saveButton.textContent = "수정 저장";
    els.cancelEditButton.hidden = false;
    els.formError.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteAssignment(id) {
    const assignment = state.assignments.find((item) => item.id === id);
    if (!assignment) return;

    if (!confirm("이 과제를 삭제할까요? 완료한 기록도 함께 사라집니다.")) return;

    state.assignments = state.assignments.filter((item) => item.id !== id);
    saveAssignments();
    render();
  }

  function toggleChecklist(id, checkId) {
    const assignment = state.assignments.find((item) => item.id === id);
    if (!assignment) return;

    assignment.checklist = assignment.checklist.map((item) =>
      item.id === checkId ? { ...item, done: !item.done } : item
    );

    // 체크리스트 변화에 따라 상태를 돕되, 사용자가 직접 제출 완료/보관한 과제는 되돌리지 않습니다.
    const doneCount = assignment.checklist.filter((item) => item.done).length;
    const allDone = assignment.checklist.length > 0 && doneCount === assignment.checklist.length;
    if (isActionable(assignment) && allDone) {
      assignment.status = "작성 완료";
      showNotice("체크리스트를 모두 완료해 작성 완료로 변경했습니다.");
    } else if (assignment.status === "시작 전" && doneCount > 0) {
      assignment.status = "진행 중";
    }

    assignment.updatedAt = new Date().toISOString();
    saveAssignments();
    render();
  }

  function changeStatus(id, status) {
    const assignment = state.assignments.find((item) => item.id === id);
    if (!assignment || !STATUSES.includes(status)) return;
    if (isActiveStatus(status) && !isActiveStatus(assignment.status) && getActiveAssignmentCount(id) >= FREE_ACTIVE_LIMIT) {
      showNotice(FREE_LIMIT_MESSAGE);
      render();
      return;
    }

    assignment.status = status;
    assignment.updatedAt = new Date().toISOString();
    saveAssignments();
    render();
  }

  function completeAssignment(id) {
    const assignment = state.assignments.find((item) => item.id === id);
    if (!assignment) return;

    assignment.status = "제출 완료";
    assignment.updatedAt = new Date().toISOString();
    showNotice("제출 완료로 변경했습니다.");
    saveAssignments();
    render();
  }

  function showNotice(message) {
    state.noticeMessage = message;
  }

  function getSortedAssignments() {
    return [...state.assignments].sort((a, b) => {
      const aDeadline = parseKoreanDateTime(a.dueDate, a.dueTime)?.getTime() || 0;
      const bDeadline = parseKoreanDateTime(b.dueDate, b.dueTime)?.getTime() || 0;
      return aDeadline - bDeadline;
    });
  }

  function getFilteredAssignments() {
    return getSortedAssignments().filter((assignment) => {
      const subjectMatch = state.subjectFilter === "all" || assignment.subject === state.subjectFilter;
      const completionMatch =
        state.completionFilter === "all" ||
        (state.completionFilter === "incomplete" && isActionable(assignment)) ||
        (state.completionFilter === "not-started" && assignment.status === "시작 전") ||
        (state.completionFilter === "in-progress" && assignment.status === "진행 중") ||
        (state.completionFilter === "written" && assignment.status === "작성 완료") ||
        (state.completionFilter === "submitted" && assignment.status === "제출 완료") ||
        (state.completionFilter === "archived" && assignment.status === "보관") ||
        (state.completionFilter === "overdue" && isActionable(assignment) && isDeadlinePassed(assignment));
      return subjectMatch && completionMatch;
    });
  }

  function renderSubjectFilter() {
    const subjects = [...new Set(state.assignments.map((item) => item.subject))].sort((a, b) =>
      a.localeCompare(b, "ko")
    );
    const current = state.subjectFilter;
    els.subjectFilter.innerHTML = `<option value="all">전체 과목</option>${subjects
      .map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`)
      .join("")}`;
    els.subjectFilter.value = subjects.includes(current) ? current : "all";
    state.subjectFilter = els.subjectFilter.value;
  }

  function renderNextAction() {
    const actionable = getSortedAssignments()
      .filter(isActionable)
      .sort(compareNextActionPriority);

    if (!actionable.length) {
      els.nextActionText.textContent = "미완료 과제가 없습니다. 오늘은 제출 여부만 가볍게 확인해도 좋아요.";
      return;
    }

    const target = actionable[0];
    const firstTodo = target.checklist.find((item) => !item.done);
    const actionText = firstTodo ? firstTodo.text : "이 과제를 시작할 첫 단계를 직접 추가해보세요.";
    els.nextActionText.textContent = `과제: ${target.title} / 다음 행동: ${actionText} / ${formatEstimate(target.estimate)}`;
  }

  function compareNextActionPriority(a, b) {
    const aGroup = getNextActionGroup(a);
    const bGroup = getNextActionGroup(b);
    if (aGroup !== bGroup) return aGroup - bGroup;

    const aDeadline = parseKoreanDateTime(a.dueDate, a.dueTime)?.getTime() || 0;
    const bDeadline = parseKoreanDateTime(b.dueDate, b.dueTime)?.getTime() || 0;
    return aDeadline - bDeadline;
  }

  function getNextActionGroup(assignment) {
    const daysLeft = getDday(assignment.dueDate);
    if (daysLeft === 0) return 1;
    if (isDeadlinePassed(assignment)) return 2;
    if (daysLeft === 1) return 3;
    if (daysLeft <= 3) return 4;
    return 6;
  }

  function getStatusAction(status) {
    if (status === "시작 전") return "첫 단계를 시작하세요.";
    if (status === "진행 중") return "작성 완료 상태까지 진행하세요.";
    if (status === "작성 완료") return "제출 완료로 바꾸기 전에 제출 위치를 확인하세요.";
    return "제출 여부를 확인하세요.";
  }

  function renderOverdue() {
    const overdue = getSortedAssignments().filter((item) => isActionable(item) && isDeadlinePassed(item));
    els.overdueBox.hidden = overdue.length === 0;
    els.overdueList.innerHTML = overdue
      .map((item) => `<li>${escapeHtml(item.subject)} - ${escapeHtml(item.title)}</li>`)
      .join("");
  }

  function renderAssignmentCard(assignment) {
    const daysLeft = getDday(assignment.dueDate);
    const progress = getChecklistProgress(assignment.checklist);
    const overdue = isActionable(assignment) && isDeadlinePassed(assignment);
    const ddayClass = overdue || daysLeft < 0 ? " overdue" : " d-day";
    const actionHint = getActionHint(assignment, progress);
    const completeDisabled = assignment.status === "제출 완료";

    return `
      <article class="assignment-card${overdue ? " overdue" : ""}" data-id="${escapeHtml(assignment.id)}">
        <div class="card-top">
          <div>
            <h3 class="assignment-title">${escapeHtml(assignment.title)}</h3>
            <div class="meta-row">
              <span>${escapeHtml(assignment.subject)}</span>
              <span>${escapeHtml(assignment.dueDate)}</span>
            </div>
          </div>
          <div class="card-status">
            <span class="badge${ddayClass}">${getDdayLabel(daysLeft, overdue)}</span>
            <span class="badge status-badge">${escapeHtml(assignment.status)}</span>
          </div>
        </div>

        <div class="badge-row">
          <span class="badge">${escapeHtml(formatEstimate(assignment.estimate))}</span>
          <label class="status-inline">
            <span class="sr-only">상태 변경</span>
            <select data-action="status" data-id="${escapeHtml(assignment.id)}">
              ${STATUSES.map(
                (status) =>
                  `<option value="${status}" ${status === assignment.status ? "selected" : ""}>${status}</option>`
              ).join("")}
            </select>
          </label>
        </div>

        <p class="guide-text">${getDdayGuide(daysLeft, assignment)}</p>
        ${actionHint ? `<p class="action-hint">${escapeHtml(actionHint)}</p>` : ""}
        ${assignment.memo ? `<p class="memo">${escapeHtml(assignment.memo)}</p>` : ""}

        <div class="progress-area">
          <div class="progress-label">
            <span>체크리스트 진행률</span>
            <span>${progress}%</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>

        <div class="checklist">
          ${assignment.checklist.length ? renderChecklist(assignment) : "<p class='memo'>체크리스트가 없습니다.</p>"}
        </div>

        <div class="card-actions">
          <button type="button" class="complete-button" data-action="complete" data-id="${escapeHtml(assignment.id)}" ${
      completeDisabled ? "disabled" : ""
    }>${completeDisabled ? "완료됨" : "완료"}</button>
          <button type="button" class="card-button" data-action="edit" data-id="${escapeHtml(assignment.id)}">수정</button>
          <button type="button" class="delete-button" data-action="delete" data-id="${escapeHtml(assignment.id)}">삭제</button>
        </div>
      </article>
    `;
  }

  function getActionHint(assignment, progress) {
    if (assignment.status === "제출 완료" || assignment.status === "작성 완료") return "";
    if (assignment.checklist.length > 0 && progress === 100) {
      return "체크리스트를 모두 끝냈어요. 작성 완료로 바꿀지 확인하세요.";
    }
    return "";
  }

  function renderChecklist(assignment) {
    return assignment.checklist
      .map(
        (item) => `
        <label class="check-row">
          <input type="checkbox" data-action="check" data-id="${escapeHtml(assignment.id)}" data-check-id="${escapeHtml(
          item.id
        )}" ${item.done ? "checked" : ""}>
          <span class="${item.done ? "done" : ""}">${escapeHtml(item.text)}</span>
        </label>
      `
      )
      .join("");
  }

  function renderAssignments() {
    const assignments = getFilteredAssignments();
    els.countLabel.textContent = `${assignments.length}개`;
    els.emptyState.hidden = assignments.length > 0;
    els.assignmentList.innerHTML = assignments.map(renderAssignmentCard).join("");
  }

  function renderTodayLabel() {
    els.todayLabel.textContent = `한국 기준 오늘 ${getKoreanTodayString()}`;
  }

  function renderStorageAlert() {
    els.storageAlert.hidden = !state.storageMessage;
    els.storageAlertText.textContent = state.storageMessage;
  }

  function renderStatusNotice() {
    els.statusNotice.hidden = !state.noticeMessage;
    els.statusNoticeText.textContent = state.noticeMessage;
  }

  function render() {
    renderTodayLabel();
    renderStorageAlert();
    renderStatusNotice();
    renderSubjectFilter();
    renderNextAction();
    renderOverdue();
    renderAssignments();
  }

  function bindEvents() {
    els.assignmentForm.addEventListener("submit", handleSubmit);
    els.cancelEditButton.addEventListener("click", resetForm);
    els.backupButton.addEventListener("click", downloadBackup);
    els.restoreButton.addEventListener("click", openRestorePicker);
    els.restoreFileInput.addEventListener("change", (event) => {
      restoreFromFile(event.target.files[0]);
    });

    els.sortSelect.addEventListener("change", (event) => {
      state.sortMode = event.target.value;
      renderAssignments();
    });

    els.subjectFilter.addEventListener("change", (event) => {
      state.subjectFilter = event.target.value;
      renderAssignments();
    });

    els.completionFilter.addEventListener("change", (event) => {
      state.completionFilter = event.target.value;
      renderAssignments();
    });

    els.assignmentList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      if (button.dataset.action === "edit") editAssignment(button.dataset.id);
      if (button.dataset.action === "delete") deleteAssignment(button.dataset.id);
      if (button.dataset.action === "complete") completeAssignment(button.dataset.id);
    });

    els.assignmentList.addEventListener("change", (event) => {
      const target = event.target;
      if (target.dataset.action === "check") toggleChecklist(target.dataset.id, target.dataset.checkId);
      if (target.dataset.action === "status") changeStatus(target.dataset.id, target.value);
    });
  }

  function collectElements() {
    [
      "todayLabel",
      "nextActionText",
      "overdueBox",
      "overdueList",
      "storageAlert",
      "storageAlertText",
      "statusNotice",
      "statusNoticeText",
      "assignmentForm",
      "assignmentId",
      "titleInput",
      "subjectInput",
      "dueDateInput",
      "estimateInput",
      "statusInput",
      "memoInput",
      "checklistInput",
      "formTitle",
      "saveButton",
      "cancelEditButton",
      "formError",
      "backupButton",
      "restoreButton",
      "restoreFileInput",
      "sortSelect",
      "subjectFilter",
      "completionFilter",
      "assignmentList",
      "countLabel",
      "emptyState"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function init() {
    collectElements();
    state.assignments = loadAssignments();
    bindEvents();
    resetForm();
    render();
    registerServiceWorker();
  }

  function registerServiceWorker() {
    // file://로 직접 열 때는 서비스 워커를 등록할 수 없어서 조용히 건너뜁니다.
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
      return;
    }

    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.info("서비스 워커 등록을 건너뛰었습니다.", error);
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  window.AssignmentAppUtils = {
    getKoreanTodayString,
    parseKoreanDateTime,
    isValidDateText,
    isValidTimeText,
    getDday,
    getDdayLabel,
    getDdayGuide,
    isDeadlinePassed,
    getChecklistProgress,
    normalizeEstimateValue,
    formatEstimate,
    createBackupPayload,
    validateForm,
    isActiveStatus,
    getActiveAssignmentCount,
    freeActiveLimit: FREE_ACTIVE_LIMIT,
    freeLimitMessage: FREE_LIMIT_MESSAGE,
    get storageKey() {
      return STORAGE_KEY;
    }
  };
})();
