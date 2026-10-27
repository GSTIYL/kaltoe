# 칼퇴 계산기

선택적 근로시간제(월 단위)에서 그날까지 채운 시간을 기록하면, 야근을 몇 번 하면 그다음부터 18시에 퇴근(칼퇴)할 수 있는지 계산합니다.

- 사용: https://gstiyl.github.io/kaltoe/ (휴대폰에서 열고 "홈 화면에 추가"하면 앱처럼 설치됩니다)
- 입력값은 각 기기의 브라우저에만 저장됩니다.

## 개발

- 원본: `kaltoe-calculator.html`
- 빌드: `node build.js` → `docs/`에 PWA 파일(index.html, manifest, service worker, 아이콘) 생성
- GitHub Pages가 `main` 브랜치의 `/docs`를 서빙합니다.
