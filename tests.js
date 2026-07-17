(() => {
  const results = [];

  function assert(name, condition) {
    results.push({ name, pass: Boolean(condition) });
    if (!condition) console.error(`실패: ${name}`);
  }

  function runAssignmentTests() {
    results.length = 0;
    const utils = window.AssignmentAppUtils;
    if (!utils) {
      throw new Error("AssignmentAppUtils를 찾을 수 없습니다.");
    }

    const fixedNow = new Date("2026-07-17T03:00:00.000Z"); // 한국 시간 2026-07-17 12:00

    assert("한국 날짜 계산", utils.getKoreanTodayString(fixedNow) === "2026-07-17");
    assert("D-Day 계산", utils.getDday("2026-07-17", fixedNow) === 0);
    assert("D-3 계산", utils.getDday("2026-07-20", fixedNow) === 3);
    assert("기한 초과 라벨", utils.getDdayLabel(-1) === "기한 초과");
    const baseAssignment = { status: "시작 전", dueDate: "2026-07-24", dueTime: "23:59" };
    assert("D-7 안내 문구", utils.getDdayGuide(7, baseAssignment, fixedNow) === "이번 주에 시작해야 해요.");
    assert(
      "D-1 안내 문구",
      utils.getDdayGuide(1, { ...baseAssignment, dueDate: "2026-07-18" }, fixedNow) ===
        "오늘 반드시 마무리해야 해요."
    );
    assert(
      "작성 완료 안내 문구",
      utils.getDdayGuide(2, { ...baseAssignment, status: "작성 완료" }, fixedNow) ===
        "작성은 끝났어요. 실제 제출 여부를 확인하세요."
    );
    assert("체크리스트 진행률", utils.getChecklistProgress([{ done: true }, { done: false }]) === 50);
    assert("예전 예상 시간 값 변환", utils.normalizeEstimateValue("2~3시간") === "3");
    assert("예상 소요시간 표시", utils.formatEstimate("4") === "예상 4시간");
    assert("백업 데이터 구조", utils.createBackupPayload().app === "student-assignment-dday");
    assert("존재하지 않는 날짜 검증", utils.isValidDateText("2026-02-30") === false);
    assert("존재하지 않는 시간 검증", utils.isValidTimeText("25:00") === false);
    assert(
      "빈 과제명 검증",
      utils.validateForm({ title: "", subject: "국어", dueDate: "2026-07-17", dueTime: "20:00" }) ===
        "과제명을 입력하세요."
    );
    assert(
      "잘못된 날짜 검증",
      utils.validateForm({ title: "과제", subject: "국어", dueDate: "not-date", dueTime: "20:00" }) ===
        "올바른 날짜와 시간을 입력하세요."
    );
    assert("활성 상태 판별", utils.isActiveStatus("작성 완료") === true);
    assert("제출 완료는 활성 제한 제외", utils.isActiveStatus("제출 완료") === false);
    assert("보관은 활성 제한 제외", utils.isActiveStatus("보관") === false);
    assert("무료 활성 제한 수치", utils.freeActiveLimit === 3);

    const passed = results.filter((item) => item.pass).length;
    const failed = results.length - passed;
    console.table(results);
    console.log(`테스트 결과: ${passed}개 통과, ${failed}개 실패`);
    return { passed, failed, results };
  }

  window.runAssignmentTests = runAssignmentTests;

  // 주소 뒤에 ?runTests=1을 붙여 열면 자동으로 기본 테스트를 실행합니다.
  if (window.location.search.includes("runTests=1")) {
    window.addEventListener("load", () => {
      window.__ASSIGNMENT_TEST_RESULTS__ = runAssignmentTests();
    });
  }
})();
