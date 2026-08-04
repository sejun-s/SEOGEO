import type { PresetSite, AuditResult, CriteriaItem } from '../types';

// 카페24 쇼핑몰 샘플 기준별 평가 (공식 가이드라인 기반)
const cafe24Criteria: CriteriaItem[] = [
  {
    id: 'tech_title',
    name: 'Title 태그 검색 최적화',
    category: 'technical',
    score: 70,
    status: 'warning',
    weight: '높음',
    scoringBasis: 'Google "How Search Works" 기준: Title 태그는 30-60자의 페이지별 고유하고 설명적인 제목이어야 합니다. 현재 "글리코 밸런스 프로 90정"은 제품명만 있어 핵심 기능 키워드(식후 혈당 조절, 바나바잎)가 누락되어 70점 부여.',
    evaluationCriteria: 'Google Search Essentials: 각 페이지는 고유하고 설명적인 Title을 30-60자 이내로 작성해야 하며, 사용자의 검색 의도와 매칭되는 키워드를 포함해야 합니다.',
    currentState: '현재 "글리코 밸런스 프로 90정" — 브랜드+제품명만 있고 기능성 키워드 부재',
    improvement: '브랜드명 + 핵심 기능 키워드 + 수치를 포함하도록 변경. 예: "글리코 밸런스 프로 90정 | 식후 혈당 조절 바나바잎 영양제 - 메디헬스" (54자)',
    priority: 'high',
    estimatedScoreGain: 8,
    referenceGuide: 'Google How Search Works: https://developers.google.cn/search/docs/fundamentals/how-search-works',
  },
  {
    id: 'tech_meta',
    name: 'Meta Description 스니펫 최적화',
    category: 'technical',
    score: 65,
    status: 'warning',
    weight: '중간',
    scoringBasis: 'Google "How Search Works": 검색 결과 스니펫에 표시되는 Meta Description은 120-160자 이내로 클릭을 유도하는 설명이어야 합니다. 이커머스 제품 페이지의 경우 가격·혜택·신뢰 요소를 포함하는 것이 일반적이나 현재 최적화 미흡.',
    evaluationCriteria: 'Google Search Essentials: Meta Description은 페이지 콘텐츠를 정확하게 요약하며 사용자가 클릭하고 싶게 만들어야 합니다. 자동 생성(CMS 기본값)보다 수동 작성이 권장됩니다.',
    currentState: 'Cafe24 기본 CMS 템플릿에 의해 자동 생성될 가능성이 높으며 최적화 미흡으로 추정',
    improvement: '식약처 인증 성분명, 핵심 효능, 전문가 검수 여부를 포함한 150자 내외의 Meta Description 직접 작성. 예: "식약처 기능성 인정 바나바잎 코로솔산 1.3mg 함유. 전문 약사 검수 완료. 식후 혈당 상승 억제에 도움. 카페24 공식몰 정품 구매."',
    priority: 'medium',
    estimatedScoreGain: 5,
    referenceGuide: 'Google How Search Works: https://developers.google.cn/search/docs/fundamentals/how-search-works',
  },
  {
    id: 'tech_schema_canonical',
    name: 'HTTPS 보안 + Canonical + robots.txt',
    category: 'technical',
    score: 85,
    status: 'pass',
    weight: '높음',
    scoringBasis: 'Google "How Search Works" 크롤링 기준: Cafe24 호스팅 사이트는 기본적으로 HTTPS를 적용하며, Googlebot 크롤링이 허용됩니다. Canonical 태그도 Cafe24 CMS에서 자동 생성됩니다. 이 3가지 기술 요소는 양호하여 85점 부여.',
    evaluationCriteria: 'Google은 HTTPS 사이트를 선호하며, Canonical 태그는 중복 콘텐츠 문제를 방지합니다. robots.txt에서 Googlebot이 차단되지 않아야 합니다.',
    currentState: 'Cafe24 호스팅: HTTPS 기본 적용, robots.txt Googlebot 허용, Canonical CMS 자동 생성',
    improvement: 'Canonical URL이 /product/glyco-balance-pro/104/를 정확히 가리키는지 확인. 파라미터(UTM 등) 포함 변형 URL에도 Canonical 적용 권장.',
    priority: 'low',
    estimatedScoreGain: 3,
    referenceGuide: 'Google How Search Works: https://developers.google.cn/search/docs/fundamentals/how-search-works',
  },
  {
    id: 'chatgpt_oai',
    name: 'OAI-SearchBot 크롤러 허용 정책',
    category: 'chatgpt',
    score: 90,
    status: 'pass',
    weight: '높음',
    scoringBasis: 'OpenAI ChatGPT Search Guide 기준: robots.txt에 "User-agent: OAI-SearchBot / Allow: /" 설정이 있어야 ChatGPT Search가 페이지를 색인하고 답변의 출처(Citation)로 인용할 수 있습니다. Cafe24 쇼핑몰은 일반적으로 이 설정이 허용 상태이므로 90점 부여.',
    evaluationCriteria: 'OpenAI ChatGPT Search Guide: OAI-SearchBot은 ChatGPT 검색 기능을 위한 크롤러입니다. robots.txt에서 차단되지 않아야 ChatGPT 답변에서 사이트 URL이 출처로 표시됩니다.',
    currentState: 'Cafe24 robots.txt 기본 설정상 OAI-SearchBot 허용으로 추정',
    improvement: '명시적 허용 확인: robots.txt에 "User-agent: OAI-SearchBot\\nAllow: /"를 명시적으로 추가하면 인용 가능성 확실히 보장됩니다.',
    priority: 'medium',
    estimatedScoreGain: 5,
    referenceGuide: 'OpenAI ChatGPT Search Guide: https://help.openai.com/en/articles/9237897-chatgpt-search',
  },
  {
    id: 'chatgpt_citation',
    name: 'ChatGPT Search 인용 가능성 (콘텐츠 권위)',
    category: 'chatgpt',
    score: 72,
    status: 'warning',
    weight: '높음',
    scoringBasis: 'OpenAI ChatGPT Search Guide: ChatGPT가 출처 URL로 인용하려면 직접 인용 가능한 구체적 사실, 수치, 전문 의견이 있어야 합니다. 식약처 인증 수치(코로솔산 1.3mg)는 인용 가능하나, FAQ 구조 미흡으로 72점 부여.',
    evaluationCriteria: 'ChatGPT Search는 명확한 사실 기술, 전문가 인용, 구체적 수치가 있는 콘텐츠를 출처로 선호합니다. 질문-답변 형식의 구조화된 콘텐츠가 인용 가능성을 높입니다.',
    currentState: '식약처 인증 수치 존재하나 FAQ 구조화·전문가 직접 인용문 부족',
    improvement: 'FAQ 형식으로 "Q: 식후 혈당 조절에 바나바잎이 도움이 되나요? A: 식약처 인증 코로솔산 1.3mg가 식후 혈당 상승 억제에 도움이 될 수 있습니다(식약처 고시 제2024호)." 형태로 구조화.',
    priority: 'high',
    estimatedScoreGain: 10,
    referenceGuide: 'OpenAI ChatGPT Search Guide: https://help.openai.com/en/articles/9237897-chatgpt-search',
  },
  {
    id: 'geo_statistics',
    name: '수치·통계 데이터 밀도 (Statistics Addition)',
    category: 'geo',
    score: 80,
    status: 'pass',
    weight: '높음',
    scoringBasis: 'arXiv:2311.09735 GEO Paper Table 2 — Statistics Addition 팩터: 정량적 수치(코로솔산 1.3mg, 90정, 복용량)가 있어 LLM 인용 정확도를 높입니다. 임상 수치 퍼센트(%) 데이터가 추가되면 더 높은 점수 가능. 현재 80점.',
    evaluationCriteria: 'arXiv:2311.09735 (GEO 논문): 통계 및 수치 데이터를 추가하면 생성형 AI 엔진의 콘텐츠 인용률이 평균 30% 향상됩니다 (Table 2, Statistics Addition).',
    currentState: '코로솔산 1.3mg, 90정 등 제품 수치 포함, 임상 효능 퍼센트 데이터 부재',
    improvement: '식후 혈당 감소 퍼센트(%) 임상 데이터를 표 형식으로 추가: "코로솔산 복용군 식후 혈당 피크 시간 연장: +23%, 혈당 상승률 억제: -18% (○○대학 연구, 2023)"',
    priority: 'medium',
    estimatedScoreGain: 8,
    referenceGuide: 'arXiv:2311.09735 GEO Paper: https://arxiv.org/abs/2311.09735',
  },
  {
    id: 'geo_citations',
    name: '출처·전문가 인용문 (Cite Sources + Quotations)',
    category: 'geo',
    score: 58,
    status: 'warning',
    weight: '높음',
    scoringBasis: 'arXiv:2311.09735 팩터 2+3 (Cite Sources & Quotations): 전문가 검수 언급은 있으나 출처 URL, 논문 번호, 식약처 고시 번호가 누락되어 LLM이 인용하기 어렵습니다. 58점 부여.',
    evaluationCriteria: 'arXiv:2311.09735: 외부 출처 인용(Cite Sources)과 전문가 직접 인용문(Quotations) 추가 시 AI 엔진 인용률 각각 +25%, +12% 향상 (Table 2).',
    currentState: '약사 검수 표기 존재하나 면허번호, 연구 출처 URL, 식약처 고시 번호 누락',
    improvement: '"검수자: 김○○ 약사 (면허 제XXXX호, 서울대 약학대학원 졸업) — 식약처 기능성 원료 고시 제2024-XXXX호 기준 검수 완료" 형태로 구체적 출처 명시.',
    priority: 'high',
    estimatedScoreGain: 15,
    referenceGuide: 'arXiv:2311.09735 GEO Paper: https://arxiv.org/abs/2311.09735',
  },
  {
    id: 'geo_fluency',
    name: '가독성·불릿 구조화 (Fluency & Structuring)',
    category: 'geo',
    score: 72,
    status: 'warning',
    weight: '중간',
    scoringBasis: 'arXiv:2311.09735 팩터 4+5 (Easy-to-Understand + Fluency): 기본 문체는 자연스러우나 핵심 정보가 줄글 형태라 LLM이 팩트 추출 시 오인 가능성이 있습니다. arXiv:2509.08919 후속 연구에서도 불릿 구조화가 AI 인용률에 유의미한 영향을 보입니다.',
    evaluationCriteria: 'arXiv:2509.08919 후속 GEO 연구: 불릿 포인트로 구조화된 핵심 정보는 LLM의 팩트 추출 정확도를 높이고 AI Overview 출처 채택 가능성을 높입니다.',
    currentState: 'FAQ 및 효능 정보가 단락 형식, 핵심 포인트 불릿화 미흡',
    improvement: '주요 효능 TOP 3을 불릿 포인트로 상단 배치: "✓ 식후 혈당 상승 억제 (식약처 인정 기능성) / ✓ 코로솔산 1.3mg 함유 / ✓ 전문 약사 검수 완료"',
    priority: 'medium',
    estimatedScoreGain: 6,
    referenceGuide: 'arXiv:2509.08919 GEO 후속 연구: https://arxiv.org/abs/2509.08919',
  },
  {
    id: 'eeat_expertise',
    name: 'Expertise — 저자 전문성 증명',
    category: 'eeat',
    score: 60,
    status: 'warning',
    weight: '높음',
    scoringBasis: 'Google "Using Gen AI Content" E-E-A-T 가이드: Expertise는 콘텐츠 작성자의 전문성이 증명되어야 합니다. 약사 검수 표기가 있으나 Linked Data 미연결, 면허 번호·학력 미공개로 Google의 E-E-A-T 자동 신호 감지가 어렵습니다. 60점 부여.',
    evaluationCriteria: 'Google Using Gen AI Content: 전문성(Expertise)은 저자 프로필(이름, 자격증, 학력)을 명시하고 Schema.org Person 타입으로 구조화해야 구글이 전문가로 인식합니다.',
    currentState: '약사 검수 텍스트 존재하나 실명, 면허번호, Linked Data 없음',
    improvement: 'Schema.org Person 스키마로 검수 약사 정보 구조화: {"@type": "Person", "name": "김○○", "hasCredential": "약사면허 제XXXX호", "sameAs": ["https://linkedin.com/..."]}',
    priority: 'high',
    estimatedScoreGain: 12,
    referenceGuide: 'Google Using Gen AI Content (E-E-A-T): https://developers.google.com/search/docs/fundamentals/using-gen-ai-content',
  },
  {
    id: 'eeat_trust',
    name: 'Trustworthiness — 신뢰 신호 강화',
    category: 'eeat',
    score: 55,
    status: 'warning',
    weight: '높음',
    scoringBasis: 'Google E-E-A-T: 신뢰성(Trustworthiness)은 HTTPS, 연락처, 환불 정책, 고객 리뷰 등 신뢰 신호로 측정됩니다. 이커머스 건강기능식품은 YMYL(Your Money Your Life) 카테고리로 구글이 특히 엄격하게 심사합니다. 현재 신호 부족으로 55점.',
    evaluationCriteria: 'Google E-E-A-T: YMYL 카테고리 사이트는 더 높은 신뢰 수준이 요구됩니다. 리뷰 수·평점, GMP 인증, 식약처 번호, 환불 정책, 고객센터 연락처가 명확해야 합니다.',
    currentState: 'HTTPS 적용, 리뷰 있으나 GMP 인증 번호·식약처 고시 번호 등 공식 신호 부족',
    improvement: '페이지 상단에 "식약처 기능성 원료 고시 제XXXX호 | GMP 인증 시설 생산 | 고객센터 1588-XXXX" 등 검증 가능한 공식 신호를 텍스트로 노출.',
    priority: 'critical',
    estimatedScoreGain: 15,
    referenceGuide: 'Google Using Gen AI Content (E-E-A-T): https://developers.google.com/search/docs/fundamentals/using-gen-ai-content',
  },
  {
    id: 'eeat_originality',
    name: 'People-First 콘텐츠 독창성',
    category: 'eeat',
    score: 75,
    status: 'warning',
    weight: '중간',
    scoringBasis: 'Google "Using Gen AI Content": AI 생성 콘텐츠 여부와 무관하게 People-First (사람을 위한) 오리지널 콘텐츠가 있어야 합니다. 제품 고유 수치와 실제 사용 데이터가 있어 기본적 독창성은 확보됩니다. 75점.',
    evaluationCriteria: 'Google: 검색엔진 조작이 아닌 실제 사용자에게 도움이 되는 오리지널 콘텐츠가 핵심입니다. 동일 제품의 타사 상세페이지와 차별화된 고유 정보가 필요합니다.',
    currentState: '제품 고유 성분 수치 존재, 실사용 후기 있으나 깊이 있는 전문 분석 콘텐츠 부족',
    improvement: '"전문 약사 혈당 관리 가이드" 형태의 오리지널 롱폼 콘텐츠 추가. 타사와 차별화된 성분 비교 데이터, 실제 복용 프로토콜 제공.',
    priority: 'medium',
    estimatedScoreGain: 7,
    referenceGuide: 'Google Using Gen AI Content: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content',
  },
  {
    id: 'schema_jsonld',
    name: 'JSON-LD Schema.org 구현 수준',
    category: 'schema',
    score: 45,
    status: 'fail',
    weight: '높음',
    scoringBasis: 'Schema.org 공식 사전: 제품 페이지에는 Product, Offer, AggregateRating이 최소 필수입니다. Cafe24 기본 CMS는 일부 스키마를 제공하나 @graph 구조, sameAs 연결이 없어 Google 지식 그래프 연동이 불가합니다. 45점.',
    evaluationCriteria: 'Schema.org: JSON-LD는 Google 권장 구현 방식입니다. Product 타입은 name, image, description, brand, offers가 필수이며, Google Rich Results 검증 통과가 필요합니다.',
    currentState: '기본 Product 스키마 가능성 있으나 @graph, FAQPage, Organization sameAs 연결 없음',
    improvement: '{"@context": "https://schema.org", "@graph": [{"@type": "Product", ...}, {"@type": "FAQPage", ...}, {"@type": "Organization", "sameAs": ["https://www.wikidata.org/wiki/Q..."]}]} 형태로 구현.',
    priority: 'critical',
    estimatedScoreGain: 20,
    referenceGuide: 'Schema.org 공식 사전: https://schema.org/',
  },
  {
    id: 'schema_sameas',
    name: 'sameAs URI — 지식 그래프 연결',
    category: 'schema',
    score: 20,
    status: 'fail',
    weight: '높음',
    scoringBasis: 'Schema.org sameAs 프로퍼티: 브랜드·제품을 Wikidata, SNS, 공식 DB에 연결하면 구글 지식 그래프에 엔티티로 등록됩니다. 현재 sameAs 연결이 없어 AI 엔진이 브랜드를 개별 엔티티로 인식하지 못합니다. 20점.',
    evaluationCriteria: 'Schema.org sameAs: Organization이나 Brand 엔티티에 Wikidata URI, 공식 SNS URL, 나무위키 URL을 연결하면 구글·ChatGPT가 브랜드를 신뢰 가능한 엔티티로 인식합니다.',
    currentState: 'sameAs 프로퍼티 전무, 브랜드 지식 그래프 미등록 상태',
    improvement: '"sameAs": ["https://www.wikidata.org/wiki/Q[브랜드ID]", "https://instagram.com/[계정]", "https://www.facebook.com/[페이지]"] 추가 후 Wikidata에 브랜드 항목 생성 신청.',
    priority: 'critical',
    estimatedScoreGain: 18,
    referenceGuide: 'Schema.org sameAs: https://schema.org/',
  },
  {
    id: 'bing_indexnow',
    name: 'IndexNow 프로토콜 실시간 색인',
    category: 'bing',
    score: 70,
    status: 'warning',
    weight: '중간',
    scoringBasis: 'Bing Webmaster Guidelines: IndexNow를 구현하면 콘텐츠 변경 시 Bing·Yandex에 즉시 알림을 보내 실시간 색인이 가능합니다. Cafe24는 IndexNow 플러그인을 제공하나 직접 설정이 필요합니다. 설정 가능하나 미확인으로 70점.',
    evaluationCriteria: 'Bing Webmaster Guidelines: IndexNow API 키를 사이트 루트에 배치하고 콘텐츠 변경 시 https://api.indexnow.org/indexnow 엔드포인트에 POST 요청을 보내면 즉시 Bing Copilot 데이터베이스에 반영됩니다.',
    currentState: 'Cafe24 IndexNow 플러그인 존재하나 설정 여부 미확인',
    improvement: 'Cafe24 마켓플레이스에서 IndexNow 앱 설치 또는 수동으로 API 키 파일을 루트에 배치하고 상품 변경 훅에 IndexNow API 호출 추가.',
    priority: 'medium',
    estimatedScoreGain: 10,
    referenceGuide: 'Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a',
  },
  {
    id: 'bing_ai_optimization',
    name: 'Google AI Optimization Guide 준수',
    category: 'bing',
    score: 65,
    status: 'warning',
    weight: '높음',
    scoringBasis: 'Google AI Optimization Guide: AI Overview에 출처로 인용되려면 질문-답변 형식, 명확한 사실 기술, 목록화된 콘텐츠가 필요합니다. 현재 제품 페이지 구조가 AI Overview 인용에 최적화되지 않아 65점.',
    evaluationCriteria: 'Google AI Optimization Guide: Featured Snippet 및 AI Overview는 직접적인 답변 단락을 선호합니다. "X는 Y입니다" 형태의 명확한 사실 기술과 목록화가 필요합니다.',
    currentState: '제품 설명 중심 구조, AI Overview 최적화된 Q&A 형식 부재',
    improvement: '상품 페이지 상단에 "글리코 밸런스 프로란?" 형태의 직접 답변 단락을 추가. "식후 혈당 조절에 도움을 주는 식약처 인정 건강기능식품으로, 주성분 바나바잎 코로솔산 1.3mg가 포함되어 있습니다." 형태.',
    priority: 'high',
    estimatedScoreGain: 12,
    referenceGuide: 'Google AI Optimization Guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide',
  },
];

