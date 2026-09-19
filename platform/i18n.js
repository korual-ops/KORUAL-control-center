(()=>{
  const STORAGE_KEY='korual-language-v1';
  const supported=['ko','en','ja','zh','vi'];
  const codeLabel={ko:'KO',en:'EN',ja:'JA',zh:'中文',vi:'VI'};

  const T={
    ko:{
      languageTitle:'언어 선택',languageNote:'선택한 언어는 이 기기에 저장됩니다.',
      homeHero:'필요한 서비스를\n더 빠르게.',homeDesc:'AI가 요청을 이해하고 필요한 서비스 묶음과 비교 기준을 정리합니다.',ask:'무엇이 필요하세요?',
      quick:'바로 시작',all:'전체 보기',moving:'이사',cleaning:'청소',internet:'인터넷',travel:'여행',compareQuote:'견적 비교',fastMatch:'빠른 매칭',installCompare:'설치 비교',journey:'여정 연결',
      smartFlow:'한 번에 연결',request:'요청',match:'매칭',compare:'비교',booking:'예약',flowDesc:'입력은 한 번만. 조건 분석부터 견적 비교와 예약까지 같은 흐름에서 이어집니다.',
      forYou:'다음 추천',noRequest:'아직 요청이 없어요',tryService:'필요한 서비스를 입력해보세요.',recentHelp:'최근 요청을 기반으로 다음 행동을 여기에 추천합니다.',
      matchTitle:'조건을 말하면\nAI가 정리합니다.',matchDesc:'복잡한 폼 대신 자연어로 입력하세요.',matchPlaceholder:'예: 다음 달에 34평 아파트로 이사해. 입주청소랑 인터넷 설치도 같이 비교해줘.',natural:'자연어 요청 가능',analyze:'분석하기',
      promptMove:'이사 + 청소',promptAir:'에어컨',promptTravel:'여행',
      controlTitle:'추천 기준을 직접 정하세요.',balanced:'균형',price:'가격',trust:'신뢰',speed:'속도',verifiedOnly:'검증 업체만',excludeUnverified:'미검증 파트너 제외',budgetCap:'예산 상한',optional:'선택 사항',noLimit:'제한 없음',won:'원',controlNote:'KORUAL AI는 후보를 정리하지만 최종 선택과 예약은 사용자가 직접 승인합니다.',
      waiting:'요청을 기다리는 중',detectService:'서비스 감지',structure:'조건 구조화',criteria:'비교 기준',service:'서비스',priority:'우선순위',next:'다음 단계',priceTrust:'가격 + 신뢰',threeQuotes:'3개 견적 비교',goQuotes:'견적 비교로 이동',
      quotesTitle:'가격만 말고\n신뢰까지 비교.',quotesDesc:'요청을 분석하면 맞춤 견적 비교가 시작됩니다.',aiRecommend:'AI 추천',lowPrice:'낮은 가격',trustLevel:'신뢰도',verified:'검증',estimated:'예상 견적',reviews:'후기',response:'응답',cancel:'취소',selectQuote:'이 견적 선택',selectRecommended:'추천 견적 선택',selectPrompt:'견적을 선택하세요',
      bookingTitle:'예약과 진행상태를\n한눈에.',bookingDesc:'요청부터 완료, 후기, 다음 추천까지 이어집니다.',noBooking:'아직 예약이 없습니다.',noBookingDesc:'견적을 선택하고 예약 요청을 저장하면 여기에 표시됩니다.',findService:'서비스 찾기',received:'접수됨',bookingRequest:'예약 요청',requestSaved:'요청이 저장되었습니다.',providerCheck:'업체 확인',providerStage:'파트너 확인 단계',serviceComplete:'서비스 완료',reviewAfter:'완료 후 후기를 남길 수 있습니다.',viewQuotes:'견적 다시 보기',completeDemo:'완료 시뮬레이션',repeatTitle:'다음 필요를 미리 준비',repeatDesc:'거래가 쌓이면 주기와 연관성을 바탕으로 다음 서비스를 추천합니다.',
      servicesTitle:'KORUAL\n서비스 맵.',servicesDesc:'하나의 계정과 데이터 흐름 위에 카테고리를 확장합니다.',lifeService:'생활 서비스',lifeDesc:'이사 · 청소 · 설치 · 인터넷',travelDesc:'항공 · 숙박 · 공항 이동',commerceDesc:'상품 · 주문 · 공급처 · 배송',aiDesc:'조건 분석 · 추천 · 자동화',
      myDesc:'요청, 예약, 설정을 한 곳에서 관리합니다.',requests:'요청',bookings:'예약',completed:'완료',aiScope:'AI가 할 수 있는 범위',serviceAnalysis:'서비스 분석',serviceAnalysisDesc:'요청 조건을 구조화',candidateRecommend:'후보 추천',candidateRecommendDesc:'가격·신뢰·속도 비교',autoPay:'자동 결제',autoPayDesc:'현재 허용하지 않음',changeCriteria:'추천 기준 변경',theme:'화면 테마',themeDesc:'라이트 / 다크 모드',platformStatus:'플랫폼 상태',platformStatusDesc:'Railway · GitHub · Health',reset:'베타 데이터 초기화',resetDesc:'로컬 요청·예약 상태 삭제',
      trustTitle:'파트너 신뢰 정보',trustReason:'추천 근거를 확인할 수 있습니다.',identityVerify:'본인/업체 검증',userRating:'이용자 평점',reviewCount:'리뷰 수',avgResponse:'평균 응답',completedJobs:'완료 건수',expectedPrice:'예상 가격',recommendRule:'추천 원칙',recommendRuleDesc:'Trust Score는 검증 상태·평점·리뷰·응답성과 운영 데이터를 바탕으로 비교용으로 표시합니다. 베타 파트너 데이터이며, 결제나 예약을 자동 승인하지 않습니다.',confirm:'확인',
      bookingInfo:'예약 정보 입력',selectedService:'선택 서비스',selectedQuote:'선택 견적',name:'이름',namePlaceholder:'예약자 이름',phone:'연락처',region:'서비스 지역',regionPlaceholder:'예: 인천 영종도',desiredDate:'희망일',bookingNote:'베타 예약 정보는 KORUAL Supabase에 저장됩니다. 결제는 아직 발생하지 않습니다.',saveBooking:'예약 요청 저장',
      home:'홈',aiMatch:'AI매칭',quote:'견적',profile:'내정보',
      metaConnect:'서비스가 하나의 공간에서 연결됩니다.',tapNode:'노드를 눌러 바로 이동'
    },
    en:{
      languageTitle:'Choose language',languageNote:'Your language choice is saved on this device.',
      homeHero:'Find the service you need\nfaster.',homeDesc:'AI understands your request and organizes service bundles and comparison criteria.',ask:'What do you need?',
      quick:'Quick start',all:'View all',moving:'Moving',cleaning:'Cleaning',internet:'Internet',travel:'Travel',compareQuote:'Compare quotes',fastMatch:'Quick match',installCompare:'Compare setup',journey:'Plan journey',
      smartFlow:'One connected flow',request:'Request',match:'Match',compare:'Compare',booking:'Booking',flowDesc:'Enter it once. Analysis, quote comparison, and booking stay in one flow.',
      forYou:'For you',noRequest:'No request yet',tryService:'Tell us what service you need.',recentHelp:'Your next action will be suggested here based on recent requests.',
      matchTitle:'Tell us your needs.\nAI organizes them.',matchDesc:'Use natural language instead of a complicated form.',matchPlaceholder:'Example: I am moving next month. Compare moving, move-in cleaning, and internet setup together.',natural:'Natural language supported',analyze:'Analyze',
      promptMove:'Move + cleaning',promptAir:'Air conditioner',promptTravel:'Travel',
      controlTitle:'Choose how recommendations are ranked.',balanced:'Balanced',price:'Price',trust:'Trust',speed:'Speed',verifiedOnly:'Verified only',excludeUnverified:'Exclude unverified partners',budgetCap:'Budget cap',optional:'Optional',noLimit:'No limit',won:'KRW',controlNote:'KORUAL AI organizes candidates, but you approve the final choice and booking.',
      waiting:'Waiting for your request',detectService:'Detect services',structure:'Structure needs',criteria:'Compare criteria',service:'Service',priority:'Priority',next:'Next step',priceTrust:'Price + trust',threeQuotes:'Compare 3 quotes',goQuotes:'Go to quote comparison',
      quotesTitle:'Compare more than price.\nCompare trust.',quotesDesc:'Analyze a request to start personalized quote comparison.',aiRecommend:'AI recommended',lowPrice:'Lowest price',trustLevel:'Trust score',verified:'Verified',estimated:'Estimated quote',reviews:'Reviews',response:'Response',cancel:'Cancellation',selectQuote:'Select this quote',selectRecommended:'Select recommended quote',selectPrompt:'Choose a quote',
      bookingTitle:'Track bookings\nand progress.',bookingDesc:'From request to completion, review, and next recommendation.',noBooking:'No bookings yet.',noBookingDesc:'Choose a quote and save a booking request to see it here.',findService:'Find a service',received:'Received',bookingRequest:'Booking request',requestSaved:'Your request has been saved.',providerCheck:'Provider review',providerStage:'Waiting for partner confirmation',serviceComplete:'Service complete',reviewAfter:'Leave a review after completion.',viewQuotes:'View quotes again',completeDemo:'Simulate completion',repeatTitle:'Prepare for what comes next',repeatDesc:'As transactions accumulate, KORUAL recommends related services at the right time.',
      servicesTitle:'KORUAL\nService Map.',servicesDesc:'Expand categories on one account and shared data flow.',lifeService:'Daily services',lifeDesc:'Moving · Cleaning · Setup · Internet',travelDesc:'Flights · Hotels · Airport transfer',commerceDesc:'Products · Orders · Suppliers · Delivery',aiDesc:'Analysis · Recommendations · Automation',
      myDesc:'Manage requests, bookings, and settings in one place.',requests:'Requests',bookings:'Bookings',completed:'Completed',aiScope:'What AI is allowed to do',serviceAnalysis:'Service analysis',serviceAnalysisDesc:'Structure request conditions',candidateRecommend:'Candidate recommendations',candidateRecommendDesc:'Compare price, trust, and speed',autoPay:'Automatic payment',autoPayDesc:'Not allowed currently',changeCriteria:'Change recommendation criteria',theme:'Display theme',themeDesc:'Light / Dark mode',platformStatus:'Platform status',platformStatusDesc:'Railway · GitHub · Health',reset:'Reset beta data',resetDesc:'Clear local request and booking state',
      trustTitle:'Partner Trust Passport',trustReason:'Review why this partner was recommended.',identityVerify:'Identity / business verification',userRating:'User rating',reviewCount:'Reviews',avgResponse:'Average response',completedJobs:'Completed jobs',expectedPrice:'Estimated price',recommendRule:'Recommendation rules',recommendRuleDesc:'Trust Score is shown for comparison using verification, ratings, reviews, response time, and operating data. This is beta partner data and does not auto-approve payment or booking.',confirm:'Done',
      bookingInfo:'Booking details',selectedService:'Selected service',selectedQuote:'Selected quote',name:'Name',namePlaceholder:'Booking name',phone:'Phone',region:'Service area',regionPlaceholder:'e.g. Incheon, Yeongjong',desiredDate:'Preferred date',bookingNote:'Beta booking information is stored in KORUAL Supabase. No payment is charged yet.',saveBooking:'Save booking request',
      home:'Home',aiMatch:'AI Match',quote:'Quotes',profile:'Profile',
      metaConnect:'Services connect in one shared space.',tapNode:'Tap a node to enter'
    },
    ja:{
      languageTitle:'言語を選択',languageNote:'選択した言語はこの端末に保存されます。',
      homeHero:'必要なサービスを\nもっと速く。',homeDesc:'AIが依頼内容を理解し、必要なサービスと比較基準を整理します。',ask:'何が必要ですか？',
      quick:'クイックスタート',all:'すべて見る',moving:'引越し',cleaning:'清掃',internet:'インターネット',travel:'旅行',compareQuote:'見積比較',fastMatch:'高速マッチング',installCompare:'設置比較',journey:'旅程連携',
      smartFlow:'一つの流れで完結',request:'依頼',match:'マッチング',compare:'比較',booking:'予約',flowDesc:'入力は一度だけ。条件分析から見積比較、予約まで同じ流れで進みます。',
      forYou:'おすすめ',noRequest:'まだ依頼がありません',tryService:'必要なサービスを入力してください。',recentHelp:'最近の依頼をもとに次の行動を提案します。',
      matchTitle:'条件を伝えると\nAIが整理します。',matchDesc:'複雑なフォームではなく自然な言葉で入力できます。',matchPlaceholder:'例：来月引越します。入居清掃とインターネット設置も一緒に比較してください。',natural:'自然言語で入力可能',analyze:'分析する',
      promptMove:'引越し + 清掃',promptAir:'エアコン',promptTravel:'旅行',
      controlTitle:'おすすめ基準を自分で設定できます。',balanced:'バランス',price:'価格',trust:'信頼',speed:'速度',verifiedOnly:'認証業者のみ',excludeUnverified:'未認証パートナーを除外',budgetCap:'予算上限',optional:'任意',noLimit:'上限なし',won:'ウォン',controlNote:'KORUAL AIは候補を整理しますが、最終選択と予約はユーザーが承認します。',
      waiting:'依頼を待っています',detectService:'サービス検出',structure:'条件整理',criteria:'比較基準',service:'サービス',priority:'優先順位',next:'次のステップ',priceTrust:'価格 + 信頼',threeQuotes:'3件の見積を比較',goQuotes:'見積比較へ',
      quotesTitle:'価格だけでなく\n信頼も比較。',quotesDesc:'依頼を分析すると、条件に合った見積比較が始まります。',aiRecommend:'AIおすすめ',lowPrice:'低価格',trustLevel:'信頼度',verified:'認証済み',estimated:'見積目安',reviews:'レビュー',response:'応答',cancel:'キャンセル',selectQuote:'この見積を選択',selectRecommended:'おすすめを選択',selectPrompt:'見積を選択してください',
      bookingTitle:'予約と進行状況を\nひと目で。',bookingDesc:'依頼から完了、レビュー、次のおすすめまでつながります。',noBooking:'予約はまだありません。',noBookingDesc:'見積を選び予約依頼を保存するとここに表示されます。',findService:'サービスを探す',received:'受付済み',bookingRequest:'予約依頼',requestSaved:'依頼が保存されました。',providerCheck:'業者確認',providerStage:'パートナー確認中',serviceComplete:'サービス完了',reviewAfter:'完了後にレビューできます。',viewQuotes:'見積を再確認',completeDemo:'完了をシミュレート',repeatTitle:'次の必要に備える',repeatDesc:'取引履歴をもとに関連サービスを適切な時期に提案します。',
      servicesTitle:'KORUAL\nサービスマップ。',servicesDesc:'一つのアカウントとデータフロー上でカテゴリを拡張します。',lifeService:'生活サービス',lifeDesc:'引越し · 清掃 · 設置 · インターネット',travelDesc:'航空 · 宿泊 · 空港移動',commerceDesc:'商品 · 注文 · 仕入先 · 配送',aiDesc:'条件分析 · おすすめ · 自動化',
      myDesc:'依頼、予約、設定を一か所で管理します。',requests:'依頼',bookings:'予約',completed:'完了',aiScope:'AIに許可する範囲',serviceAnalysis:'サービス分析',serviceAnalysisDesc:'依頼条件を整理',candidateRecommend:'候補の提案',candidateRecommendDesc:'価格・信頼・速度を比較',autoPay:'自動決済',autoPayDesc:'現在は許可していません',changeCriteria:'おすすめ基準を変更',theme:'表示テーマ',themeDesc:'ライト / ダーク',platformStatus:'プラットフォーム状態',platformStatusDesc:'Railway · GitHub · Health',reset:'ベータデータ初期化',resetDesc:'端末内の依頼・予約状態を削除',
      trustTitle:'パートナー信頼情報',trustReason:'おすすめ理由を確認できます。',identityVerify:'本人/事業者認証',userRating:'利用者評価',reviewCount:'レビュー数',avgResponse:'平均応答',completedJobs:'完了件数',expectedPrice:'見積価格',recommendRule:'おすすめ基準',recommendRuleDesc:'Trust Scoreは認証状態、評価、レビュー、応答性、運用データをもとに比較用として表示します。ベータ用データで、決済や予約を自動承認しません。',confirm:'確認',
      bookingInfo:'予約情報入力',selectedService:'選択サービス',selectedQuote:'選択見積',name:'名前',namePlaceholder:'予約者名',phone:'連絡先',region:'サービス地域',regionPlaceholder:'例：仁川 永宗島',desiredDate:'希望日',bookingNote:'ベータ予約情報はKORUAL Supabaseに保存されます。まだ決済は発生しません。',saveBooking:'予約依頼を保存',
      home:'ホーム',aiMatch:'AIマッチ',quote:'見積',profile:'マイページ',
      metaConnect:'サービスが一つの空間でつながります。',tapNode:'ノードをタップして移動'
    },
    zh:{
      languageTitle:'选择语言',languageNote:'所选语言将保存在此设备上。',
      homeHero:'更快找到\n你需要的服务。',homeDesc:'AI理解你的需求，并整理服务组合和比较标准。',ask:'你需要什么服务？',
      quick:'快速开始',all:'查看全部',moving:'搬家',cleaning:'清洁',internet:'宽带',travel:'旅行',compareQuote:'比较报价',fastMatch:'快速匹配',installCompare:'安装比较',journey:'行程连接',
      smartFlow:'一次连接全部流程',request:'需求',match:'匹配',compare:'比较',booking:'预约',flowDesc:'只需输入一次，从条件分析、报价比较到预约都在同一流程完成。',
      forYou:'为你推荐',noRequest:'暂无需求',tryService:'输入你需要的服务。',recentHelp:'我们会根据最近的需求在这里推荐下一步。',
      matchTitle:'说出你的条件，\nAI来整理。',matchDesc:'无需复杂表单，直接用自然语言输入。',matchPlaceholder:'例如：我下个月搬家，请一起比较搬家、入住清洁和宽带安装。',natural:'支持自然语言',analyze:'开始分析',
      promptMove:'搬家 + 清洁',promptAir:'空调',promptTravel:'旅行',
      controlTitle:'自行设置推荐优先级。',balanced:'均衡',price:'价格',trust:'信任',speed:'速度',verifiedOnly:'仅认证商家',excludeUnverified:'排除未认证伙伴',budgetCap:'预算上限',optional:'可选',noLimit:'不限',won:'韩元',controlNote:'KORUAL AI负责整理候选，但最终选择和预约由你确认。',
      waiting:'等待你的需求',detectService:'识别服务',structure:'整理条件',criteria:'比较标准',service:'服务',priority:'优先级',next:'下一步',priceTrust:'价格 + 信任',threeQuotes:'比较3个报价',goQuotes:'前往报价比较',
      quotesTitle:'不只比较价格，\n也比较信任。',quotesDesc:'分析需求后即可开始个性化报价比较。',aiRecommend:'AI推荐',lowPrice:'低价优先',trustLevel:'信任度',verified:'已认证',estimated:'预计报价',reviews:'评价',response:'响应',cancel:'取消',selectQuote:'选择此报价',selectRecommended:'选择推荐报价',selectPrompt:'请选择报价',
      bookingTitle:'预约和进度\n一目了然。',bookingDesc:'从需求到完成、评价和下一次推荐全部连接。',noBooking:'暂无预约。',noBookingDesc:'选择报价并保存预约后会显示在这里。',findService:'查找服务',received:'已受理',bookingRequest:'预约请求',requestSaved:'请求已保存。',providerCheck:'商家确认',providerStage:'等待伙伴确认',serviceComplete:'服务完成',reviewAfter:'完成后可以评价。',viewQuotes:'重新查看报价',completeDemo:'模拟完成',repeatTitle:'提前准备下一次需求',repeatDesc:'随着交易积累，系统会在合适时间推荐相关服务。',
      servicesTitle:'KORUAL\n服务地图。',servicesDesc:'在一个账户和数据流上扩展不同服务类别。',lifeService:'生活服务',lifeDesc:'搬家 · 清洁 · 安装 · 宽带',travelDesc:'机票 · 酒店 · 机场交通',commerceDesc:'商品 · 订单 · 供应商 · 配送',aiDesc:'条件分析 · 推荐 · 自动化',
      myDesc:'在一个地方管理需求、预约和设置。',requests:'需求',bookings:'预约',completed:'已完成',aiScope:'AI可执行的范围',serviceAnalysis:'服务分析',serviceAnalysisDesc:'整理需求条件',candidateRecommend:'候选推荐',candidateRecommendDesc:'比较价格、信任和速度',autoPay:'自动支付',autoPayDesc:'目前未开放',changeCriteria:'修改推荐标准',theme:'显示主题',themeDesc:'浅色 / 深色',platformStatus:'平台状态',platformStatusDesc:'Railway · GitHub · Health',reset:'重置Beta数据',resetDesc:'清除本机需求和预约状态',
      trustTitle:'伙伴信任信息',trustReason:'查看此伙伴被推荐的原因。',identityVerify:'身份/商家认证',userRating:'用户评分',reviewCount:'评价数量',avgResponse:'平均响应',completedJobs:'完成订单',expectedPrice:'预计价格',recommendRule:'推荐原则',recommendRuleDesc:'Trust Score基于认证状态、评分、评价、响应速度和运营数据用于比较。当前为Beta伙伴数据，不会自动批准支付或预约。',confirm:'确认',
      bookingInfo:'填写预约信息',selectedService:'已选服务',selectedQuote:'已选报价',name:'姓名',namePlaceholder:'预约人姓名',phone:'联系电话',region:'服务地区',regionPlaceholder:'例如：仁川 永宗岛',desiredDate:'期望日期',bookingNote:'Beta预约信息将保存至KORUAL Supabase，目前不会产生付款。',saveBooking:'保存预约请求',
      home:'首页',aiMatch:'AI匹配',quote:'报价',profile:'我的',
      metaConnect:'所有服务在同一空间连接。',tapNode:'点击节点进入'
    },
    vi:{
      languageTitle:'Chọn ngôn ngữ',languageNote:'Ngôn ngữ đã chọn sẽ được lưu trên thiết bị này.',
      homeHero:'Tìm dịch vụ bạn cần\nnhanh hơn.',homeDesc:'AI hiểu yêu cầu và sắp xếp gói dịch vụ cùng tiêu chí so sánh.',ask:'Bạn cần dịch vụ gì?',
      quick:'Bắt đầu nhanh',all:'Xem tất cả',moving:'Chuyển nhà',cleaning:'Vệ sinh',internet:'Internet',travel:'Du lịch',compareQuote:'So sánh báo giá',fastMatch:'Ghép nhanh',installCompare:'So sánh lắp đặt',journey:'Kết nối hành trình',
      smartFlow:'Một quy trình liền mạch',request:'Yêu cầu',match:'Ghép',compare:'So sánh',booking:'Đặt lịch',flowDesc:'Chỉ nhập một lần. Phân tích, so sánh báo giá và đặt lịch diễn ra trong cùng một luồng.',
      forYou:'Dành cho bạn',noRequest:'Chưa có yêu cầu',tryService:'Hãy nhập dịch vụ bạn cần.',recentHelp:'Bước tiếp theo sẽ được đề xuất dựa trên các yêu cầu gần đây.',
      matchTitle:'Nói điều bạn cần,\nAI sẽ sắp xếp.',matchDesc:'Nhập bằng ngôn ngữ tự nhiên thay vì biểu mẫu phức tạp.',matchPlaceholder:'Ví dụ: Tháng sau tôi chuyển nhà. Hãy so sánh chuyển nhà, vệ sinh và lắp Internet cùng lúc.',natural:'Hỗ trợ ngôn ngữ tự nhiên',analyze:'Phân tích',
      promptMove:'Chuyển nhà + vệ sinh',promptAir:'Điều hòa',promptTravel:'Du lịch',
      controlTitle:'Tự chọn tiêu chí ưu tiên.',balanced:'Cân bằng',price:'Giá',trust:'Uy tín',speed:'Tốc độ',verifiedOnly:'Chỉ đối tác đã xác minh',excludeUnverified:'Loại đối tác chưa xác minh',budgetCap:'Giới hạn ngân sách',optional:'Tùy chọn',noLimit:'Không giới hạn',won:'KRW',controlNote:'KORUAL AI sắp xếp ứng viên, nhưng bạn là người duyệt lựa chọn và đặt lịch cuối cùng.',
      waiting:'Đang chờ yêu cầu',detectService:'Nhận diện dịch vụ',structure:'Cấu trúc điều kiện',criteria:'Tiêu chí so sánh',service:'Dịch vụ',priority:'Ưu tiên',next:'Bước tiếp theo',priceTrust:'Giá + uy tín',threeQuotes:'So sánh 3 báo giá',goQuotes:'Đi đến so sánh báo giá',
      quotesTitle:'Không chỉ so giá,\nhãy so cả uy tín.',quotesDesc:'Phân tích yêu cầu để bắt đầu so sánh báo giá phù hợp.',aiRecommend:'AI đề xuất',lowPrice:'Giá thấp',trustLevel:'Điểm uy tín',verified:'Đã xác minh',estimated:'Báo giá dự kiến',reviews:'Đánh giá',response:'Phản hồi',cancel:'Hủy',selectQuote:'Chọn báo giá này',selectRecommended:'Chọn báo giá đề xuất',selectPrompt:'Hãy chọn một báo giá',
      bookingTitle:'Theo dõi đặt lịch\nvà tiến độ.',bookingDesc:'Từ yêu cầu đến hoàn tất, đánh giá và đề xuất tiếp theo.',noBooking:'Chưa có lịch đặt.',noBookingDesc:'Chọn báo giá và lưu yêu cầu đặt lịch để xem tại đây.',findService:'Tìm dịch vụ',received:'Đã tiếp nhận',bookingRequest:'Yêu cầu đặt lịch',requestSaved:'Yêu cầu đã được lưu.',providerCheck:'Đối tác xác nhận',providerStage:'Đang chờ đối tác xác nhận',serviceComplete:'Dịch vụ hoàn tất',reviewAfter:'Có thể đánh giá sau khi hoàn tất.',viewQuotes:'Xem lại báo giá',completeDemo:'Mô phỏng hoàn tất',repeatTitle:'Chuẩn bị cho nhu cầu tiếp theo',repeatDesc:'Khi dữ liệu giao dịch tăng, hệ thống sẽ đề xuất dịch vụ liên quan đúng thời điểm.',
      servicesTitle:'KORUAL\nBản đồ dịch vụ.',servicesDesc:'Mở rộng nhiều danh mục trên cùng một tài khoản và luồng dữ liệu.',lifeService:'Dịch vụ đời sống',lifeDesc:'Chuyển nhà · Vệ sinh · Lắp đặt · Internet',travelDesc:'Vé máy bay · Khách sạn · Di chuyển sân bay',commerceDesc:'Sản phẩm · Đơn hàng · Nhà cung cấp · Giao hàng',aiDesc:'Phân tích · Đề xuất · Tự động hóa',
      myDesc:'Quản lý yêu cầu, đặt lịch và cài đặt tại một nơi.',requests:'Yêu cầu',bookings:'Đặt lịch',completed:'Hoàn tất',aiScope:'Phạm vi AI được phép',serviceAnalysis:'Phân tích dịch vụ',serviceAnalysisDesc:'Cấu trúc điều kiện yêu cầu',candidateRecommend:'Đề xuất ứng viên',candidateRecommendDesc:'So sánh giá, uy tín và tốc độ',autoPay:'Thanh toán tự động',autoPayDesc:'Hiện chưa cho phép',changeCriteria:'Đổi tiêu chí đề xuất',theme:'Giao diện',themeDesc:'Sáng / Tối',platformStatus:'Trạng thái nền tảng',platformStatusDesc:'Railway · GitHub · Health',reset:'Đặt lại dữ liệu Beta',resetDesc:'Xóa trạng thái yêu cầu và đặt lịch trên thiết bị',
      trustTitle:'Hồ sơ uy tín đối tác',trustReason:'Xem lý do đối tác này được đề xuất.',identityVerify:'Xác minh danh tính/doanh nghiệp',userRating:'Điểm người dùng',reviewCount:'Số đánh giá',avgResponse:'Phản hồi trung bình',completedJobs:'Đơn đã hoàn tất',expectedPrice:'Giá dự kiến',recommendRule:'Nguyên tắc đề xuất',recommendRuleDesc:'Trust Score dùng trạng thái xác minh, điểm đánh giá, review, tốc độ phản hồi và dữ liệu vận hành để so sánh. Đây là dữ liệu đối tác Beta và không tự động phê duyệt thanh toán hoặc đặt lịch.',confirm:'Xác nhận',
      bookingInfo:'Nhập thông tin đặt lịch',selectedService:'Dịch vụ đã chọn',selectedQuote:'Báo giá đã chọn',name:'Họ tên',namePlaceholder:'Tên người đặt',phone:'Điện thoại',region:'Khu vực dịch vụ',regionPlaceholder:'Ví dụ: Incheon, Yeongjong',desiredDate:'Ngày mong muốn',bookingNote:'Thông tin đặt lịch Beta được lưu trong KORUAL Supabase. Chưa phát sinh thanh toán.',saveBooking:'Lưu yêu cầu đặt lịch',
      home:'Trang chủ',aiMatch:'AI Match',quote:'Báo giá',profile:'Cá nhân',
      metaConnect:'Các dịch vụ kết nối trong cùng một không gian.',tapNode:'Chạm vào nút để mở'
    }
  };

  const B=[
    ['.home-hero h1','homeHero','html'],
    ['.home-hero>p','homeDesc'],['.hero-cta .cta-copy strong','ask'],
    ['.section-title h2','quick',null,0],['.section-title>button','all',null,0],
    ['.quick-card[data-service="이사"] strong','moving'],['.quick-card[data-service="이사"] em','compareQuote'],
    ['.quick-card[data-service="입주청소"] strong','cleaning'],['.quick-card[data-service="입주청소"] em','fastMatch'],
    ['.quick-card[data-service="인터넷 설치"] strong','internet'],['.quick-card[data-service="인터넷 설치"] em','installCompare'],
    ['.quick-card[data-service="여행"] strong','travel'],['.quick-card[data-service="여행"] em','journey'],
    ['.section-title h2','smartFlow',null,1],
    ['.flow-labels span','request',null,0],['.flow-labels span','match',null,1],['.flow-labels span','compare',null,2],['.flow-labels span','booking',null,3],['.flow-card p','flowDesc'],
    ['.section-title h2','forYou',null,2],
    ['.screen[data-screen="match"] .screen-heading h2','matchTitle','html'],['.screen[data-screen="match"] .screen-heading p','matchDesc'],['#matchInput','matchPlaceholder','placeholder'],['#composerHint','natural'],['#matchForm button[type="submit"]','analyze','prefixArrow'],
    ['.prompt-row button','promptMove',null,0],['.prompt-row button','promptAir',null,1],['.prompt-row button','promptTravel',null,2],
    ['.agent-control-head strong','controlTitle'],['[data-priority="balanced"]','balanced'],['[data-priority="price"]','price'],['[data-priority="trust"]','trust'],['[data-priority="speed"]','speed'],
    ['.switch-line strong','verifiedOnly'],['.switch-line small','excludeUnverified'],['.budget-line strong','budgetCap'],['.budget-line small','optional'],['#budgetCap','noLimit','placeholder'],['.budget-line em','won'],['.control-note','controlNote','bullet'],
    ['#analysisTitle','waiting'],['#detectedBundle span','detectService',null,0],['#detectedBundle span','structure',null,1],['#detectedBundle span','criteria',null,2],
    ['.analysis-grid>div small','service',null,0],['.analysis-grid>div small','priority',null,1],['.analysis-grid>div small','next',null,2],['#analysisPriority','priceTrust'],['#analysisNext','threeQuotes'],['#goQuotes','goQuotes','prefixArrow'],
    ['.screen[data-screen="quotes"] .screen-heading h2','quotesTitle','html'],['.screen[data-screen="quotes"] .screen-heading p','quotesDesc'],['[data-sort="recommended"]','aiRecommend'],['[data-sort="price"]','lowPrice'],['[data-sort="trust"]','trustLevel'],
    ['.trust-trigger','verified',null,0],['.trust-trigger','verified',null,1],['.trust-trigger','verified',null,2],
    ['.quote-card .price-row small','estimated',null,0],['.quote-card .price-row small','estimated',null,1],['.quote-card .price-row small','estimated',null,2],
    ['.quote-card .fact-grid span:nth-child(1) small','reviews',null,0],['.quote-card .fact-grid span:nth-child(1) small','reviews',null,1],['.quote-card .fact-grid span:nth-child(1) small','reviews',null,2],
    ['.quote-card .fact-grid span:nth-child(2) small','response',null,0],['.quote-card .fact-grid span:nth-child(2) small','response',null,1],['.quote-card .fact-grid span:nth-child(2) small','response',null,2],
    ['.select-quote','selectQuote','prefixArrow',0],['.select-quote','selectQuote','prefixArrow',1],['.select-quote','selectQuote','prefixArrow',2],['#stickyQuoteName','selectPrompt'],
    ['.screen[data-screen="bookings"] .screen-heading h2','bookingTitle','html'],['.screen[data-screen="bookings"] .screen-heading p','bookingDesc'],['#emptyBooking>strong','noBooking'],['#emptyBooking>p','noBookingDesc'],['#emptyBooking>button','findService'],
    ['.booking-card-head>span','received'],['.timeline-item strong','bookingRequest',null,0],['.timeline-item small','requestSaved',null,0],['.timeline-item strong','providerCheck',null,1],['.timeline-item small','providerStage',null,1],['.timeline-item strong','serviceComplete',null,2],['.timeline-item small','reviewAfter',null,2],['.booking-actions button','viewQuotes',null,0],['#completeDemo','completeDemo'],['#repeatCard strong','repeatTitle'],['#repeatMessage','repeatDesc'],
    ['.screen[data-screen="services"] .screen-heading h2','servicesTitle','html'],['.screen[data-screen="services"] .screen-heading p','servicesDesc'],
    ['.service-row[data-service="생활 서비스"] strong','lifeService'],['.service-row[data-service="생활 서비스"] em','lifeDesc'],['.service-row[data-service="여행"] em','travelDesc'],['.service-row[data-service="커머스 운영"] em','commerceDesc'],['.service-row[data-service="AI 추천"] em','aiDesc'],
    ['.profile-hero p','myDesc'],['.profile-stats small','requests',null,0],['.profile-stats small','bookings',null,1],['.profile-stats small','completed',null,2],
    ['.agent-profile-head strong','aiScope'],['.permission-list strong','serviceAnalysis',null,0],['.permission-list small','serviceAnalysisDesc',null,0],['.permission-list strong','candidateRecommend',null,1],['.permission-list small','candidateRecommendDesc',null,1],['.permission-list strong','autoPay',null,2],['.permission-list small','autoPayDesc',null,2],['#openAgentControl','changeCriteria','prefixArrow'],
    ['#profileTheme strong','theme'],['#profileTheme small','themeDesc'],['#showPlatformStatus strong','platformStatus'],['#showPlatformStatus small','platformStatusDesc'],['#resetDemo strong','reset'],['#resetDemo small','resetDesc'],
    ['#languageTitle','languageTitle'],['.language-note','languageNote'],
    ['#trustTitle','trustTitle'],['#trustReason','trustReason'],['.trust-evidence article small','identityVerify',null,0],['.trust-evidence article small','userRating',null,1],['.trust-evidence article small','reviewCount',null,2],['.trust-evidence article small','avgResponse',null,3],['.trust-evidence article small','completedJobs',null,4],['.trust-evidence article small','expectedPrice',null,5],['.trust-disclosure strong','recommendRule'],['.trust-disclosure p','recommendRuleDesc'],['#trustCloseAction','confirm','prefixCheck'],
    ['#bookingTitle','bookingInfo'],['.sheet-summary span','selectedService',null,0],['.sheet-summary span','selectedQuote',null,1],['.field-grid label>span','name',null,0],['#customerName','namePlaceholder','placeholder'],['.field-grid label>span','phone',null,1],['.field-grid label>span','region',null,2],['#customerRegion','regionPlaceholder','placeholder'],['.field-grid label>span','desiredDate',null,3],['.sheet-note','bookingNote'],['#submitBooking','saveBooking'],
    ['.tab[data-tab="home"] small','home'],['.tab[data-tab="match"] small','aiMatch'],['.tab[data-tab="quotes"] small','quote'],['.tab[data-tab="bookings"] small','booking'],['.tab[data-tab="profile"] small','profile'],
    ['.meta-hud>strong','metaConnect'],['.meta-hud>small','tapNode']
  ];

  const DYNAMIC={
    ko:{
      '조건 분석 완료':'조건 분석 완료','검증 파트너 · 베타':'검증 파트너 · 베타','추천':'추천','가성비':'가성비','프리미엄':'프리미엄','매우 빠름':'매우 빠름','빠름':'빠름','유연':'유연','보증 강화':'보증 강화',
      '서버에서 검증된 베타 견적을 불러오는 중…':'서버에서 검증된 베타 견적을 불러오는 중…','저장 중…':'저장 중…','완료됨':'완료됨','처리 중…':'처리 중…'
    },
    en:{
      '조건 분석 완료':'Analysis complete','검증 파트너 · 베타':'Verified partner · Beta','추천':'Recommended','가성비':'Best value','프리미엄':'Premium','매우 빠름':'Very fast','빠름':'Fast','유연':'Flexible','보증 강화':'Extended guarantee',
      '서버에서 검증된 베타 견적을 불러오는 중…':'Loading server-verified beta quotes…','저장 중…':'Saving…','완료됨':'Completed','처리 중…':'Processing…'
    },
    ja:{
      '조건 분석 완료':'条件分析完了','검증 파트너 · 베타':'認証パートナー · Beta','추천':'おすすめ','가성비':'コスパ','프리미엄':'プレミアム','매우 빠름':'非常に速い','빠름':'速い','유연':'柔軟','보증 강화':'保証強化',
      '서버에서 검증된 베타 견적을 불러오는 중…':'サーバー検証済みのベータ見積を読み込み中…','저장 중…':'保存中…','완료됨':'完了','처리 중…':'処理中…'
    },
    zh:{
      '조건 분석 완료':'条件分析完成','검증 파트너 · 베타':'认证伙伴 · Beta','추천':'推荐','가성비':'高性价比','프리미엄':'高级','매우 빠름':'非常快','빠름':'快速','유연':'灵活','보증 강화':'加强保障',
      '서버에서 검증된 베타 견적을 불러오는 중…':'正在加载服务器验证的Beta报价…','저장 중…':'保存中…','완료됨':'已完成','처리 중…':'处理中…'
    },
    vi:{
      '조건 분석 완료':'Phân tích hoàn tất','검증 파트너 · 베타':'Đối tác đã xác minh · Beta','추천':'Đề xuất','가성비':'Giá tốt','프리미엄':'Cao cấp','매우 빠름':'Rất nhanh','빠름':'Nhanh','유연':'Linh hoạt','보증 강화':'Bảo đảm mở rộng',
      '서버에서 검증된 베타 견적을 불러오는 중…':'Đang tải báo giá Beta đã được máy chủ xác minh…','저장 중…':'Đang lưu…','완료됨':'Hoàn tất','처리 중…':'Đang xử lý…'
    }
  };

  const exact={
    '아직 요청이 없어요':'noRequest','필요한 서비스를 입력해보세요.':'tryService','최근 요청을 기반으로 다음 행동을 여기에 추천합니다.':'recentHelp',
    '견적을 선택하세요':'selectPrompt','요청을 기다리는 중':'waiting','가격 + 신뢰':'priceTrust','3개 견적 비교':'threeQuotes',
    '서비스 찾기':'findService','접수됨':'received','완료 시뮬레이션':'completeDemo','확인':'confirm',
    '예약 요청 저장':'saveBooking','취소':'cancel','검증':'verified','홈':'home','AI매칭':'aiMatch','견적':'quote','예약':'booking','내정보':'profile'
  };

  let lang='ko';
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    if(supported.includes(saved)) lang=saved;
    else {
      const browser=(navigator.language||'ko').toLowerCase();
      if(browser.startsWith('en'))lang='en'; else if(browser.startsWith('ja'))lang='ja'; else if(browser.startsWith('zh'))lang='zh'; else if(browser.startsWith('vi'))lang='vi';
    }
  }catch(_){}

  function setText(el,value,mode){
    if(!el||value==null)return;
    if(mode==='html'){
      const parts=String(value).split('\n');
      el.innerHTML=parts.map((x,i)=>i===parts.length-1&&el.querySelector?.('em')?x:'').join('');
      if(el.matches('.home-hero h1')){
        const [a,b]=parts;el.innerHTML=escape(a)+'<br><em>'+escape(b||'')+'</em>';
      }else el.innerHTML=parts.map(escape).join('<br>');
    }else if(mode==='placeholder')el.setAttribute('placeholder',value);
    else if(mode==='prefixArrow')el.innerHTML=escape(value)+' <b>→</b>';
    else if(mode==='prefixCheck')el.innerHTML=escape(value)+' <span>✓</span>';
    else if(mode==='bullet')el.innerHTML='<span>●</span> '+escape(value);
    else el.textContent=value;
  }
  function escape(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

  function applyBindings(){
    const dict=T[lang]||T.ko;
    for(const [selector,key,mode,index] of B){
      const nodes=[...document.querySelectorAll(selector)];
      const el=index==null?nodes[0]:nodes[index];
      if(el)setText(el,dict[key],mode);
    }
    document.documentElement.lang=lang==='zh'?'zh-CN':lang;
    const code=document.getElementById('languageCode');if(code)code.textContent=codeLabel[lang];
    document.querySelectorAll('[data-language]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.language===lang));
    applyExact(document.body);
    translateHeader();
  }

  function translateHeader(){
    const active=document.querySelector('.screen.is-active')?.dataset.screen||location.hash.slice(1)||'home';
    const map={
      home:['KORUAL','AI Service OS'],
      match:['AI Match',{ko:'조건을 자연어로 입력',en:'Describe your needs naturally',ja:'自然な言葉で条件入力',zh:'用自然语言描述需求',vi:'Mô tả nhu cầu tự nhiên'}],
      quotes:['Smart Quotes',{ko:'가격 · 신뢰 · 조건 비교',en:'Price · trust · terms',ja:'価格・信頼・条件を比較',zh:'价格 · 信任 · 条件比较',vi:'Giá · uy tín · điều kiện'}],
      bookings:['Bookings',{ko:'예약과 진행 상태',en:'Bookings and progress',ja:'予約と進行状況',zh:'预约与进度',vi:'Đặt lịch và tiến độ'}],
      services:['Services',{ko:'KORUAL 서비스 맵',en:'KORUAL service map',ja:'KORUALサービスマップ',zh:'KORUAL服务地图',vi:'Bản đồ dịch vụ KORUAL'}],
      profile:['My KORUAL',{ko:'설정과 플랫폼 상태',en:'Settings and platform status',ja:'設定とプラットフォーム状態',zh:'设置与平台状态',vi:'Cài đặt và trạng thái nền tảng'}]
    };
    const val=map[active]||map.home;
    const title=document.getElementById('headerTitle'),sub=document.getElementById('headerSubtitle');
    if(title)title.textContent=val[0];
    if(sub)sub.textContent=typeof val[1]==='string'?val[1]:(val[1][lang]||val[1].ko);
  }

  function applyExact(root){
    const dict=T[lang]||T.ko;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT);
    let el=root.nodeType===1?root:null;
    while(el){
      if(el.children.length===0){
        const source=el.dataset?.i18nSource||el.textContent.trim();
        const dynamic=(DYNAMIC[lang]||{})[source];
        if(exact[source]||dynamic){
          if(el.dataset)el.dataset.i18nSource=source;
          el.textContent=dynamic||dict[exact[source]]||source;
        }
      }
      el=walker.nextNode();
    }
  }

  const sheet=document.getElementById('languageSheet');
  const toggle=document.getElementById('languageToggle');
  const close=document.getElementById('closeLanguageSheet');
  function openSheet(){if(sheet){sheet.hidden=false;document.body.style.overflow='hidden'}}
  function closeSheet(){if(sheet){sheet.hidden=true;document.body.style.overflow=''}}
  toggle?.addEventListener('click',openSheet);
  close?.addEventListener('click',closeSheet);
  sheet?.addEventListener('click',e=>{if(e.target===sheet)closeSheet()});
  document.querySelectorAll('[data-language]').forEach(btn=>btn.addEventListener('click',()=>{
    lang=btn.dataset.language;
    try{localStorage.setItem(STORAGE_KEY,lang)}catch(_){}
    applyBindings();closeSheet();
  }));

  const observer=new MutationObserver(records=>{
    let needsHeader=false;
    for(const record of records){
      if(record.target?.id==='headerTitle'||record.target?.id==='headerSubtitle')needsHeader=true;
      for(const node of record.addedNodes||[]){
        if(node.nodeType===1)applyExact(node);
      }
      if(record.type==='characterData'||record.type==='childList'){
        const parent=record.target.nodeType===3?record.target.parentElement:record.target;
        if(parent&&parent.children.length===0){
          const src=parent.textContent.trim();
          const dynamic=(DYNAMIC[lang]||{})[src];
          if(exact[src]||dynamic){
            parent.dataset.i18nSource=src;
            parent.textContent=dynamic||(T[lang]||T.ko)[exact[src]]||src;
          }
        }
      }
    }
    if(needsHeader)translateHeader();
  });

  applyBindings();
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('hashchange',()=>setTimeout(()=>{applyBindings();translateHeader()},0));
  window.KORUAL_I18N={getLanguage:()=>lang,setLanguage:(next)=>{if(supported.includes(next)){lang=next;try{localStorage.setItem(STORAGE_KEY,lang)}catch(_){}applyBindings()}}};
})();