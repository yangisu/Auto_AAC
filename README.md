# Auto_AAC

Auto_AAC는 과학 수업 원문을 특수교육 대상 학생이 이해하기 쉬운 AAC 카드 초안으로 변환하는 MVP 도구입니다. 일반 요약기가 아니라, 교사가 입력한 과학 개념을 학생 특성에 맞춰 “검토 가능한 AAC 카드 묶음”으로 바꾸는 교사용 제작 보조 도구입니다.

## 핵심 목표

- 교사가 학생 프로필과 생성용 텍스트를 입력합니다.
- 시스템은 교육과정 grounding과 특수교육 grounding을 함께 적용합니다.
- 교사가 원하는 AAC 카드 수를 1-4개 중 선택합니다.
- 각 카드는 짧은 한국어 문장, AAC 이미지, 수정 방향 입력 칸을 가집니다.
- 생성 결과는 최종 정답이 아니라 `교사용 검토 초안`입니다.


## 사용 흐름

1. `학생 프로필`에 학생의 이해 수준, 주의집중, 수용언어, 시각 단서 선호, 행동/정서 특성을 적습니다.
2. `생성용 텍스트`에 AAC 카드로 만들 수업 텍스트를 입력합니다.
3. `카드 수`에서 기본 1개부터 시작해 `+` 버튼으로 필요한 AAC 카드 수를 늘립니다.
4. `AAC n개 초안 생성`을 누릅니다.
5. 생성된 각 AAC 카드에서 문장을 직접 수정합니다.
6. 카드별 `재생성 수정 방향`에 원하는 그림 수정 방향을 적습니다.
7. `수정 방향 반영 재생성`을 눌러 해당 카드 이미지를 다시 생성합니다.
8. 필요 없는 카드는 삭제하고, 교사가 최종 검토합니다.

## 예제 1: 광합성

학생 프로필:

```text
초등학교 2학년 수준의 어휘는 이해하지만 긴 문장을 어려워함. 인과관계 파악이 어렵고 주의집중 시간이 짧음. 그림은 단순하고 큰 것이 좋음.
```

생성용 텍스트:

```text
잎은 햇빛과 물을 받아 양분을 만든다.
```

추천 카드 수: `3`

예상 카드 흐름:

- 잎이 햇빛을 받는다.
- 잎이 물을 받는다.
- 잎이 양분을 만든다.

## 예제 2: 상태 변화

학생 프로필:

```text
수용언어가 약하고 한 번에 한 가지 정보만 이해함. 작업기억 부담이 크며 변화 전과 후를 나누어 보여주면 이해가 좋아짐.
```

생성용 텍스트:

```text
물은 가열되면 수증기가 되고, 수증기는 차가워지면 다시 물이 된다.
```

추천 카드 수: `4`

예상 카드 흐름:

- 물이 뜨거워진다.
- 물이 수증기로 변한다.
- 수증기가 차가워진다.
- 수증기가 물로 변한다.

## 예제 3: 힘과 운동

학생 프로필:

```text
짧은 문장을 선호하고 추상어 이해가 어려움. 화살표와 전후 비교 그림에 잘 반응함. 전환 상황에서 불안이 있어 순서를 예측할 수 있어야 함.
```

생성용 텍스트:

```text
힘은 물체의 운동 방향을 바꿀 수 있다.
```

추천 카드 수: `2`

예상 카드 흐름:

- 힘이 물체를 민다.
- 물체의 방향이 바뀐다.

## Grounding 구조

### 교육과정 Grounding

`data/curriculum_seed.json`은 중학교 과학 맥락을 정적 JSON으로 보관합니다. 복잡한 벡터 DB 없이 키워드 overlap 방식으로 관련 과학 맥락을 선택합니다.

각 과학 맥락에는 다음 정보가 포함됩니다.

- `keywords`: 생성용 텍스트 검색용 핵심어
- `promptGuidance`: LLM 변환 지침
- `aacSupports`: AAC 표현 지원 방식
- `sentenceDecomposition`: 주어, 목적어, 서술어 후보
- `cardSentenceFrames`: 바로 사용할 수 있는 짧은 한국어 카드 문장 예시

이 구조의 목표는 과학 개념을 `잎이 햇빛을 받는다.`처럼 주어-목적어-서술어 중심 단문으로 쉽게 분리하는 것입니다.

### 특수교육 Grounding

`data/special_education_grounding.json`은 학생 특성에 따라 적용할 변환 규칙을 세분화합니다.

- 수용언어 지원: 한 카드에 독립절 하나, 서술어 하나
- 작업기억 지원: 1-4단계, 한 카드에 새 정보 하나
- 시각 변별 지원: 흰 배경, 큰 중심 상징, 높은 대비
- 전환 예측성 지원: 입력, 변화, 결과 순서 유지
- AAC 핵심어휘 재사용: `받는다`, `만든다`, `바뀐다`, `간다` 같은 단순 서술어 반복

## AAC 스타일 프로필

`data/aac_style_profile.json`은 팀원들이 제작한 AAC 예시 이미지에서 추출한 시각 규칙을 보관합니다.

- 흰 배경
- 두꺼운 검은 윤곽선
- 단순 flat vector
- 둥근 카드 프레임
- 파랑/초록 테두리
- 화살표로 순서나 원인-결과 표현
- 한 이미지에 한 개념
- 글자, 말풍선, 복잡한 배경 금지

이 앱은 이미지 생성 모델에 사용할 참조 스타일을 규칙화한 prompt/style-conditioned image generation 구조입니다.

## API

### `POST /api/generate`

입력:

```json
{
  "studentProfile": "학생 특성",
  "scienceText": "생성용 텍스트",
  "requestedStepCount": 1
}
```

처리:

- 교육과정 grounding 검색
- 특수교육 규칙 선택
- OpenAI structured output 생성
- 각 카드 이미지 생성

### `POST /api/regenerate-image`

입력:

```json
{
  "imagePrompt": "기존 이미지 프롬프트",
  "revisionInstruction": "화살표를 더 크게 보여줘"
}
```

처리:

- 기존 AAC 스타일 프로필 유지
- 교사의 수정 방향을 이미지 프롬프트에 반영
- 해당 카드 이미지만 재생성


## 참고 자료

- 교육부, 2022 개정 교육과정 고시 및 교육부 고시 제2022-33호: https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&m=040401
- 한국과학창의재단, 2022 개정 과학과 교육과정 시안/최종 자료: https://cdn.kosac.re.kr/files/legacy_data/jnrepo/upload/jnBrdBoard/202304/a6819baa69b640648e861c4080fba452_1682063071411.pdf
- 국립특수교육원, 2022 개정 특수교육 교육과정 평가자료 개요: https://www.nise.go.kr/field/page/vol131/sub_2_04_2.html
- ASHA Practice Portal, Intellectual Disability: https://www.asha.org/practice-portal/clinical-topics/intellectual-disability/
- ASHA Practice Portal, Augmentative and Alternative Communication: https://www.asha.org/Practice-Portal/Professional-Issues/Augmentative-and-Alternative-Communication/
- CAST Universal Design for Learning: https://www.cast.org/what-we-do/universal-design-for-learning/
- What Works Clearinghouse, Organizing Instruction and Study to Improve Student Learning: https://ies.ed.gov/ncee/WWC/PracticeGuide/1
- Autism Internet Modules, Visual Supports: https://autisminternetmodules.org/m/1048