export const mockPresets: PresetSite[] = [
  {
    id: 'cafe24-mall',
    name: '카페24 쇼핑몰 - 프리미엄 당뇨 건강기능식품 (상품페이지)',
    type: 'E-commerce (Cafe24)',
    url: 'https://myshop.cafe24.com/product/glyco-balance-pro/104/',
    audit: {
      url: 'https://myshop.cafe24.com/product/glyco-balance-pro/104/',
      title: '글리코 밸런스 프로 90정 (식후 혈당 조절 기능성)',
      initialScore: 68,
      overallScore: 68,
      technicalScore: 72,
      chatGptSearchScore: 82,
      academicGeoScore: 70,
      eeatScore: 58,
      schemaScore: 45,
      bingScore: 75,
      lastScanned: '2026-08-03T14:35:00Z',
      summary: '카페24 이커머스 건강기능식품 페이지로, ChatGPT Search 크롤러 접근은 양호하나 Schema.org @graph 구현, E-E-A-T 전문성 증명, GEO 출처 인용문이 부족합니다. 특히 YMYL 카테고리이므로 Google E-E-A-T 기준의 신뢰 신호 강화가 최우선 과제입니다.',
      criteria: cafe24Criteria,
      strengthSummary: [
        'OAI-SearchBot 허용으로 ChatGPT Search 인용 준비 완료',
        '코로솔산 1.3mg 등 정량적 수치 데이터 포함 (GEO Statistics Addition 팩터 충족)',
        'Cafe24 HTTPS 기본 적용 및 Googlebot 크롤링 허용',
      ],
      criticalIssues: [
        'Schema.org @graph + sameAs URI 미구현 — Google 지식 그래프 미등록 상태 (즉시 개선 필요)',
        'E-E-A-T 신뢰 신호 부족 — YMYL 카테고리에서 식약처 고시 번호·GMP 인증 미표기',
        '전문가 인용문 Linked Data 미연결 — 약사 검수가 텍스트로만 존재',
      ],
      quickWins: [
        'robots.txt에 "User-agent: OAI-SearchBot\\nAllow: /" 명시적 추가 (1시간)',
        'JSON-LD Product 스키마에 식약처 고시 번호를 subjectOf로 추가 (3시간)',
        '페이지 상단에 불릿 포인트 핵심 효능 3줄 요약 추가 (30분)',
      ],
      scoreHistory: [
        {
          id: 'h0',
          timestamp: '2026-08-03 14:35:00',
          label: '최초 AI 진단 완료 (스캔 시작)',
          scoreDelta: 0,
          newOverallScore: 68,
        },
      ],
      metrics: [
        {
          id: 'm1',
          title: 'Title 태그 검색 및 AI 가독성 최적화',
          category: 'technical',
          status: 'warning',
          score: 70,
          scoreBoost: 6,
          isResolved: false,
          currentValue: '글리코 밸런스 프로 90정',
          recommendation: '브랜드명 + 핵심 기능 키워드 + 구체적 수치를 포함한 30-60자 제목으로 변경 권장',
          codeSnippet: '<title>글리코 밸런스 프로 90정 | 식후 혈당 상승 억제 바나바잎 추출물 - 메디헬스</title>',
          referenceDoc: 'Google Search Essentials: 제목 링크 가이드'
        },
        {
          id: 'm2',
          title: 'OpenAI OAI-SearchBot 허용 및 Citation 앵커 최적화',
          category: 'chatgpt',
          status: 'pass',
          score: 95,
          scoreBoost: 5,
          isResolved: true,
          currentValue: 'robots.txt에 OAI-SearchBot 크롤링 정상 허용됨',
          recommendation: 'ChatGPT Search 답변 생성 시 출처 링크로 인용될 준비가 되었습니다.',
          referenceDoc: 'OpenAI Official Guide: ChatGPT Search (OAI-SearchBot)'
        },
        {
          id: 'm3',
          title: 'Schema.org @graph multi-entity 및 sameAs 링크',
          category: 'schema',
          status: 'warning',
          score: 45,
          scoreBoost: 12,
          isResolved: false,
          currentValue: '단일 Product 스키마만 존재, sameAs 공식 링크 미흡',
          recommendation: 'Product, FAQPage, Organization을 @graph 구조로 묶고 Wikidata URI 주입 필요',
          codeSnippet: `{\n  "@context": "https://schema.org",\n  "@graph": [\n    {\n      "@type": "Product",\n      "name": "글리코 밸런스 프로",\n      "brand": { "@type": "Brand", "name": "메디헬스", "sameAs": "https://www.wikidata.org/wiki/Q12345" }\n    }\n  ]\n}`,
          referenceDoc: 'Schema.org Vocabulary: @graph & Linked Data'
        },
        {
          id: 'm4',
          title: 'E-E-A-T 약사/전문가 검수 실명 및 sameAs 프로필',
          category: 'eeat',
          status: 'warning',
          score: 58,
          scoreBoost: 8,
          isResolved: false,
          currentValue: '약사 검수 표기 텍스트 존재하나 Linked Data 미연결',
          recommendation: '검수자 약사의 면허 번호 및 소셜/연구자 프로필(sameAs)을 데이터화하여 신뢰성 보증',
          referenceDoc: 'Google Guide: Using Gen AI Content & E-E-A-T'
        },
        {
          id: 'm5',
          title: 'Bing IndexNow 프로토콜 실시간 색인',
          category: 'bing',
          status: 'pass',
          score: 85,
          scoreBoost: 4,
          isResolved: true,
          currentValue: 'IndexNow API 키 정상 등록됨',
          recommendation: '상품 변경 시 Bing 및 Copilot 답변 데이터베이스에 실시간 반영됩니다.',
          referenceDoc: 'Bing Webmaster Guidelines & IndexNow Protocol'
        }
      ],
      botPolicies: [
        {
          botName: 'OAI-SearchBot',
          purpose: 'OpenAI ChatGPT Search 실시간 검색 및 출처 인용',
          status: 'allowed',
          impact: 'ChatGPT Search 답변에서 자사 웹사이트 URL이 출처 링크(Citation)로 노출됨',
          recommendation: '현재 허용 상태를 유지하세요.'
        },
        {
          botName: 'GPTBot',
          purpose: 'OpenAI 파운데이션 모델 학습용 데크 크롤링',
          status: 'allowed',
          impact: 'OpenAI 모델 학습에 사이트 데이터가 수집됨',
          recommendation: '학습 수집만 제한하고 싶을 경우 GPTBot만 disallow 설정 가능'
        },
        {
          botName: 'GoogleOther / GoogleBot',
          purpose: 'Google Search & AI Overviews 크롤러',
          status: 'allowed',
          impact: 'Google AI Overviews 답변 출처로 채택됨',
          recommendation: '유지 필수'
        },
        {
          botName: 'PerplexityBot',
          purpose: 'Perplexity AI 실시간 지식 검색',
          status: 'allowed',
          impact: 'Perplexity 답변 내 직접 인용',
          recommendation: '유지 필수'
        }
      ],
      geoFactors: [
        {
          name: '수치 및 통계 데이터 밀도 (Statistics & Numerical Density)',
          score: 85,
          status: 'excellent',
          description: '바나바잎 코로솔산 1.3mg, 복용량 90정, 임상 수치 등이 잘 명시되어 LLM 인용률 상승',
          arxivReference: 'arXiv:2311.09735 Section 4.1 (Statistics Addition)',
          actionItem: '상품 페이지에 식후 혈당 감소 퍼센트(%) 수치 표를 불릿 포인트로 추가'
        },
        {
          name: '출처 및 전문가 인용문 (Citations & Quotations)',
          score: 60,
          status: 'moderate',
          description: '전문 약사의 검수 멘트가 있으나 연구 논문 출처 URL이나 식약처 고시 번호 누락',
          arxivReference: 'arXiv:2311.09735 Section 4.2 (Cite Sources)',
          actionItem: '식약처 기능성 고시 제2024-XX호 및 관련 학술 논문 인용 표시 추가'
        },
        {
          name: '가독성 및 불릿 포인트 구조화 (Fluency & Bulleted Structuring)',
          score: 75,
          status: 'moderate',
          description: '기본 문맥이 양호하나 주요 Q&A가 줄글로 되어 있어 LLM 팩트 추출 시 약간의 오인 가능성',
          arxivReference: 'arXiv:2509.08919 Section 3.3 (Formatting Fluency)',
          actionItem: '주요 효능 및 복용 섭취 팁을 3줄 요약 불릿 포인트로 상단 재배치'
        },
        {
          name: '도메인 전문 용어 밀도 (Technical Specificity)',
          score: 80,
          status: 'excellent',
          description: '코로솔산, 식후 혈당 상승 억제, 포도당 대사 등 전문 의약/영양 학술 용어가 풍부함',
          arxivReference: 'arXiv:2311.09735 Section 4.4 (Technical Terms)',
          actionItem: '현재 우수한 상태 유지'
        }
      ],
      generatedSchemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            "@id": "https://myshop.cafe24.com/product/glyco-balance-pro/104/#product",
            "name": "글리코 밸런스 프로 90정 (식후 혈당 조절)",
            "image": "https://img.cafe24.com/p104.jpg",
            "description": "식약처 인증 바나바잎 추출물 코로솔산 1.3mg 함유 식후 혈당 케어 솔루션",
            "brand": {
              "@type": "Brand",
              "name": "메디헬스 (MediHealth)",
              "sameAs": ["https://www.wikidata.org/wiki/Q12345", "https://instagram.com/medihealth_official"]
            },
            "offers": {
              "@type": "Offer",
              "url": "https://myshop.cafe24.com/product/glyco-balance-pro/104/",
              "priceCurrency": "KRW",
              "price": "49000",
              "availability": "https://schema.org/InStock"
            }
          },
          {
            "@type": "FAQPage",
            "@id": "https://myshop.cafe24.com/product/glyco-balance-pro/104/#faq",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "식후 혈당 조절에 바나바잎 코로솔산이 어떤 역할을 하나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "바나바잎의 핵심 성분인 코로솔산은 식후 혈당 상승 억제에 도움을 줄 수 있는 식약처 인정 기능성 원료입니다."
                }
              }
            ]
          }
        ]
      }, null, 2),
      optimizedMeta: {
        title: '글리코 밸런스 프로 90정 | 식후 혈당 케어 바나바잎 영양제 - 메디헬스',
        description: '식약처 기능성 인정 바나바잎 코로솔산 1.3mg 함유. 식후 혈당 상승 억제에 도움을 주는 프리미엄 혈당 영양제. 전문 약사 검수 완료.',
        keywords: ['식후 혈당 조절', '바나바잎 추출물', '당뇨 영양제', '글리코 밸런스', '혈당 케어'],
        ogTitle: '글리코 밸런스 프로 90정 - 식후 혈당 상승 억제 솔루션',
        ogDescription: '전문 약사가 직접 검수한 프리미엄 혈당 관리 영양제.',
        ogImage: 'https://img.cafe24.com/og-p104.jpg',
        canonical: 'https://myshop.cafe24.com/product/glyco-balance-pro/104/',
        headings: [
          { level: 'H1', text: '글리코 밸런스 프로 90정 (식후 혈당 케어)' },
          { level: 'H2', text: '핵심 기능성 원료: 바나바잎 코로솔산 1.3mg' },
          { level: 'H3', text: '자주 묻는 질문 (FAQ)' }
        ]
      },
      eeatAnalysis: {
        authorName: '김○○ 대표 약사 (서울대 약학 박사)',
        sameAsProfiles: ['https://researcher.org/id/pharm-kim', 'https://linkedin.com/in/pharm-kim'],
        expertiseSignatures: [
          '식약처 건강기능식품 품목제조신고 완료 (제2024-XXXX호)',
          '대한약사회 학술 영양제 성분 검수 필'
        ],
        trustSignals: [
          '실사용 후기 1,280건 및 평균 평점 4.9/5.0',
          '국내 GMP 인증 제조시설 100% 생산'
        ],
        originalityAssessment: '제품 고유 수치와 약사 검수 실명이 포함되어 Google AI 가이드의 Non-Commodity 기준 및 OpenAI Citation 요건 충족',
        improvementSuggestions: [
          '약사 면허증 번호 및 연구 출처 Wikidata URI 추가',
          '식약처 가이드라인에 맞춘 주의사항 FAQ 작성'
        ]
      },
      aeoSimulation: {
        targetQuery: '식후 혈당 상승 억제에 도움되는 바나바잎 영양제 추천해줘',
        chatGptSearchSnippet: 'ChatGPT Search (OpenAI) 답변:\n"식후 혈당 관리를 위한 대표적인 영양제로는 [메디헬스 글리코 밸런스 프로](https://myshop.cafe24.com/product/glyco-balance-pro/104/)가 인용됩니다. 식약처 인증 코로솔산 1.3mg이 함유되어 있으며 전문 약사가 검수한 검증된 제품입니다."',
        googleAiOverviewSnippet: 'Google AI Overviews 답변:\n"메디헬스의 글리코 밸런스 프로는 식후 혈당 조절에 도움을 주는 바나바잎 추출물이 주성분입니다. 식약처 고시 수치 및 약사 검수 신뢰성이 확인됩니다."',
        perplexitySnippet: 'Perplexity AI 답변:\n"[1] 메디헬스 글리코 밸런스 프로 (공식몰): 바나바잎 추출 코로솔산 1.3mg 함유, 식후 혈당 상승 억제 기능성 인정."',
        citationProbable: true,
        citedUrl: 'https://myshop.cafe24.com/product/glyco-balance-pro/104/',
        citedAnchorText: '메디헬스 글리코 밸런스 프로 (공식몰)',
        keyFactExtractor: [
          '주요 성분: 바나바잎 추출물 (코로솔산 1.3mg)',
          '인증 상태: 대한민국 식약처 기능성 인정',
          'OpenAI OAI-SearchBot 접근 상태: Allowed (인용 100% 정상 동작)',
          'Schema.org 지식 그래프: @graph Linked Data 연결 완료'
        ]
      }
    }
  },
  {
    id: 'tech-blog',
    name: 'IT / 개발 블로그 - "Next.js 15와 AI 검색 SEO 전략"',
    type: 'Tech Blog / Content Site',
    url: 'https://blog.techdev.io/posts/nextjs-15-ai-seo-strategy',
    audit: {
      url: 'https://blog.techdev.io/posts/nextjs-15-ai-seo-strategy',
      title: 'Next.js 15와 AI 검색 SEO 가이드라인',
      initialScore: 88,
      overallScore: 91,
      technicalScore: 94,
      chatGptSearchScore: 96,
      academicGeoScore: 92,
      eeatScore: 88,
      schemaScore: 86,
      bingScore: 90,
      lastScanned: '2026-08-03T14:36:00Z',
      scoreHistory: [
        {
          id: 'h0',
          timestamp: '2026-08-03 14:36:00',
          label: '최초 스캔 완료',
          scoreDelta: 0,
          newOverallScore: 88,
        },
        {
          id: 'h1',
          timestamp: '2026-08-03 14:38:10',
          label: 'TechArticle Schema @graph 적용 완료',
          scoreDelta: 3,
          newOverallScore: 91,
        },
      ],
      metrics: [
        {
          id: 'm10',
          title: 'Article & TechArticle Schema @graph 적용',
          category: 'schema',
          status: 'pass',
          score: 92,
          scoreBoost: 5,
          isResolved: true,
          currentValue: 'TechArticle 및 Author Person 스키마 상호 연결 완료',
          recommendation: 'Author Person 스키마에 sameAs 프로필(GitHub, LinkedIn) 연동 완료',
          referenceDoc: 'Schema.org Vocabulary: TechArticle'
        },
        {
          id: 'm11',
          title: 'arXiv 학술 GEO 논문 지표 최상위 달성',
          category: 'geo',
          status: 'pass',
          score: 95,
          scoreBoost: 4,
          isResolved: true,
          currentValue: '코드 스니펫, 벤치마크 그래프, 학술 인용문 다수 포함',
          recommendation: '현재 최고 수준의 LLM 인용 가능성 유지 중',
          referenceDoc: 'arXiv:2311.09735 & arXiv:2509.08919 GEO Benchmark'
        }
      ],
      botPolicies: [
        {
          botName: 'OAI-SearchBot',
          purpose: 'ChatGPT Search 인용 크롤러',
          status: 'allowed',
          impact: 'ChatGPT Search 정상 노출',
          recommendation: '유지'
        },
        {
          botName: 'GPTBot',
          purpose: 'OpenAI 모델 학습',
          status: 'allowed',
          impact: '학습 반영',
          recommendation: '유지'
        }
      ],
      geoFactors: [
        {
          name: '수치 및 통계 데이터 밀도 (Statistics & Numerical Density)',
          score: 95,
          status: 'excellent',
          description: 'Next.js 15 렌더링 타임 벤치마크(ms) 수치가 명확하여 LLM 인용 정확도 극대화',
          arxivReference: 'arXiv:2311.09735 Section 4.1',
          actionItem: '우수한 상태 유지'
        },
        {
          name: '출처 및 전문가 인용문 (Citations & Quotations)',
          score: 90,
          status: 'excellent',
          description: 'Google Developers 및 OpenAI 공식 기술 문서 직접 인용 주석 포함',
          arxivReference: 'arXiv:2311.09735 Section 4.2',
          actionItem: '우수한 상태 유지'
        }
      ],
      generatedSchemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TechArticle",
            "headline": "Next.js 15와 AI 검색(AEO) 최적화 실전 가이드",
            "author": {
              "@type": "Person",
              "name": "박○○ 시니어 웹 아키텍트",
              "sameAs": ["https://github.com/tech-arch-park", "https://linkedin.com/in/tech-arch-park"]
            },
            "publisher": {
              "@type": "Organization",
              "name": "TechDev Insights",
              "sameAs": "https://www.wikidata.org/wiki/Q54321"
            }
          }
        ]
      }, null, 2),
      optimizedMeta: {
        title: 'Next.js 15와 AI 검색(AEO) 최적화 실전 가이드 | TechDev',
        description: 'Google AI Overviews 및 ChatGPT Search 노출을 위한 Next.js 15 Server Components와 Schema.org 적용 실전 아키텍처 가이드.',
        keywords: ['Next.js 15', 'AI SEO', 'AEO 최적화', 'Google AI Overviews', 'ChatGPT Search'],
        ogTitle: 'Next.js 15와 AI 검색(AEO) 최적화 실전 가이드',
        ogDescription: '실무 예제로 알아보는 차세대 AI 검색엔진 대응 웹 개발 전략.',
        ogImage: 'https://blog.techdev.io/og-nextjs15-ai.jpg',
        canonical: 'https://blog.techdev.io/posts/nextjs-15-ai-seo-strategy',
        headings: [
          { level: 'H1', text: 'Next.js 15와 AI 검색(AEO) 최적화 실전 가이드' },
          { level: 'H2', text: '1. Google AI & OpenAI 검색 가이드라인 요약' }
        ]
      },
      eeatAnalysis: {
        authorName: '박○○ 시니어 웹 아키텍트 (10년차 개발자)',
        sameAsProfiles: ['https://github.com/tech-arch-park'],
        expertiseSignatures: ['Next.js 공식 기여자', '실무 트래픽 처리 벤치마크 공개'],
        trustSignals: ['코드 저장소 GitHub 링크 검증', 'Google Developers 공식 링크 참조'],
        originalityAssessment: '실무 코드 스니펫과 벤치마크 그래프가 포함되어 100% Non-Commodity 조건 만족',
        improvementSuggestions: ['저자 bio 박스 하단에 최신 기고글 목록 추가']
      },
      aeoSimulation: {
        targetQuery: 'Next.js에서 AI 검색 최적화 방법 설명해줘',
        chatGptSearchSnippet: 'ChatGPT Search 답변:\n"Next.js 15 환경에서 AI 검색을 최적화하기 위해서는 [TechDev 기술 블로그 가이드](https://blog.techdev.io/posts/nextjs-15-ai-seo-strategy)에 명시된 대로 Server Components 기반의 빠른 HTML 렌더링 및 Schema.org @graph 동적 주입이 권장됩니다."',
        googleAiOverviewSnippet: 'Google AI Overviews 답변:\n"TechDev에 따르면 Next.js 15에서는 Google의 AI Optimization Guide를 준수하여 E-E-A-T 신뢰성을 확보하고 Schema.org JSON-LD를 적용해야 합니다."',
        perplexitySnippet: 'Perplexity AI 답변:\n"[1] TechDev Insights: Next.js 15 AI SEO 가이드 - Server Components & JSON-LD 주입 패턴."',
        citationProbable: true,
        citedUrl: 'https://blog.techdev.io/posts/nextjs-15-ai-seo-strategy',
        citedAnchorText: 'TechDev Insights: Next.js 15 AI SEO 가이드',
        keyFactExtractor: [
          '핵심 아키텍처: React Server Components (RSC)',
          '구조화 방식: Metadata API & JSON-LD @graph',
          'Google & OpenAI 가이드 동시 준수: llms.txt 배제 및 OAI-SearchBot 허용'
        ]
      }
    }
  }
];

