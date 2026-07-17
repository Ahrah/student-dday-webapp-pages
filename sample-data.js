// 처음 실행하는 사용자가 바로 기능을 볼 수 있도록 넣어 둔 예제 과제입니다.
// 실제 사용자가 과제를 추가/수정하면 localStorage에 저장된 데이터가 우선 사용됩니다.
window.SAMPLE_ASSIGNMENTS = [
  {
    id: "sample-korean-report",
    title: "독서 감상문 제출",
    subject: "국어",
    dueDate: "2026-07-20",
    dueTime: "21:00",
    priority: "높음",
    estimate: "2~3시간",
    status: "진행 중",
    memo: "책에서 인상 깊은 장면 2개와 느낀 점을 연결해서 쓰기",
    checklist: [
      { id: "sample-korean-1", text: "책 마지막 장까지 읽기", done: true },
      { id: "sample-korean-2", text: "초안 작성하기", done: true },
      { id: "sample-korean-3", text: "맞춤법 확인 후 제출하기", done: false }
    ],
    createdAt: "2026-07-16T09:00:00.000Z",
    updatedAt: "2026-07-16T09:00:00.000Z"
  },
  {
    id: "sample-science-presentation",
    title: "태양계 발표 자료",
    subject: "과학",
    dueDate: "2026-07-24",
    dueTime: "08:30",
    priority: "보통",
    estimate: "며칠 필요",
    status: "시작 전",
    memo: "목성, 토성, 화성 중 하나를 골라 발표",
    checklist: [
      { id: "sample-science-1", text: "주제 행성 선택하기", done: false },
      { id: "sample-science-2", text: "자료 조사하기", done: false },
      { id: "sample-science-3", text: "슬라이드 5장 만들기", done: false }
    ],
    createdAt: "2026-07-16T09:05:00.000Z",
    updatedAt: "2026-07-16T09:05:00.000Z"
  },
  {
    id: "sample-math-submit",
    title: "수학 익힘책 42쪽",
    subject: "수학",
    dueDate: "2026-07-17",
    dueTime: "23:00",
    priority: "낮음",
    estimate: "30분 이내",
    status: "제출 완료",
    memo: "풀이 과정이 보이게 사진 찍어 제출",
    checklist: [
      { id: "sample-math-1", text: "문제 풀기", done: true },
      { id: "sample-math-2", text: "사진 찍기", done: true },
      { id: "sample-math-3", text: "온라인 교실에 올리기", done: true }
    ],
    createdAt: "2026-07-16T09:10:00.000Z",
    updatedAt: "2026-07-16T09:10:00.000Z"
  }
];
