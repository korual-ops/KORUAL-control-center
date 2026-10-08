// KORUAL canonical customer-facing taxonomy — additive, no production DB changes.
// Status describes the *UI flow only*. 'beta' means request input/preview, not live inventory, bookability or verified providers.
// 'planned' services must never expose fabricated quotes or one-click booking.
export const taxonomyVersion = "2026-10-09-v1";
const raw = [
  [
    "home",
    [
      "홈·리빙",
      "Home & Living",
      "住まい・暮らし",
      "家居生活",
      "Nhà cửa & đời sống"
    ],
    "🏠",
    [
      [
        "clean",
        "청소·위생",
        "Cleaning & Hygiene",
        [
          "move-in-clean|입주청소|Move-in cleaning|beta",
          "regular-clean|정기청소|Regular cleaning|beta",
          "aircon-clean|에어컨 세척|Air conditioner cleaning|beta",
          "kitchen-clean|주방·욕실 청소|Kitchen & bathroom cleaning|planned",
          "pest-control|방역·해충관리|Pest control|planned"
        ]
      ],
      [
        "repair",
        "수리·설비",
        "Repairs & Utilities",
        [
          "home-repair|집수리|Home repairs|planned",
          "plumbing|배관·누수|Plumbing & leaks|planned",
          "electrical|전기·조명|Electrical & lighting|planned",
          "door-lock|도어락·열쇠|Smart locks & locksmith|planned",
          "aircon-install|냉난방기 설치|HVAC installation|planned"
        ]
      ],
      [
        "interior",
        "인테리어·시공",
        "Interior & Renovation",
        [
          "interior-design|인테리어|Interior design|beta",
          "wallpaper|도배·장판|Wallpaper & flooring|planned",
          "bath-remodel|욕실 리모델링|Bathroom remodeling|planned",
          "lighting-design|간접조명 시공|Ambient lighting|planned",
          "furniture-install|가구 조립·설치|Furniture assembly|planned"
        ]
      ],
      [
        "homecare",
        "가전·홈케어",
        "Appliances & Home Care",
        [
          "appliance-repair|가전 수리|Appliance repair|planned",
          "water-purifier|정수기 관리|Water purifier service|planned",
          "home-iot|스마트홈 설치|Smart home installation|planned",
          "laundry-care|세탁·침구 케어|Laundry & bedding care|planned"
        ]
      ]
    ]
  ],
  [
    "move",
    [
      "이사·입주",
      "Moving & Move-in",
      "引越し・入居",
      "搬家入住",
      "Chuyển nhà & vào ở"
    ],
    "📦",
    [
      [
        "moving",
        "이사 서비스",
        "Moving Services",
        [
          "home-moving|가정이사|Residential moving|beta",
          "studio-moving|원룸이사|Studio move|beta",
          "office-moving|사무실이사|Office relocation|beta",
          "storage-moving|보관이사|Storage moving|planned"
        ]
      ],
      [
        "movein",
        "입주 패키지",
        "Move-in Packages",
        [
          "movein-bundle|이사+청소 묶음|Move & clean bundle|beta",
          "apartment-inspection|입주 사전점검|Pre-move inspection|planned",
          "movein-disinfection|입주 방역|Move-in sanitization|planned",
          "moving-waste|폐기물·대형가구 처리|Bulky waste removal|planned"
        ]
      ],
      [
        "utilities",
        "통신·생활 설치",
        "Utilities & Installation",
        [
          "internet-setup|인터넷 가입·설치|Internet installation|beta",
          "tv-setup|TV·가전 설치|TV & appliance setup|planned",
          "gas-moving|도시가스 이전|Gas service transfer|planned",
          "address-moving|전입 행정 안내|Address change guidance|planned"
        ]
      ],
      [
        "space",
        "보관·공간",
        "Storage & Space",
        [
          "self-storage|셀프스토리지|Self storage|planned",
          "furniture-storage|가구 보관|Furniture storage|planned",
          "home-organization|정리수납|Home organizing|planned"
        ]
      ]
    ]
  ],
  [
    "mobility",
    [
      "차량·모빌리티",
      "Mobility",
      "自動車・移動",
      "汽车与出行",
      "Xe cộ & di chuyển"
    ],
    "🚘",
    [
      [
        "carcare",
        "차량 관리",
        "Car Care",
        [
          "car-wash|손세차·출장세차|Car wash & mobile wash|planned",
          "car-detail|디테일링·광택|Detailing & polishing|planned",
          "car-tint|썬팅·PPF|Tint & paint protection|planned",
          "car-inspection|차량 점검|Vehicle inspection|planned"
        ]
      ],
      [
        "carservice",
        "자동차 서비스",
        "Vehicle Services",
        [
          "repair-car|정비·타이어|Repairs & tires|planned",
          "car-rental|렌터카|Car rentals|planned",
          "chauffeur|기사·수행 운전|Chauffeur services|planned",
          "ev-charging|전기차 충전 정보|EV charging|planned"
        ]
      ],
      [
        "localmove",
        "이동·주차",
        "Local Mobility",
        [
          "parking|주차장 검색|Parking search|planned",
          "airport-ride|공항 픽업·샌딩|Airport pickup & drop-off|planned",
          "shuttle|셔틀·단체 이동|Shuttle & group transport|planned",
          "driver-service|대리운전|Designated driver|planned"
        ]
      ]
    ]
  ],
  [
    "wellness",
    [
      "뷰티·웰니스",
      "Beauty & Wellness",
      "美容・ウェルネス",
      "美容健康",
      "Làm đẹp & sức khỏe"
    ],
    "🌿",
    [
      [
        "beauty",
        "뷰티·헤어",
        "Beauty & Hair",
        [
          "hair-salon|헤어샵|Hair salons|planned",
          "nail-care|네일·속눈썹|Nails & lashes|planned",
          "skin-care|에스테틱·피부관리|Skin care|planned",
          "barber|바버샵|Barbers|planned"
        ]
      ],
      [
        "fitness",
        "운동·레슨",
        "Fitness & Lessons",
        [
          "personal-training|PT·헬스|Personal training|planned",
          "pilates|필라테스·요가|Pilates & yoga|planned",
          "swimming|수영 강습|Swimming lessons|planned",
          "golf-lesson|골프 레슨|Golf lessons|planned"
        ]
      ],
      [
        "rest",
        "휴식·라이프케어",
        "Relaxation & Lifestyle",
        [
          "spa|스파·사우나|Spa & sauna|planned",
          "massage|마사지·바디케어|Massage & body care|planned",
          "wellness-retreat|웰니스 프로그램|Wellness retreats|planned",
          "pet-care|반려동물 케어|Pet care|planned"
        ]
      ]
    ]
  ],
  [
    "travel",
    [
      "여행·레저",
      "Travel & Leisure",
      "旅行・レジャー",
      "旅游休闲",
      "Du lịch & giải trí"
    ],
    "✈️",
    [
      [
        "transport",
        "항공·공항",
        "Flights & Airports",
        [
          "flight-search|항공권 검색|Flight search|planned",
          "airport-transfer|공항 이동|Airport transfer|planned",
          "airport-service|공항 의전·편의|Airport assistance|planned",
          "private-charter|전세기 예약 문의|Private jet charter inquiries|planned"
        ]
      ],
      [
        "stay",
        "숙박·숙소",
        "Accommodation",
        [
          "hotels|호텔·리조트|Hotels & resorts|planned",
          "villa-stay|풀빌라·독채|Private villas|planned",
          "long-stay|장기 숙박|Extended stays|planned",
          "workation|워케이션|Workations|planned"
        ]
      ],
      [
        "experience",
        "여행 액티비티",
        "Activities & Experiences",
        [
          "tours|투어·현지 체험|Tours & experiences|planned",
          "theme-park|테마파크·티켓|Theme park tickets|planned",
          "water-sports|수상 레저|Water sports|planned",
          "cruise|크루즈·요트|Cruises & yachts|planned"
        ]
      ],
      [
        "travel-planning",
        "여행 설계",
        "Trip Planning",
        [
          "ai-itinerary|AI 여행일정|AI itineraries|beta",
          "visa-info|비자·입국정보|Visa & entry information|planned",
          "travel-package|여행 패키지|Travel packages|planned"
        ]
      ],
      [
        "premium-travel",
        "프리미엄 이동",
        "Premium Travel",
        [
          "helicopter-charter|헬기 전세|Helicopter charter|planned",
          "corporate-charter|기업 전세기|Corporate charters|planned",
          "luxury-travel|럭셔리 맞춤여행|Luxury custom travel|planned"
        ]
      ]
    ]
  ],
  [
    "commerce",
    [
      "쇼핑·커머스",
      "Shopping & Commerce",
      "ショッピング",
      "购物商城",
      "Mua sắm & thương mại"
    ],
    "🛍️",
    [
      [
        "home-goods",
        "홈·생활상품",
        "Home Essentials",
        [
          "premium-towels|호텔 수건·패브릭|Premium towels & textiles|planned",
          "bath-essentials|욕실용품|Bathroom essentials|planned",
          "household|생활잡화|Household goods|planned",
          "home-fragrance|디퓨저·홈향기|Home fragrance|planned"
        ]
      ],
      [
        "kitchen",
        "주방·리빙",
        "Kitchen & Living",
        [
          "tumblers|텀블러·보틀|Tumblers & bottles|planned",
          "kitchenware|주방용품|Kitchenware|planned",
          "organizers|수납·정리용품|Storage organizers|planned"
        ]
      ],
      [
        "gadgets",
        "가전·디지털",
        "Appliances & Tech",
        [
          "small-appliances|소형가전|Small appliances|planned",
          "smart-devices|스마트홈 기기|Smart home devices|planned",
          "digital-accessories|디지털 액세서리|Tech accessories|planned"
        ]
      ],
      [
        "gift",
        "선물·정기구독",
        "Gifts & Subscriptions",
        [
          "gift-pack|선물세트|Gift sets|planned",
          "subscription-box|정기배송|Subscription boxes|planned",
          "pb-products|KORUAL PB|KORUAL private label|planned"
        ]
      ]
    ]
  ],
  [
    "now",
    [
      "KORUAL NOW",
      "KORUAL NOW",
      "KORUAL NOW",
      "KORUAL NOW",
      "KORUAL NOW"
    ],
    "📍",
    [
      [
        "now-cafes",
        "카페·식음료",
        "Cafes & Dining",
        [
          "cafe-seats|카페 좌석·혼잡도|Cafe seats & crowd levels|planned",
          "cafe-parking|카페 주차|Cafe parking|planned",
          "menu-stock|품절·메뉴 재고|Menu availability|planned",
          "restaurant-queue|음식점 대기|Restaurant queue|planned"
        ]
      ],
      [
        "now-parking",
        "주차·충전",
        "Parking & Charging",
        [
          "parking-live|주차 가능 면수|Parking occupancy|planned",
          "parking-price|주차요금 비교|Parking prices|planned",
          "ev-live|충전기 이용 현황|EV charger availability|planned"
        ]
      ],
      [
        "now-slots",
        "오늘 가능한 서비스",
        "Available Today",
        [
          "same-day-salon|당일 미용 예약|Same-day salon bookings|planned",
          "same-day-clean|당일 청소 요청|Same-day cleaning|planned",
          "same-day-carwash|당일 세차 예약|Same-day car wash|planned"
        ]
      ],
      [
        "now-activities",
        "주변 즐길거리",
        "Nearby Activities",
        [
          "events-now|이벤트·공연|Events & shows|planned",
          "sports-facility|체육시설 이용|Sports facility availability|planned",
          "leisure-slots|레저 예약 가능 시간|Leisure booking slots|planned"
        ]
      ]
    ]
  ],
  [
    "business",
    [
      "비즈니스·B2B",
      "Business & B2B",
      "ビジネス",
      "企业服务",
      "Doanh nghiệp & B2B"
    ],
    "💼",
    [
      [
        "merchant-os",
        "이커머스 운영",
        "E-commerce Operations",
        [
          "orders-oms|통합 주문관리|Order management|planned",
          "shipping-os|송장·배송 자동화|Shipping automation|planned",
          "stock-os|SKU·재고관리|Inventory management|planned",
          "returns-os|반품·교환 관리|Returns management|planned"
        ]
      ],
      [
        "partner-os",
        "파트너 운영",
        "Partner Operations",
        [
          "provider-dashboard|업체 예약 대시보드|Provider booking dashboard|planned",
          "quote-management|견적·고객관리|Quotes & CRM|planned",
          "settlement|정산·수익 분석|Settlement & analytics|planned",
          "partner-api|제휴 API|Partner API|planned"
        ]
      ],
      [
        "business-services",
        "사업지원 서비스",
        "Business Services",
        [
          "design-work|디자인·브랜딩|Design & branding|planned",
          "marketing|광고·마케팅|Advertising & marketing|planned",
          "translations|번역·다국어|Translation & localization|planned",
          "office-clean|사무실 청소|Office cleaning|planned"
        ]
      ],
      [
        "sourcing",
        "조달·물류",
        "Procurement & Logistics",
        [
          "china-sourcing|1688 구매·소싱|1688 product sourcing|planned",
          "trade-logistics|국제 배송·통관 지원|Freight & customs assistance|planned",
          "fulfillment-3pl|물류·3PL 제휴|Fulfillment partners|planned",
          "wholesale|도매·공급사 매칭|Wholesale supplier matching|planned"
        ]
      ]
    ]
  ]
];
export const roots = Object.freeze(raw.map(([id,labels,icon,groups],rootOrder)=>Object.freeze({
  id, icon, order:rootOrder, label:{ko:labels[0],en:labels[1],ja:labels[2],zh:labels[3],vi:labels[4]},
  groups:Object.freeze(groups.map(([groupId,ko,en,rows],groupOrder)=>Object.freeze({
    id:groupId,order:groupOrder,label:{ko,en},
    services:Object.freeze(rows.map((line,serviceOrder)=>{
      const [serviceId,ko,en,status]=line.split('|');
      return Object.freeze({id:serviceId,order:serviceOrder,label:{ko,en},status,rootId:id,groupId});
    }))
  })))
})));
export const allServices = Object.freeze(roots.flatMap(root=>root.groups.flatMap(group=>group.services)));
export function labelFor(item,language='ko'){
  return item.label?.[language] || item.label?.en || item.label?.ko || '';
}
export function findService(id){return allServices.find(service=>service.id===id)||null;}
export function normalizeText(value){return String(value||'').normalize('NFKC').toLocaleLowerCase().trim().replace(/\s+/g,' ');}
export function searchServices(query,rootId='all'){
  const words=normalizeText(query).split(' ').filter(Boolean);
  return allServices.filter(service=>{
    if(rootId!=='all'&&service.rootId!==rootId)return false;
    const root=roots.find(r=>r.id===service.rootId);
    const group=root?.groups.find(g=>g.id===service.groupId);
    const haystack=normalizeText([service.id,...Object.values(service.label),...Object.values(root?.label||{}),...Object.values(group?.label||{})].join(' '));
    return words.every(word=>haystack.includes(word));
  });
}
export function validateTaxonomy(){
 const ids=new Set();const errors=[];
 for(const root of roots){
  if(ids.has(root.id))errors.push('duplicate root: '+root.id);ids.add(root.id);
  for(const group of root.groups){
   if(ids.has(group.id))errors.push('duplicate group: '+group.id);ids.add(group.id);
   for(const service of group.services){
    if(ids.has(service.id))errors.push('duplicate service: '+service.id);ids.add(service.id);
    if(!['beta','planned'].includes(service.status))errors.push('invalid status: '+service.id);
    if(!service.label.ko||!service.label.en)errors.push('missing locale: '+service.id);
   }
  }
 }
 return {ok:errors.length===0,errors,rootCount:roots.length,groupCount:roots.reduce((sum,r)=>sum+r.groups.length,0),serviceCount:allServices.length};
}