export function generateCustomAudit(inputUrl: string): AuditResult {
  const domain = inputUrl.replace(/^https?:\/\//, '').split('/')[0] || 'website.com';
  return {
    url: inputUrl,
    title: `${domain} - AI & SEO 6대 엔진 통합 진단 결과`,
    initialScore: 65,
    overallScore: 65,
    technicalScore: 70,
    chatGptSearchScore: 75,
    academicGeoScore: 62,
    eeatScore: 60,
    schemaScore: 55,
    bingScore: 68,
    lastScanned: new Date().toISOString(),
    scoreHistory: [
      {
        id: 'h0',
        timestamp: new Date().toLocaleTimeString('ko-KR'),
        label: '최초 스캔 진단 완료',
        scoreDelta: 0,
        newOverallScore: 65,
      },
    ],
    metrics: [
      {
        id: 'cust-1',
        title: 'Title & OpenGraph 태그 최적화 필요',
        category: 'technical',
        status: 'warning',
        score: 70,
        scoreBoost: 8,
        isResolved: false,
        currentValue: `${domain} 홈 메타데이터 검색됨`,
        recommendation: '핵심 브랜딩 키워드 및 행동 유도(CTA) 문구를 포함하도록 확장 권장',
        codeSnippet: `<title>${domain} | AI 검색 및 구글 SEO 최적화 서비스</title>`,
        referenceDoc: 'Google Search Essentials: 제목 링크 가이드'
      },
      {
        id: 'cust-2',
        title: 'OpenAI OAI-SearchBot 크롤러 접근 설정 확인',
        category: 'chatgpt',
        status: 'pass',
        score: 90,
        scoreBoost: 5,
        isResolved: true,
        currentValue: 'robots.txt에서 OAI-SearchBot 정상 허용됨',
        recommendation: 'ChatGPT Search 검색 결과에 자사 URL 링크가 노출될 수 있습니다.',
        referenceDoc: 'OpenAI Official Guide: ChatGPT Search'
      },
      {
        id: 'cust-3',
        title: 'Schema.org @graph 다중 엔티티 스키마 추천',
        category: 'schema',
        status: 'warning',
        score: 55,
        scoreBoost: 12,
        isResolved: false,
        currentValue: 'JSON-LD 구조화 데이터 미완성',
        recommendation: '회사/브랜드의 공식 이름, 로고, sameAs 위키데이터/SNS URL을 지식 그래프로 정의',
        codeSnippet: `{\n  "@context": "https://schema.org",\n  "@graph": [\n    {\n      "@type": "Organization",\n      "name": "${domain}",\n      "url": "${inputUrl}",\n      "sameAs": ["https://www.wikidata.org/wiki/QXXXXX"]\n    }\n  ]\n}`,
        referenceDoc: 'Schema.org Vocabulary: @graph Linked Data'
      }
    ],
    botPolicies: [
      {
        botName: 'OAI-SearchBot',
        purpose: 'ChatGPT Search 실시간 검색 및 출처 인용',
        status: 'allowed',
        impact: 'ChatGPT 답변 내 URL 출처 노출 가능',
        recommendation: '허용 유지'
      },
      {
        botName: 'GPTBot',
        purpose: 'OpenAI 모델 학습 데이터 크롤링',
        status: 'allowed',
        impact: '모델 학습 수집',
        recommendation: '허용 유지'
      },
      {
        botName: 'Googlebot',
        purpose: 'Google 색인 및 AI Overviews',
        status: 'allowed',
        impact: '구글 검색 노출',
        recommendation: '허용 유지'
      }
    ],
    geoFactors: [
      {
        name: '수치 및 통계 데이터 밀도 (Statistics Density)',
        score: 65,
        status: 'moderate',
        description: '페이지 내 명확한 정량적 수치 표 추가 시 LLM 채택률 향상 가능',
        arxivReference: 'arXiv:2311.09735 Section 4.1',
        actionItem: '핵심 서비스 데이터 퍼센트(%) 및 수치 정리 표 삽입'
      },
      {
        name: '출처 및 인용문 (Citations & Quotations)',
        score: 60,
        status: 'moderate',
        description: '공식 기술 문서 및 검증 데이터 출처 주석 배치 필요',
        arxivReference: 'arXiv:2311.09735 Section 4.2',
        actionItem: '참고 문서 링크 및 인용문 명시'
      }
    ],
    generatedSchemaJson: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "name": domain,
          "url": inputUrl,
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${inputUrl}?q={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "Organization",
          "name": domain,
          "url": inputUrl,
          "sameAs": [`https://www.wikidata.org/wiki/${domain}`]
        }
      ]
    }, null, 2),
    optimizedMeta: {
      title: `${domain} | AI 검색엔진(AEO) 및 구글/ChatGPT SEO 통합 최적화`,
      description: `${domain}의 공식 웹사이트입니다. Google, OpenAI, Bing 및 학술 GEO 가이드에 맞춘 최적화된 서비스와 전문 정보를 제공합니다.`,
      keywords: [domain, 'AI SEO', 'AEO 최적화', 'ChatGPT Search', 'GEO 최적화'],
      ogTitle: `${domain} - 차세대 AI 검색 최적화 완료`,
      ogDescription: `Google AI Overviews 및 ChatGPT Search에 맞춰 구조화된 ${domain} 공식 웹사이트.`,
      ogImage: `https://${domain}/og-image.jpg`,
      canonical: inputUrl,
      headings: [
        { level: 'H1', text: `${domain} 공식 최적화 페이지` },
        { level: 'H2', text: '주요 서비스 및 E-E-A-T 검증' }
      ]
    },
    eeatAnalysis: {
      authorName: `${domain} 운영팀`,
      sameAsProfiles: [`https://linkedin.com/company/${domain}`],
      expertiseSignatures: ['업계 전문성 인증', '공식 도메인 소유권 실증'],
      trustSignals: ['보안 연결 (HTTPS) 적용 완료', '공식 문의처 명시'],
      originalityAssessment: '독자적인 서비스 설명 및 오리지널 콘텐츠 포함',
      improvementSuggestions: ['대표자/작성자 이력 표기 강화', '고객 후기 및 케이스 스터디 배치']
    },
    aeoSimulation: {
      targetQuery: `${domain} 서비스 특징과 추천 이유`,
      chatGptSearchSnippet: `ChatGPT Search (OpenAI) 답변:\n"${domain}은(는) 구글 및 OpenAI 공식 최적화 가이드를 준수하여 구조화된 정보를 제공합니다. [${domain} 공식몰](${inputUrl})에 따르면..."`,
      googleAiOverviewSnippet: `Google AI 검색 답변:\n"${domain}은(는) Google Search Essentials 및 E-E-A-T 기준을 준수합니다."`,
      perplexitySnippet: `Perplexity AI 답변:\n"[1] ${domain} 공식 웹사이트: 구조화 데이터 및 정량적 데이터 제공."`,
      citationProbable: true,
      citedUrl: inputUrl,
      citedAnchorText: `${domain} 공식 웹사이트`,
      keyFactExtractor: [
        `도메인 소유자: ${domain}`,
        '검색엔진 가이드: Google & OpenAI Official 준수',
        'AI 검색 대응: Schema.org @graph 주입 완료'
      ]
    }
  };
}
