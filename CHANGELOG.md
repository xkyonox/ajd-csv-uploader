# 📝 변경 이력 (Changelog)

## v1.0.6 (2025-10-26) - 브랜딩 및 UI 개선

### ✨ 개선 사항

#### 1. Extension 이름 변경 ✅
**변경 내용**:
- 기존: "Naver Works 경비 CSV 업로더"
- 신규: **"AJD CSV Uploader"**
- 더 간결하고 브랜드화된 이름

#### 2. 사용 방법 안내 문구 개선 ✅
**변경 전**:
```
Naver Works 경비 페이지에서
"📊 CSV 업로드" 버튼을 클릭하세요.
```

**변경 후**:
```
Works 법인카드 지출결의에서
"📊 CSV 업로드" 버튼을 클릭하세요.
```

#### 3. CSV 업로드 버튼 디자인 개선 ✅
**변경 내용**:
- ✅ 세로형 → **가로형** 버튼
- ✅ 그라데이션 보라색 → **검정색** 배경
- ✅ 더 깔끔하고 전문적인 디자인
- ✅ 아이콘과 텍스트 가로 정렬
- ✅ 호버 시 어두운 회색으로 변경

**새로운 버튼 스타일**:
```css
background: #000000 (검정)
display: inline-flex (가로 배치)
padding: 10px 32px (가로로 넓게)
border-radius: 4px (모서리 덜 둥글게)
```

### 📦 변경된 파일

1. **manifest.json**
   - name: "AJD CSV Uploader"
   - version: 1.0.6

2. **popup.html**
   - title: "AJD CSV Uploader"
   - heading: "AJD CSV Uploader"
   - 사용 방법 문구 수정
   - version: v1.0.6

3. **styles.css**
   - 버튼 배경색: 검정색
   - 버튼 레이아웃: 가로형
   - 호버 효과 개선

---

## v1.0.5 (2025-10-26) - 비고 필드 버그 수정

### 🐛 수정된 문제

#### 비고(참석자 등 필요 기재사항) 필드가 입력되지 않는 문제 ✅
**문제**: CSV에 비고 데이터가 있는데도 입력되지 않음

**원인**: 
- CSV 헤더: `비고(참석자 등 필요 기재사항)`
- 코드에서 찾는 헤더: `비고(참석자 등)`
- 헤더 이름이 달라서 매칭 실패

**해결**:
- ✅ 3가지 헤더 형식 모두 지원
  1. `비고(참석자 등 필요 기재사항)` ← 표준 형식
  2. `비고(참석자 등)` ← 짧은 형식
  3. `비고` ← 최소 형식
- ✅ Fallback 로직으로 모든 형식 자동 인식

### 📦 변경된 파일

**content.js**
- 비고 필드 헤더 매칭 로직 개선
- 3단계 fallback 추가

**sample.csv**
- 헤더를 표준 형식으로 업데이트
- `비고(참석자 등 필요 기재사항)` 사용

**README.md**
- CSV 형식 섹션 업데이트
- 비고 컬럼의 다양한 형식 명시

---

## v1.0.4 (2025-10-26) - UI 개선 및 문서 업데이트

### ✨ 개선 사항

#### 1. 제작자 정보 업데이트 ✅
**변경 내용**:
- Footer 문구 변경: "Made with ❤️ by Hannes"
- Hannes 클릭 시 이메일 작성 가능 (haseok@haseok.com)
- 호버 효과 추가

#### 2. 날짜 형식 문서 개선 ✅
**추가된 예시**:
- 2025-10-01 (10월)
- 2025.11.23 (11월)
- 2025-12-31 (12월)
- 모든 월(01~12) 지원 명시

**참고**: 날짜 파싱 로직 자체는 이미 모든 월을 지원하고 있었으며, 문서만 명확하게 개선되었습니다.

### 📦 변경된 파일

1. **popup.html**
   - Footer에 mailto 링크 추가
   - 링크 스타일 추가
   - 버전 v1.0.4로 업데이트

2. **manifest.json**
   - 버전 v1.0.4로 업데이트

3. **README.md**
   - 날짜 형식 예시 확장

---

## v1.0.3 (2025-10-26) - 날짜 입력 버그 수정

