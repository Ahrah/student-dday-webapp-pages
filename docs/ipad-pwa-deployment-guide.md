# iPad 홈 화면 추가와 HTTPS 배포 가이드

이 문서는 현재 `학생 과제 디데이` 웹 MVP를 iPad에서 앱처럼 열기 위한 배포 준비 문서입니다. 이번 단계에서는 로그인, 서버 저장, 결제, 푸시 알림, 위젯, 앱 차단 기능을 구현하지 않습니다.

## 목표

- `index.html` 기반 웹앱을 그대로 유지합니다.
- HTTPS 주소에서 열 수 있게 정적 배포를 준비합니다.
- iPad Safari의 `홈 화면에 추가` 기능으로 앱처럼 실행할 수 있게 합니다.
- 기존 localStorage 데이터와 현재 MVP 기능을 깨뜨리지 않습니다.

현재 배포 주소:

```text
https://ahrah.github.io/student-dday-webapp-pages/
```

## 현재 준비된 PWA 파일

| 파일 | 역할 |
| --- | --- |
| `manifest.webmanifest` | 앱 이름, 아이콘, 테마색, standalone 실행 방식 정의 |
| `app-icon.svg` | 홈 화면과 브라우저 탭에서 사용할 기본 아이콘 |
| `service-worker.js` | 주요 정적 파일을 캐시하는 기본 서비스 워커 |
| `index.html` | manifest, 아이콘, iOS 홈 화면 메타 태그 연결 |
| `app.js` | HTTPS 또는 로컬 서버에서만 서비스 워커를 안전하게 등록 |

## 추천 배포 방식

### GitHub Pages

현재 이 프로젝트는 GitHub Pages로 배포되어 있습니다.

- 저장소: `https://github.com/Ahrah/student-dday-webapp-pages`
- 배포 주소: `https://ahrah.github.io/student-dday-webapp-pages/`
- 배포 브랜치: `main`
- 배포 폴더: `/`

다시 배포할 때의 기본 흐름:

1. GitHub 저장소 루트에 `index.html`이 오게 파일을 올립니다.
2. 저장소 Settings에서 Pages를 켭니다.
3. 배포된 HTTPS 주소를 Safari에서 엽니다.
4. iPad Safari 공유 버튼에서 `홈 화면에 추가`를 선택합니다.

주의할 점:

- `manifest.webmanifest`, `service-worker.js`, `app-icon.svg`도 `index.html`과 같은 위치에 있어야 합니다.
- 과제 데이터는 사용자의 브라우저 localStorage에 저장되므로 GitHub 저장소에 올라가지 않습니다.
- 배포 주소가 바뀌면 localStorage 저장 위치도 달라질 수 있습니다.

## iPad에서 확인할 것

| 테스트 | 예상 결과 |
| --- | --- |
| 홈 화면 아이콘 표시 | 달력 모양 아이콘이 표시됨 |
| 홈 화면 앱 이름 | `과제 디데이`로 표시됨 |
| 홈 화면에서 실행 | Safari 주소창 없이 앱처럼 열림 |
| 과제 추가 | 새 과제가 저장됨 |
| 새로고침 | 저장된 과제가 유지됨 |
| 홈 화면 앱 종료 후 재실행 | 저장된 과제가 유지됨 |
| 체크리스트 완료 | 진행률과 상태가 정상 반영됨 |
| 완료 버튼 | 과제가 삭제되지 않고 `제출 완료`가 됨 |
| 삭제 버튼 | 확인창이 표시되고 확인 시에만 삭제됨 |

## 이번 단계에서 구현하지 않는 것

- 실제 앱스토어 앱
- 로그인
- Firebase 또는 서버 저장
- 결제
- 푸시 알림
- 홈/잠금 화면 네이티브 위젯
- 앱 차단 또는 집중 모드
- 기기 간 자동 동기화
