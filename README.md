# Goo9 Novel Series

Goo9의 작품만 전시하는 1인 웹소설 전시관입니다.
워드(.docx)로 쓴 원고를 그대로 업로드하면 **글자 색·폰트·정렬·구분선 등 서식을 살려서** 독자에게 보여줍니다.

- **기술**: Next.js (App Router) + TypeScript + Tailwind + SQLite(@libsql/client)
- **원고 변환**: 관리자 페이지에서 .docx 업로드 → `docx-preview`가 브라우저에서 서식 그대로 HTML로 변환 → 저장
- **이미지**: docx 안의 그림은 자동으로 글 안에 박혀서 저장됩니다(별도 저장소 불필요)

---

## 📁 폴더 구조
```
app/                 페이지와 API
  page.tsx           홈(작품 전시)
  novel/[slug]/      작품 상세 + 회차 목록
  novel/[slug]/[number]/  리더(본문)
  admin/             관리 페이지(업로드/관리)
  api/               로그인·작품·회차 API
components/           리더 설정, 관리 UI
lib/db.ts             데이터 저장/조회
lib/auth.ts           관리자 로그인
```

---

## 🚀 Railway 배포 (단계별)

### 1. GitHub에 올리기
이 폴더를 GitHub 저장소(https://github.com/Recorder001/Goo9NovelSeries)에 push 합니다.
(아래 "처음 push 하는 법" 참고)

### 2. Railway에서 프로젝트 만들기
1. https://railway.app 로그인 → **New Project** → **Deploy from GitHub repo**
2. `Recorder001/Goo9NovelSeries` 선택
3. Railway가 자동으로 Next.js를 인식해 빌드합니다.

### 3. 환경변수 3개 설정 (중요)
프로젝트 → **Variables** 탭에서 추가:

| 이름 | 값 | 설명 |
|------|----|------|
| `ADMIN_PASSWORD` | (본인만 아는 비밀번호) | /admin 로그인 비밀번호 |
| `SESSION_SECRET` | (길고 무작위한 문자열) | 로그인 보안용 |
| `DATABASE_URL` | `file:/data/goo9.db` | 데이터 저장 위치 |

### 4. 데이터가 사라지지 않게 — 볼륨(Volume) 연결 ★꼭★
Railway는 재배포할 때마다 디스크가 초기화됩니다. 작품 데이터를 지키려면 **볼륨**을 붙여야 합니다.
1. 서비스 → 우클릭 또는 **Settings** → **Volumes** → **New Volume**
2. **Mount path** 를 `/data` 로 지정
3. 위의 `DATABASE_URL` 이 `file:/data/goo9.db` 인지 확인 (볼륨 경로 안에 저장됨)

> 볼륨을 안 붙이면 재배포 때 작품이 날아갑니다. 이 단계 꼭 하세요.

### 5. 도메인 만들기
**Settings → Networking → Generate Domain** → 주소가 생깁니다.

### 6. 끝! 사용하기
- 생성된 주소로 접속 → 빈 전시관이 보입니다.
- `주소/admin` 접속 → `ADMIN_PASSWORD` 로 로그인 → 작품 추가 → 회차에 .docx 업로드.

---

## ✍️ 글 올리는 법
1. 워드나 구글독스에서 글을 씁니다. (구글독스는 `파일 → 다운로드 → Microsoft Word(.docx)`)
2. `주소/admin` 로그인 → **새 작품** 으로 작품 등록(제목, 주소(slug), 표지 등)
3. 작품 선택 → **+ 회차 추가** → 회차 번호·제목 입력 → .docx 파일 선택
4. 미리보기 확인 후 **회차 저장**.

---

## 💻 내 컴퓨터에서 미리 돌려보기(선택)
```bash
npm install
# .env 파일을 만들고 .env.example 내용을 채웁니다
npm run dev
# http://localhost:3000 접속
```

---

## ⚙️ 환경변수 요약
`.env.example` 파일 참고. 로컬은 `DATABASE_URL="file:./dev.db"` 면 충분합니다.

---

## 📤 처음 push 하는 법 (참고)
```bash
git init
git add .
git commit -m "first commit: Goo9 Novel Series"
git branch -M main
git remote add origin https://github.com/Recorder001/Goo9NovelSeries.git
git push -u origin main
```