### 🐛 수정된 문제

#### 날짜 필드 입력 안 되는 문제 수정 ✅
**문제**: CSV 업로드 후 날짜가 입력되지 않음 (yyyy.mm.dd 필드가 비어있음)

**원인**: 
- 날짜 input 필드 selector가 정확하지 않음
- 단일 이벤트 트리거로는 충분하지 않음

**해결**:
- ✅ 4가지 방법으로 날짜 필드 찾기 시도
  1. name 속성으로 찾기
  2. column ID로 찾기
  3. placeholder로 찾기
  4. 첫 번째 text input 사용
- ✅ 여러 이벤트 트리거 (input, change, blur, keyup)
- ✅ focus/blur로 강제 업데이트
- ✅ 상세한 디버깅 로그 추가

### 📦 변경된 파일

**content.js**
- 날짜 입력 로직 대폭 개선
- 4단계 fallback selector
- 다중 이벤트 트리거
- 상세 디버깅 로그

---

## v1.0.2 (2025-10-26) - 긴급 버그 수정

### 🐛 수정된 문제

#### CSV 파싱 오류 수정 ✅
**문제**: CSV 파일 업로드 시 "CSVParser is not defined" 오류 발생

**원인**: 
- `parser.js`가 `content.js`보다 나중에 로드됨
- content.js에서 CSVParser 클래스를 찾을 수 없음

**해결**:
- ✅ `manifest.json`에서 스크립트 로드 순서 수정
- ✅ `parser.js` → `content.js` 순서로 로드
```json
"js": ["parser.js", "content.js"]
```

### 📦 변경된 파일

**manifest.json**
- content_scripts의 js 배열에 parser.js 추가
- 올바른 순서로 스크립트 로드

---

## v1.0.1 (2025-10-26) - 버그 수정

### 🐛 수정된 문제

#### 1. URL 패턴 인식 문제 ✅
**문제**: `https://ajd.ncpworkplace.com/user/write/fg-dfm/...` URL에서 Extension이 활성화되지 않음

**원인**: 
- `ncpworkplace.com` 도메인이 manifest.json에 누락됨
- URL 패턴 감지 로직 미흡

**해결**:
- ✅ `manifest.json`에 `*://*.ncpworkplace.com/*` 추가
- ✅ `isExpenseFormPage()` 함수에 URL 패턴 체크 추가
- ✅ 초기화 로직 개선 (URL 변경 감지)

#### 2. 불필요한 기능 제거 ✅
**문제**: "Naver Works 열기" 버튼이 필요 없음

**해결**:
- ✅ `popup.html`에서 버튼 제거
- ✅ `popup.js`에서 관련 로직 제거
- ✅ 더 심플한 팝업 UI

### 📦 변경된 파일

1. **manifest.json**
   - ncpworkplace.com 도메인 추가
   - host_permissions 업데이트
   - content_scripts matches 업데이트

2. **content.js**
   - URL 패턴 감지 로직 추가
   - 초기화 로직 개선
   - 더 나은 로깅

3. **popup.html**
   - "Naver Works 열기" 버튼 제거
   - 레이아웃 심플화

4. **popup.js**
   - 버튼 관련 로직 제거
   - ncpworkplace.com 체크 추가

5. **README.md**
   - URL 예시 업데이트

### 🧪 테스트 항목

- [x] ncpworkplace.com URL에서 버튼 표시
- [x] 기존 worksmobile.com 도메인 정상 작동
- [x] SPA 네비게이션 감지
- [x] Popup UI 간소화 확인

---

## v1.0.0 (2025-10-26) - 초기 릴리즈

### ✨ 주요 기능

- CSV 파일 업로드
- 데이터 미리보기
- 자동 검증
- 실시간 진행 표시
- 에러 리포트
- 헤더 자동 인식

---

## 🔜 향후 계획

### v1.1.0 (예정)
- [ ] 설정 페이지
- [ ] 컬럼 매핑 커스터마이징
- [ ] 템플릿 저장

### v1.2.0 (예정)
- [ ] 업로드 히스토리
- [ ] 통계 대시보드
- [ ] 다국어 지원

---

## 🙏 감사합니다

피드백 주신 분들께 감사드립니다!
