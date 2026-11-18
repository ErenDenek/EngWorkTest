// defaultWords.js - Zengin Çoklu Anlamlı Başlangıç Kelime & Kalıp Havuzu + Oxford 3000 / NGSL Üreteci
const DEFAULT_WORDS = [
    // --- KELİMELER (WORDS) ---
    {
        id: "w_run",
        term: "run",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "A1",
        meanings: [
            { tr: "koşmak, hızla gitmek", context: "Fiziksel hareket", example: "I run five kilometers every morning.", exampleTr: "Her sabah beş kilometre koşarım." },
            { tr: "işletmek, yönetmek", context: "İş / Yönetim", example: "She runs a successful software company in London.", exampleTr: "Londra'da başarılı bir yazılım şirketi işletiyor." },
            { tr: "çalıştırmak (program, makine vb.) / akmak", context: "Teknik / Doğal", example: "We need to run the tests before deploying the code.", exampleTr: "Kodu dağıtmadan önce testleri çalıştırmamız gerekiyor." }
        ]
    },
    {
        id: "w_address",
        term: "address",
        category: "word",
        partOfSpeech: "noun / verb",
        cefr: "B1",
        meanings: [
            { tr: "adres, konum bilgisi", context: "Günlük Hayat", example: "Please write your current email address on the form.", exampleTr: "Lütfen forma güncel e-posta adresinizi yazın." },
            { tr: "ele almak, çözüm aramak, değinmek", context: "İş / Problem Çözme", example: "We must address the security vulnerabilities immediately.", exampleTr: "Güvenlik açıklarını derhal ele almalıyız." },
            { tr: "hitap etmek, konuşma yapmak", context: "Resmi / İletişim", example: "The CEO addressed the entire team during the annual meeting.", exampleTr: "CEO yıllık toplantıda tüm ekibe hitap etti." }
        ]
    },
    {
        id: "w_issue",
        term: "issue",
        category: "word",
        partOfSpeech: "noun / verb",
        cefr: "B1",
        meanings: [
            { tr: "sorun, mesele, konu", context: "Genel / Teknik", example: "There is a critical performance issue in the database.", exampleTr: "Veritabanında kritik bir performans sorunu var." },
            { tr: "yayımlamak, çıkarmak, vermek (belge/bilet)", context: "Resmi / İş", example: "The government issued new travel guidelines yesterday.", exampleTr: "Hükümet dün yeni seyahat yönergeleri yayımladı." },
            { tr: "sayı, baskı (dergi/gazete)", context: "Medya", example: "Did you read the latest issue of the science magazine?", exampleTr: "Bilim dergisinin son sayısını okudun mu?" }
        ]
    },
    {
        id: "w_deliver",
        term: "deliver",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B1",
        meanings: [
            { tr: "teslim etmek, dağıtmak", context: "Lojistik / Günlük", example: "The courier will deliver your package by tomorrow noon.", exampleTr: "Kurye paketinizi yarın öğlene kadar teslim edecek." },
            { tr: "vaadini yerine getirmek, sonuç üretmek", context: "İş / Proje", example: "Our engineering team always delivers on time despite tight deadlines.", exampleTr: "Mühendislik ekibimiz sıkı teslim tarihlerine rağmen her zaman zamanında sonuç üretir." },
            { tr: "yapmak (konuşma, sunum)", context: "İletişim", example: "She delivered an inspiring keynote speech at the conference.", exampleTr: "Konferansta ilham verici bir açılış konuşması yaptı." }
        ]
    },
    {
        id: "w_feature",
        term: "feature",
        category: "word",
        partOfSpeech: "noun / verb",
        cefr: "A2",
        meanings: [
            { tr: "özellik, nitelik, fonksiyon", context: "Ürün / Yazılım", example: "Dark mode is the most requested feature in our web app.", exampleTr: "Karanlık mod, web uygulamamızda en çok talep edilen özelliktir." },
            { tr: "ön plana çıkarmak, yer vermek, başrolde oynatmak", context: "Medya / Sunum", example: "The new update features an interactive SVG progress map.", exampleTr: "Yeni güncelleme etkileşimli bir SVG ilerleme haritasına yer veriyor." },
            { tr: "yüz hattı, çehre", context: "Fiziksel Tanım", example: "Her eyes are her most striking facial feature.", exampleTr: "Gözleri onun en dikkat çekici yüz hattıdır." }
        ]
    },
    {
        id: "w_scale",
        term: "scale",
        category: "word",
        partOfSpeech: "noun / verb",
        cefr: "B2",
        meanings: [
            { tr: "ölçek, boyut, kapsam", context: "Analiz / İş", example: "We underestimated the scale of the migration project.", exampleTr: "Göç projesinin ölçeğini hafife aldık." },
            { tr: "ölçeklendirmek, kapasiteyi büyütmek", context: "Teknik / Girişim", example: "Our cloud architecture can scale automatically during traffic spikes.", exampleTr: "Bulut mimarimiz trafik artışlarında otomatik olarak ölçeklenebilir." },
            { tr: "tartı, terazi / balık pulu", context: "Günlük Hayat", example: "He stepped on the bathroom scale to check his weight.", exampleTr: "Kilosunu kontrol etmek için banyo tartısına çıktı." }
        ]
    },
    {
        id: "w_charge",
        term: "charge",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B1",
        meanings: [
            { tr: "ücret talep etmek, fiyat kesmek", context: "Finans / Ticaret", example: "They don't charge extra for international shipping.", exampleTr: "Uluslararası kargo için ekstra ücret talep etmiyorlar." },
            { tr: "şarj etmek, doldurmak", context: "Teknoloji", example: "I forgot to charge my laptop before the flight.", exampleTr: "Uçuştan önce dizüstü bilgisayarımı şarj etmeyi unuttum." },
            { tr: "sorumluluk, yönetim / suçlama", context: "İş / Hukuk", example: "Who is in charge of the frontend architecture here?", exampleTr: "Burada önyüz mimarisinden kim sorumlu?" }
        ]
    },
    {
        id: "w_pitch",
        term: "pitch",
        category: "word",
        partOfSpeech: "noun / verb",
        cefr: "B2",
        meanings: [
            { tr: "iş fikri sunumu yapmak, ikna etmeye çalışmak", context: "İş / Girişim", example: "We pitched our AI startup idea to three venture capitalists.", exampleTr: "Yapay zeka girişim fikrimizi üç risk sermayedarına sunduk." },
            { tr: "spor sahası (futbol, kriket vb.)", context: "Spor", example: "The fans ran onto the pitch after the final whistle.", exampleTr: "Taraftarlar son düdükten sonra sahaya koştu." },
            { tr: "ses perdesi, ton yüksekliği", context: "Müzik / Akustik", example: "She has perfect pitch and can tune any instrument by ear.", exampleTr: "Kusursuz ses perdesi kulağı var ve her enstrümanı kulaktan akort edebilir." }
        ]
    },
    {
        id: "w_handle",
        term: "handle",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B1",
        meanings: [
            { tr: "başa çıkmak, idare etmek, işlemek", context: "İş / Teknik", example: "This function handles all API error responses gracefully.", exampleTr: "Bu fonksiyon tüm API hata yanıtlarını sorunsuzca işler." },
            { tr: "kulp, tutacak, kol", context: "Nesne", example: "The door handle broke when I tried to open it quickly.", exampleTr: "Hızlıca açmaya çalıştığımda kapı kolu kırıldı." },
            { tr: "kullanıcı adı, rumuz (sosyal medya)", context: "Dijital", example: "What is your social media handle on GitHub?", exampleTr: "GitHub'daki kullanıcı adın nedir?" }
        ]
    },
    {
        id: "w_maintain",
        term: "maintain",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B2",
        meanings: [
            { tr: "sürdürmek, korumak, devam ettirmek", context: "Genel", example: "It is important to maintain a healthy work-life balance.", exampleTr: "Sağlıklı bir iş-yaşam dengesini korumak önemlidir." },
            { tr: "bakımını yapmak, güncel tutmak (kod/makine)", context: "Teknik / Mühendislik", example: "A small team maintains the open-source library.", exampleTr: "Küçük bir ekip açık kaynak kütüphanenin bakımını yapıyor." },
            { tr: "iddia etmek, savunmaya devam etmek", context: "Tartışma / Hukuk", example: "He maintained throughout the interview that the design was original.", exampleTr: "Mülakat boyunca tasarımın özgün olduğunu savundu." }
        ]
    },
    {
        id: "w_shift",
        term: "shift",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B1",
        meanings: [
            { tr: "değişmek, kaydırmak, yön değiştirmek", context: "Strateji / Genel", example: "Our company shifted its focus toward artificial intelligence.", exampleTr: "Şirketimiz odağını yapay zekaya doğru kaydırdı." },
            { tr: "vardiya, çalışma nöbeti", context: "İş Hayatı", example: "She works the night shift at the hospital twice a week.", exampleTr: "Haftada iki kez hastanede gece vardiyasında çalışıyor." }
        ]
    },
    {
        id: "w_yield",
        term: "yield",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B2",
        meanings: [
            { tr: "ürün/sonuç/kazanç sağlamak, getirmek", context: "Finans / Bilim", example: "The new marketing experiment yielded surprising results.", exampleTr: "Yeni pazarlama deneyi şaşırtıcı sonuçlar verdi." },
            { tr: "yol vermek, boyun eğmek, teslim olmak", context: "Trafik / Tartışma", example: "Drivers must yield to pedestrians at the crosswalk.", exampleTr: "Sürücüler yaya geçidinde yayalara yol vermelidir." },
            { tr: "değer döndürüp duraklatmak (jeneratör fonksiyon)", context: "Yazılım", example: "In JavaScript generators, yield pauses function execution.", exampleTr: "JavaScript üreteçlerinde yield, fonksiyon yürütmesini duraklatır." }
        ]
    },
    {
        id: "w_leverage",
        term: "leverage",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B2",
        meanings: [
            { tr: "avantaj olarak kullanmak, en üst düzeyde yararlanmak", context: "İş / Teknoloji", example: "We can leverage Gemini API to provide instant grammar feedback.", exampleTr: "Anında gramer geri bildirimi sağlamak için Gemini API'den yararlanabiliriz." },
            { tr: "kaldıraç gücü, koz, etki gücü", context: "Müzakere / Finans", example: "Having multiple job offers gives you strong leverage in salary negotiations.", exampleTr: "Birden fazla iş teklifine sahip olmak maaş pazarlığında size güçlü bir koz verir." }
        ]
    },
    {
        id: "w_commit",
        term: "commit",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B1",
        meanings: [
            { tr: "kendini adamak, söz vermek, bağlanmak", context: "Kişisel / İş", example: "If you commit to practicing twenty minutes a day, you will become fluent.", exampleTr: "Günde yirmi dakika pratik yapmaya kendinizi adarsanız akıcı hale gelirsiniz." },
            { tr: "değişiklikleri kaydetmek (Git / Veritabanı)", context: "Yazılım", example: "Don't forget to commit your changes before switching branches.", exampleTr: "Dal değiştirmeden önce değişikliklerinizi kaydetmeyi (commit etmeyi) unutmayın." },
            { tr: "işlemek (suç, hata vb.)", context: "Hukuk / Genel", example: "The system detected a user attempting to commit fraud.", exampleTr: "Sistem dolandırıcılık yapmaya çalışan bir kullanıcı tespit etti." }
        ]
    },
    {
        id: "w_resolve",
        term: "resolve",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B2",
        meanings: [
            { tr: "çözmek, sonuca bağlamak", context: "Problem Çözme / Yazılım", example: "We finally resolved the merge conflict in the main branch.", exampleTr: "Ana daldaki birleştirme çakışmasını nihayet çözdük." },
            { tr: "kararlılık, azim", context: "Kişisel", example: "Difficulties only strengthened her resolve to succeed.", exampleTr: "Zorluklar onun başarma kararlılığını yalnızca güçlendirdi." }
        ]
    },
    {
        id: "w_accurate",
        term: "accurate",
        category: "word",
        partOfSpeech: "adjective",
        cefr: "B1",
        meanings: [
            { tr: "doğru, kesin, hatasız", context: "Bilim / Veri", example: "The weather forecast was surprisingly accurate this week.", exampleTr: "Hava durumu tahmini bu hafta şaşırtıcı derecede doğruydu." },
            { tr: "isabetli, hedefi tam bulan", context: "Performans", example: "His translation was both grammatically accurate and natural.", exampleTr: "Çevirisi hem gramer açısından hatasız hem de doğaldı." }
        ]
    },
    {
        id: "w_Crucial",
        term: "crucial",
        category: "word",
        partOfSpeech: "adjective",
        cefr: "B2",
        meanings: [
            { tr: "çok önemli, kritik, hayati", context: "İş / Genel", example: "Consistent daily practice is crucial for long-term memory retention.", exampleTr: "Düzenli günlük pratik, uzun süreli hafıza kalıcılığı için hayati önem taşır." }
        ]
    },
    {
        id: "w_obstacle",
        term: "obstacle",
        category: "word",
        partOfSpeech: "noun",
        cefr: "B2",
        meanings: [
            { tr: "engel, mani, güçlük", context: "Genel / Kariyer", example: "Fear of making mistakes is the biggest obstacle to speaking a foreign language.", exampleTr: "Hata yapma korkusu yabancı dil konuşmanın önündeki en büyük engeldir." }
        ]
    },
    {
        id: "w_seamless",
        term: "seamless",
        category: "word",
        partOfSpeech: "adjective",
        cefr: "B2",
        meanings: [
            { tr: "pürüzsüz, kesintisiz, kusursuz geçişli", context: "Tasarım / Yazılım", example: "Users expect a seamless experience between desktop and mobile devices.", exampleTr: "Kullanıcılar masaüstü ve mobil cihazlar arasında kesintisiz bir deneyim bekler." }
        ]
    },
    {
        id: "w_trigger",
        term: "trigger",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B2",
        meanings: [
            { tr: "tetiklemek, başlatmak, neden olmak", context: "Teknik / Psikoloji", example: "Completing Stage 4 will trigger the boss battle celebration animation.", exampleTr: "4. Aşamayı tamamlamak bölüm sonu kutlama animasyonunu tetikleyecektir." },
            { tr: "tetik, başlatıcı olay", context: "Sistem / Genel", example: "Stress is a common trigger for sleeplessness.", exampleTr: "Stres, uykusuzluk için yaygın bir tetikleyicidir." }
        ]
    },
    {
        id: "w_Insight",
        term: "insight",
        category: "word",
        partOfSpeech: "noun",
        cefr: "B2",
        meanings: [
            { tr: "içgörü, derin anlayış, kavrayış", context: "Analiz / İş", example: "The analytics dashboard provides valuable insights into your weak points.", exampleTr: "Analitik paneli zayıf noktalarınıza dair değerli içgörüler sunar." }
        ]
    },
    {
        id: "w_retain",
        term: "retain",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B2",
        meanings: [
            { tr: "akılda tutmak, muhafaza etmek, kaybetmemek", context: "Eğitim / İş", example: "Spaced repetition helps your brain retain vocabulary for years.", exampleTr: "Aralıklı tekrar, beyninizin kelimeleri yıllarca akılda tutmasına yardımcı olur." },
            { tr: "elde tutmak (müşteri, çalışan)", context: "Şirket", example: "Good company culture helps retain top engineering talent.", exampleTr: "İyi şirket kültürü en iyi mühendislik yeteneklerini elde tutmaya yardımcı olur." }
        ]
    },
    {
        id: "w_encounter",
        term: "encounter",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B2",
        meanings: [
            { tr: "karşılaşmak, rastlamak (genelde sorun veya beklenmedik durum)", context: "Genel / Teknik", example: "If you encounter any bugs while testing, please log them immediately.", exampleTr: "Test sırasında herhangi bir hatayla karşılaşırsanız lütfen hemen kaydedin." },
            { tr: "beklenmedik karşılaşma, deneyim", context: "Günlük Hayat", example: "It was my first close encounter with a native speaker.", exampleTr: "Ana dili İngilizce olan biriyle ilk yakın karşılaşmamdı." }
        ]
    },
    {
        id: "w_adopt",
        term: "adopt",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B1",
        meanings: [
            { tr: "benimsemek, kabul edip kullanmaya başlamak", context: "Teknoloji / İş", example: "Many teams have adopted agile methodologies to move faster.", exampleTr: "Birçok ekip daha hızlı hareket etmek için çevik metodolojileri benimsedi." },
            { tr: "evlat edinmek, sahiplenmek", context: "Günlük Hayat", example: "They decided to adopt a stray cat from the local shelter.", exampleTr: "Yerel barınaktan bir sokak kedisi sahiplenmeye karar verdiler." }
        ]
    },
    {
        id: "w_estimate",
        term: "estimate",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B1",
        meanings: [
            { tr: "tahmin etmek, yaklaşık hesaplamak", context: "Proje / Finans", example: "Can you estimate how long the database migration will take?", exampleTr: "Veritabanı taşıma işleminin ne kadar süreceğini tahmin edebilir misin?" },
            { tr: "yaklaşık maliyet/süre tahmini", context: "İş", example: "The contractor gave us a rough estimate for the renovation.", exampleTr: "Müteahhit tadilat için bize kaba bir tahmin verdi." }
        ]
    },
    {
        id: "w_decline",
        term: "decline",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "B2",
        meanings: [
            { tr: "nazikçe reddetmek, geri çevirmek", context: "İletişim / İş", example: "I had to decline the meeting invitation due to a schedule conflict.", exampleTr: "Program çakışması nedeniyle toplantı davetini geri çevirmek zorunda kaldım." },
            { tr: "azalmak, düşüşe geçmek, gerilemek", context: "Ekonomi / İstatistik", example: "Error rates declined sharply after we deployed the hotfix.", exampleTr: "Acil düzeltmeyi devreye aldıktan sonra hata oranları keskin biçimde düştü." }
        ]
    },
    {
        id: "w_expand",
        term: "expand",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B1",
        meanings: [
            { tr: "genişletmek, büyütmek, kapsamını artırmak", context: "Genel / İş", example: "Reading articles in English will rapidly expand your active vocabulary.", exampleTr: "İngilizce makaleler okumak aktif kelime dağarcığınızı hızla genişletecektir." },
            { tr: "detaylandırmak, açmak (konuyu)", context: "Sunum / İletişim", example: "Could you expand on your second point during the Q&A session?", exampleTr: "Soru-cevap bölümünde ikinci noktanızı biraz daha açabilir misiniz?" }
        ]
    },
    {
        id: "w_implement",
        term: "implement",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B2",
        meanings: [
            { tr: "uygulamak, hayata geçirmek, kodlamak", context: "Yazılım / İş", example: "We implemented a client-side IndexedDB storage system for offline persistence.", exampleTr: "Çevrimdışı kalıcılık için istemci taraflı bir IndexedDB depolama sistemi uyguladık." }
        ]
    },
    {
        id: "w_negotiate",
        term: "negotiate",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B2",
        meanings: [
            { tr: "müzakere etmek, pazarlık yapmak, uzlaşmaya çalışmak", context: "İş / Ticaret", example: "She successfully negotiated a remote working arrangement with her manager.", exampleTr: "Yöneticisiyle uzaktan çalışma düzenlemesini başarıyla müzakere etti." }
        ]
    },
    {
        id: "w_diverse",
        term: "diverse",
        category: "word",
        partOfSpeech: "adjective",
        cefr: "B2",
        meanings: [
            { tr: "çeşitli, farklı, çok yönlü", context: "Genel / Kültür", example: "Practicing words in diverse contexts prevents rigid memorization.", exampleTr: "Kelimeleri çeşitli bağlamlarda pratik yapmak kalıplaşmış ezberi önler." }
        ]
    },
    {
        id: "w_clarify",
        term: "clarify",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B2",
        meanings: [
            { tr: "açıklığa kavuşturmak, netleştirmek", context: "İletişim / İş", example: "Let me clarify the project requirements before we start coding.", exampleTr: "Kodlamaya başlamadan önce proje gereksinimlerini netleştireyim." }
        ]
    },
    {
        id: "w_spot",
        term: "spot",
        category: "word",
        partOfSpeech: "noun / verb",
        cefr: "B1",
        meanings: [
            { tr: "fark etmek, gözüne çarpmak, tespit etmek", context: "Dikkat / İnceleme", example: "Did you spot the subtle grammar mistake in the third sentence?", exampleTr: "Üçüncü cümledeki ince gramer hatasını fark ettin mi?" },
            { tr: "nokta, yer, mekan / leke", context: "Günlük Hayat", example: "This quiet cafe is my favorite spot for studying in the morning.", exampleTr: "Bu sakin kafe sabahları ders çalışmak için en sevdiğim mekandır." }
        ]
    },
    {
        id: "w_solid",
        term: "solid",
        category: "word",
        partOfSpeech: "adjective / noun",
        cefr: "B1",
        meanings: [
            { tr: "sağlam, güvenilir, güçlü (temel/argüman)", context: "İş / Eğitim", example: "You have built a solid foundation in English grammar.", exampleTr: "İngilizce dilbilgisinde sağlam bir temel oluşturdun." },
            { tr: "katı, sert (madde hali)", context: "Bilim / Fiziksel", example: "Water turns into a solid state when it freezes.", exampleTr: "Su donduğunda katı hale geçer." }
        ]
    },
    {
        id: "w_eager",
        term: "eager",
        category: "word",
        partOfSpeech: "adjective",
        cefr: "B2",
        meanings: [
            { tr: "istekli, hevesli, can atan", context: "Kişisel / Duygu", example: "The students are eager to test their skills in the translation arena.", exampleTr: "Öğrenciler çeviri arenasında becerilerini test etmeye çok hevesliler." }
        ]
    },
    {
        id: "w_approach",
        term: "approach",
        category: "word",
        partOfSpeech: "noun / verb",
        cefr: "B1",
        meanings: [
            { tr: "yaklaşım, yöntem, tutum", context: "İş / Eğitim", example: "A gamified approach makes language learning much more engaging.", exampleTr: "Oyunlaştırılmış bir yaklaşım dil öğrenimini çok daha sürükleyici hale getirir." },
            { tr: "yaklaşmak (mesafe veya zaman olarak)", context: "Genel", example: "As the release date approaches, we are focusing on quality assurance.", exampleTr: "Yayın tarihi yaklaştıkça kalite güvencesine odaklanıyoruz." }
        ]
    },
    {
        id: "w_acquire",
        term: "acquire",
        category: "word",
        partOfSpeech: "verb",
        cefr: "B2",
        meanings: [
            { tr: "edinmek, kazanmak (beceri, bilgi)", context: "Eğitim / Kariyer", example: "Children acquire their native language naturally through daily exposure.", exampleTr: "Çocuklar ana dillerini günlük maruz kalma yoluyla doğal olarak edinirler." },
            { tr: "satın almak, devralmak (şirket, mülk)", context: "Ticaret", example: "The tech giant acquired a promising AI research lab.", exampleTr: "Teknoloji devi gelecek vaat eden bir yapay zeka araştırma laboratuvarını satın aldı." }
        ]
    },

    // --- KALIPLAR, DEYİMLER & BAĞLAÇLAR (PHRASES / CONNECTORS / PHRASAL VERBS) ---
    {
        id: "p_figure_out",
        term: "figure out",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "B1",
        meanings: [
            { tr: "çözmek, anlamak, akıl sır erdirmek, bulmak", context: "Problem Çözme / Günlük", example: "It took me two hours to figure out why the API request was failing.", exampleTr: "API isteğinin neden başarısız olduğunu anlamam iki saatimi aldı." }
        ]
    },
    {
        id: "p_on_the_other_hand",
        term: "on the other hand",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "B1",
        meanings: [
            { tr: "öte yandan, diğer taraftan (zıt bir noktayı dengelerken)", context: "Tartışma / Yazma", example: "Client-side apps are fast; on the other hand, users must back up their own data.", exampleTr: "İstemci taraflı uygulamalar hızlıdır; öte yandan kullanıcılar kendi verilerini yedeklemelidir." }
        ]
    },
    {
        id: "p_as_long_as",
        term: "as long as",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "B1",
        meanings: [
            { tr: "...dığı sürece, koşuluyla, yeter ki", context: "Şart / İletişim", example: "You can master any language as long as you practice consistently.", exampleTr: "Düzenli pratik yaptığınız sürece herhangi bir dilde ustalaşabilirsiniz." }
        ]
    },
    {
        id: "p_take_into_account",
        term: "take into account",
        category: "phrase",
        partOfSpeech: "idiom / phrase",
        cefr: "B2",
        meanings: [
            { tr: "göz önünde bulundurmak, hesaba katmak", context: "İş / Analiz", example: "Our evaluation algorithm takes into account both accuracy and natural phrasing.", exampleTr: "Değerlendirme algoritmamız hem doğruluğu hem de doğal ifadeyi göz önünde bulundurur." }
        ]
    },
    {
        id: "p_end_up",
        term: "end up",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "B1",
        meanings: [
            { tr: "sonunda ... olmak, kendini bir durumda bulmak (planlanmayan sonuç)", context: "Günlük Hayat", example: "We wanted to write a simple script, but we ended up building a full platform.", exampleTr: "Basit bir betik yazmak istemiştik ama sonunda tam teşekküllü bir platform inşa ettik." }
        ]
    },
    {
        id: "p_in_terms_of",
        term: "in terms of",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "B2",
        meanings: [
            { tr: "... açısından, ... bakımından", context: "İş / Akademik", example: "This architecture is a huge step forward in terms of speed and privacy.", exampleTr: "Bu mimari, hız ve gizlilik açısından ileriye doğru atılmış büyük bir adımdır." }
        ]
    },
    {
        id: "p_come_up_with",
        term: "come up with",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "B1",
        meanings: [
            { tr: "ortaya atmak, bulmak, üretmek (fikir, çözüm, plan)", context: "Yaratıcılık / İş", example: "She came up with a brilliant way to visualize the daily learning path.", exampleTr: "Günlük öğrenme yolunu görselleştirmek için harika bir yöntem buldu." }
        ]
    },
    {
        id: "p_keep_track_of",
        term: "keep track of",
        category: "phrase",
        partOfSpeech: "idiom / phrase",
        cefr: "B2",
        meanings: [
            { tr: "takibini yapmak, kaydını tutmak, izlemek", context: "Yönetim / Günlük", example: "The dashboard helps you keep track of your daily streak and weak words.", exampleTr: "Kontrol paneli günlük serinizin ve zayıf kelimelerinizin takibini yapmanıza yardımcı olur." }
        ]
    },
    {
        id: "p_regardless_of",
        term: "regardless of",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "B2",
        meanings: [
            { tr: "...e bakılmaksızın, ne olursa olsun", context: "Resmi / Genel", example: "The web app works smoothly regardless of whether you use macOS or Windows.", exampleTr: "Web uygulaması, macOS veya Windows kullanmanıza bakılmaksızın sorunsuz çalışır." }
        ]
    },
    {
        id: "p_point_out",
        term: "point out",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "B1",
        meanings: [
            { tr: "dikkat çekmek, işaret etmek, belirtmek", context: "İletişim / İnceleme", example: "The AI mentor pointed out a more natural way to phrase my sentence.", exampleTr: "Yapay zeka mentoru cümlemi ifade etmenin daha doğal bir yoluna dikkat çekti." }
        ]
    },
    {
        id: "p_put_off",
        term: "put off",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "B1",
        meanings: [
            { tr: "ertelemek, sonraya bırakmak", context: "Günlük / İş", example: "Never put off your daily vocabulary review until tomorrow.", exampleTr: "Günlük kelime tekrarınızı asla yarına ertelemeyin." },
            { tr: "hevesini kırmak, soğutmak", context: "Duygu", example: "Don't let complex grammar rules put you off speaking.", exampleTr: "Karmaşık dilbilgisi kurallarının konuşma hevesinizi kırmasına izin vermeyin." }
        ]
    },
    {
        id: "p_turn_out",
        term: "turn out",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "B1",
        meanings: [
            { tr: "... olduğu ortaya çıkmak, sonuçlanmak", context: "Günlük Hayat", example: "The boss battle translation challenge turned out to be much more fun than I expected.", exampleTr: "Bölüm sonu çeviri mücadelesinin beklediğimden çok daha eğlenceli olduğu ortaya çıktı." }
        ]
    },
    {
        id: "p_make_sense",
        term: "make sense",
        category: "phrase",
        partOfSpeech: "idiom / phrase",
        cefr: "A2",
        meanings: [
            { tr: "mantıklı gelmek, anlam ifade etmek", context: "Günlük / Teknik", example: "Does this explanation make sense in the context of software engineering?", exampleTr: "Bu açıklama yazılım mühendisliği bağlamında mantıklı geliyor mu?" }
        ]
    },
    {
        id: "p_by_means_of",
        term: "by means of",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "B2",
        meanings: [
            { tr: "aracılığıyla, vasıtasıyla, yoluyla", context: "Resmi / Teknik", example: "Users can transfer their progress across devices by means of a JSON backup file.", exampleTr: "Kullanıcılar bir JSON yedek dosyası aracılığıyla ilerlemelerini cihazlar arasında aktarabilirler." }
        ]
    },
    {
        id: "p_carry_out",
        term: "carry out",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "B1",
        meanings: [
            { tr: "yürütmek, gerçekleştirmek, uygulamak (deney, görev, analiz)", context: "İş / Bilim", example: "Our team carried out extensive user testing before launching version two.", exampleTr: "Ekibimiz ikinci sürümü yayınlamadan önce kapsamlı kullanıcı testleri gerçekleştirdi." }
        ]
    },
    {
        id: "p_in_spite_of",
        term: "in spite of",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "B1",
        meanings: [
            { tr: "...e rağmen, karşın", context: "Genel / Yazma", example: "He completed his daily quest in spite of having a very busy schedule.", exampleTr: "Çok yoğun bir programı olmasına rağmen günlük görevini tamamladı." }
        ]
    },
    {
        id: "p_look_forward_to",
        term: "look forward to",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "A2",
        meanings: [
            { tr: "dört gözle beklemek, iple çekmek (sonrasında -ing/isim gelir)", context: "İletişim / İş", example: "I look forward to hearing your feedback on our new proposal.", exampleTr: "Yeni teklifimiz hakkındaki geri bildirimlerinizi duymayı dört gözle bekliyorum." }
        ]
    },
    {
        id: "p_set_up",
        term: "set up",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "A2",
        meanings: [
            { tr: "kurmak, hazırlamak, yapılandırmak (sistem, toplantı, şirket)", context: "Teknik / İş", example: "You can set up your account in ten seconds.", exampleTr: "Hesabını on saniyede kurabilirsin." }
        ]
    },
    {
        id: "w_work",
        term: "work",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "A1",
        meanings: [
            { tr: "çalışmak, iş yapmak", context: "Günlük / İş", example: "I work at an office every day.", exampleTr: "Her gün bir ofiste çalışırım." },
            { tr: "işe yaramak, çalışmak (cihaz/plan)", context: "Teknik / Günlük", example: "This simple plan works very well.", exampleTr: "Bu basit plan çok iyi çalışıyor." }
        ]
    },
    {
        id: "w_learn",
        term: "learn",
        category: "word",
        partOfSpeech: "verb",
        cefr: "A1",
        meanings: [
            { tr: "öğrenmek, bilgi edinmek", context: "Eğitim", example: "I learn three new words every day.", exampleTr: "Her gün üç yeni kelime öğrenirim." },
            { tr: "duymak, haberdar olmak", context: "Günlük", example: "I was happy to learn the good news.", exampleTr: "İyi haberi duyduğuma sevindim." }
        ]
    },
    {
        id: "w_help",
        term: "help",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "A1",
        meanings: [
            { tr: "yardım etmek", context: "Günlük", example: "Can you help me with this task?", exampleTr: "Bu görevde bana yardım edebilir misin?" },
            { tr: "yardım, destek", context: "Genel", example: "Thank you for your kind help.", exampleTr: "Nazik yardımın için teşekkür ederim." }
        ]
    },
    {
        id: "w_start",
        term: "start",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "A1",
        meanings: [
            { tr: "başlamak, başlatmak", context: "Günlük", example: "We start our English lesson at nine.", exampleTr: "İngilizce dersimize saat dokuzda başlarız." },
            { tr: "başlangıç, çıkış noktası", context: "Genel", example: "This is a good start for you.", exampleTr: "Bu senin için iyi bir başlangıç." }
        ]
    },
    {
        id: "w_check",
        term: "check",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "A1",
        meanings: [
            { tr: "kontrol etmek, gözden geçirmek", context: "Günlük / İş", example: "Please check your answers carefully.", exampleTr: "Lütfen cevaplarını dikkatlice kontrol et." },
            { tr: "hesap (restoran) / çek", context: "Günlük", example: "Can we have the check, please?", exampleTr: "Hesabı alabilir miyiz lütfen?" }
        ]
    },
    {
        id: "w_share",
        term: "share",
        category: "word",
        partOfSpeech: "verb / noun",
        cefr: "A2",
        meanings: [
            { tr: "paylaşmak", context: "Günlük / Sosyal", example: "We share our notes with the team.", exampleTr: "Notlarımızı ekiple paylaşırız." },
            { tr: "pay, hisse", context: "İş / Finans", example: "Everyone gets a fair share of the profit.", exampleTr: "Herkes kârdan adil bir pay alır." }
        ]
    },
    {
        id: "p_wake_up",
        term: "wake up",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "A1",
        meanings: [
            { tr: "uyanmak", context: "Günlük", example: "I wake up at seven every morning.", exampleTr: "Her sabah saat yedide uyanırım." }
        ]
    },
    {
        id: "p_look_for",
        term: "look for",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "A1",
        meanings: [
            { tr: "aramak (kayıp bir şeyi veya iş/ev)", context: "Günlük", example: "I am looking for my phone.", exampleTr: "Telefonumu arıyorum." }
        ]
    },
    {
        id: "p_give_up",
        term: "give up",
        category: "phrase",
        partOfSpeech: "phrasal verb",
        cefr: "A2",
        meanings: [
            { tr: "pes etmek, vazgeçmek, bırakmak", context: "Günlük / Motivasyon", example: "Never give up on your dreams.", exampleTr: "Hayallerinden asla vazgeçme." }
        ]
    },
    {
        id: "p_because",
        term: "because",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "A1",
        meanings: [
            { tr: "çünkü, ...dığı için", context: "Günlük", example: "I study English because I want a better job.", exampleTr: "İngilizce çalışıyorum çünkü daha iyi bir iş istiyorum." }
        ]
    },
    {
        id: "p_however",
        term: "however",
        category: "phrase",
        partOfSpeech: "connector",
        cefr: "A2",
        meanings: [
            { tr: "ancak, yine de, bununla birlikte", context: "Genel", example: "The book is short; however, it is very useful.", exampleTr: "Kitap kısa; ancak çok faydalı." }
        ]
    }
];

// Oxford 3000 / NGSL Genişletilmiş Paket (A1, A2, B1, B2 Seviye Paketleri + Gerçek Kısa Örnek Cümleler)
const OXFORD_EXTENDED_PACK = [
    // --- A1 TEMEL KELİMELER ---
    { term: "ask", pos: "verb", cefr: "A1", tr1: "sormak", tr2: "istemek, rica etmek", ex1: "Ask a simple question.", exTr1: "Basit bir soru sor.", ex2: "She asked for water.", exTr2: "Su istedi." },
    { term: "answer", pos: "verb / noun", cefr: "A1", tr1: "cevap vermek, yanıtlamak", tr2: "cevap, yanıt", ex1: "Please answer my message.", exTr1: "Lütfen mesajıma cevap ver.", ex2: "Your answer is right.", exTr2: "Cevabın doğru." },
    { term: "begin", pos: "verb", cefr: "A1", tr1: "başlamak", tr2: "başlatmak", ex1: "Let us begin the game.", exTr1: "Hadi oyuna başlayalım.", ex2: "The movie begins at eight.", exTr2: "Film sekizde başlıyor." },
    { term: "bring", pos: "verb", cefr: "A1", tr1: "getirmek", tr2: "beraberinde getirmek", ex1: "Bring your laptop tomorrow.", exTr1: "Yarın dizüstü bilgisayarını getir.", ex2: "Good news brings happiness.", exTr2: "İyi haberler mutluluk getirir." },
    { term: "buy", pos: "verb", cefr: "A1", tr1: "satın almak", tr2: "inanmak, ikna olmak (günlük)", ex1: "I want to buy a coffee.", exTr1: "Bir kahve satın almak istiyorum.", ex2: "We buy fresh bread daily.", exTr2: "Her gün taze ekmek alırız." },
    { term: "call", pos: "verb / noun", cefr: "A1", tr1: "telefonla aramak", tr2: "çağırmak, adlandırmak", ex1: "Call me after lunch.", exTr1: "Öğle yemeğinden sonra beni ara.", ex2: "Wait for my call.", exTr2: "Aramamı bekle." },
    { term: "change", pos: "verb / noun", cefr: "A1", tr1: "değiştirmek, değişmek", tr2: "bozuk para / değişiklik", ex1: "We can change the plan.", exTr1: "Planı değiştirebiliriz.", ex2: "Keep the small change.", exTr2: "Bozuk paralar sende kalsın." },
    { term: "choose", pos: "verb", cefr: "A1", tr1: "seçmek, tercih etmek", tr2: "karar kılmak", ex1: "Choose your level first.", exTr1: "Önce seviyeni seç.", ex2: "You chose the right path.", exTr2: "Doğru yolu seçtin." },
    { term: "clean", pos: "adj / verb", cefr: "A1", tr1: "temiz", tr2: "temizlemek", ex1: "My desk is very clean.", exTr1: "Masam çok temiz.", ex2: "I clean my room on Sunday.", exTr2: "Pazar günü odamı temizlerim." },
    { term: "close", pos: "verb / adj", cefr: "A1", tr1: "kapatmak", tr2: "yakın, samimi", ex1: "Close the window, please.", exTr1: "Lütfen pencereyi kapat.", ex2: "He is a close friend.", exTr2: "O yakın bir arkadaş." },
    { term: "come", pos: "verb", cefr: "A1", tr1: "gelmek", tr2: "ulaşmak", ex1: "Come home early today.", exTr1: "Bugün eve erken gel.", ex2: "My friends will come soon.", exTr2: "Arkadaşlarım yakında gelecek." },
    { term: "cook", pos: "verb / noun", cefr: "A1", tr1: "yemek pişirmek", tr2: "aşçı", ex1: "I cook dinner at six.", exTr1: "Saat altıda akşam yemeği pişiririm.", ex2: "She is a great cook.", exTr2: "O harika bir aşçıdır." },
    { term: "create", pos: "verb", cefr: "A1", tr1: "oluşturmak, yaratmak", tr2: "üretmek", ex1: "Create a free account now.", exTr1: "Şimdi ücretsiz bir hesap oluştur.", ex2: "We create simple apps.", exTr2: "Basit uygulamalar üretiriz." },
    { term: "decide", pos: "verb", cefr: "A1", tr1: "karar vermek", tr2: "seçim yapmak", ex1: "I cannot decide today.", exTr1: "Bugün karar veremiyorum.", ex2: "We decided to stay home.", exTr2: "Evde kalmaya karar verdik." },
    { term: "easy", pos: "adjective", cefr: "A1", tr1: "kolay, basit", tr2: "rahat", ex1: "This sentence is very easy.", exTr1: "Bu cümle çok kolay.", ex2: "English is easy with practice.", exTr2: "İngilizce pratikle kolaydır." },
    { term: "explain", pos: "verb", cefr: "A1", tr1: "açıklamak, anlatmak", tr2: "izah etmek", ex1: "Please explain this word.", exTr1: "Lütfen bu kelimeyi açıkla.", ex2: "He explained the rule clearly.", exTr2: "Kuralı açıkça anlattı." },
    { term: "find", pos: "verb", cefr: "A1", tr1: "bulmak", tr2: "fark etmek, görmek", ex1: "I cannot find my keys.", exTr1: "Anahtarlarımı bulamıyorum.", ex2: "You will find it helpful.", exTr2: "Bunu faydalı bulacaksın." },
    { term: "finish", pos: "verb / noun", cefr: "A1", tr1: "bitirmek, tamamlamak", tr2: "bitiş, son", ex1: "Finish your homework first.", exTr1: "Önce ödevini bitir.", ex2: "Let us finish the race.", exTr2: "Yarışı bitirelim." },
    { term: "follow", pos: "verb", cefr: "A1", tr1: "takip etmek", tr2: "izlemek, uymak (kurala)", ex1: "Follow the steps on screen.", exTr1: "Ekrandaki adımları takip et.", ex2: "Dogs follow their owners.", exTr2: "Köpekler sahiplerini takip eder." },
    { term: "forget", pos: "verb", cefr: "A1", tr1: "unutmak", tr2: "ihmal etmek", ex1: "Do not forget your bag.", exTr1: "Çantanı unutma.", ex2: "I forgot his name.", exTr2: "Onun adını unuttum." },
    { term: "grow", pos: "verb", cefr: "A1", tr1: "büyümek, gelişmek", tr2: "yetiştirmek (bitki)", ex1: "Plants grow in the sun.", exTr1: "Bitkiler güneşte büyür.", ex2: "Our team grows every year.", exTr2: "Ekibimiz her yıl büyüyor." },
    { term: "happen", pos: "verb", cefr: "A1", tr1: "olmak, meydana gelmek", tr2: "tesadüfen olmak", ex1: "What happened yesterday?", exTr1: "Dün ne oldu?", ex2: "Good things happen daily.", exTr2: "Güzel şeyler her gün olur." },
    { term: "important", pos: "adjective", cefr: "A1", tr1: "önemli", tr2: "değerli, kritik", ex1: "Sleep is very important.", exTr1: "Uyku çok önemlidir.", ex2: "I have an important call.", exTr2: "Önemli bir telefon görüşmem var." },
    { term: "improve", pos: "verb", cefr: "A2", tr1: "geliştirmek, iyileştirmek", tr2: "ilerlemek", ex1: "Practice improves your English.", exTr1: "Pratik İngilizceni geliştirir.", ex2: "My score improved today.", exTr2: "Puanım bugün yükseldi." },
    { term: "keep", pos: "verb", cefr: "A1", tr1: "tutmak, saklamak", tr2: "devam ettirmek", ex1: "Keep this book on the desk.", exTr1: "Bu kitabı masada tut.", ex2: "Keep trying every day.", exTr2: "Her gün denemeye devam et." },
    { term: "listen", pos: "verb", cefr: "A1", tr1: "dinlemek", tr2: "kulak vermek", ex1: "Listen to the teacher.", exTr1: "Öğretmeni dinle.", ex2: "I listen to music at work.", exTr2: "İşte müzik dinlerim." },
    { term: "need", pos: "verb / noun", cefr: "A1", tr1: "ihtiyacı olmak", tr2: "ihtiyaç, gereksinim", ex1: "I need a cup of tea.", exTr1: "Bir fincan çaya ihtiyacım var.", ex2: "We need more time.", exTr2: "Daha fazla zamana ihtiyacımız var." },
    { term: "open", pos: "verb / adj", cefr: "A1", tr1: "açmak", tr2: "açık", ex1: "Open the door slowly.", exTr1: "Kapıyı yavaşça aç.", ex2: "The shop is open now.", exTr2: "Dükkan şu an açık." },
    { term: "plan", pos: "noun / verb", cefr: "A1", tr1: "plan, tasarı", tr2: "planlamak", ex1: "I have a good plan.", exTr1: "İyi bir planım var.", ex2: "We plan our trip today.", exTr2: "Bugün gezimizi planlıyoruz." },
    { term: "prepare", pos: "verb", cefr: "A2", tr1: "hazırlamak", tr2: "hazırlanmak", ex1: "Prepare dinner for tonight.", exTr1: "Bu akşam için yemek hazırla.", ex2: "She prepared for the test.", exTr2: "Sınava hazırlandı." },
    { term: "remember", pos: "verb", cefr: "A1", tr1: "hatırlamak", tr2: "aklında tutmak", ex1: "I remember your face.", exTr1: "Yüzünü hatırlıyorum.", ex2: "Remember to save your file.", exTr2: "Dosyanı kaydetmeyi hatırla." },
    { term: "save", pos: "verb", cefr: "A2", tr1: "kaydetmek (dosya/veri)", tr2: "biriktirmek (para) / kurtarmak", ex1: "Save your work often.", exTr1: "Çalışmanı sık sık kaydet.", ex2: "I save money every month.", exTr2: "Her ay para biriktiririm." },
    { term: "send", pos: "verb", cefr: "A1", tr1: "göndermek, yollamak", tr2: "iletmek", ex1: "Send me an email today.", exTr1: "Bugün bana bir e-posta gönder.", ex2: "She sent a short text.", exTr2: "Kısa bir mesaj yolladı." },
    { term: "show", pos: "verb / noun", cefr: "A1", tr1: "göstermek", tr2: "gösteri, program", ex1: "Show me your new phone.", exTr1: "Bana yeni telefonunu göster.", ex2: "The TV show starts now.", exTr2: "TV programı şimdi başlıyor." },
    { term: "speak", pos: "verb", cefr: "A1", tr1: "konuşmak (dil/sohbet)", tr2: "ifade etmek", ex1: "I speak a little English.", exTr1: "Biraz İngilizce konuşurum.", ex2: "Please speak slowly.", exTr2: "Lütfen yavaş konuş." },
    { term: "spend", pos: "verb", cefr: "A2", tr1: "harcamak (para)", tr2: "geçirmek (zaman)", ex1: "I spend ten minutes reading.", exTr1: "Okumaya on dakika harcarım.", ex2: "Do not spend too much money.", exTr2: "Çok fazla para harcama." },
    { term: "study", pos: "verb / noun", cefr: "A1", tr1: "ders çalışmak", tr2: "araştırma, çalışma", ex1: "I study English every night.", exTr1: "Her gece İngilizce çalışırım.", ex2: "His study took two years.", exTr2: "Çalışması iki yıl sürdü." },
    { term: "travel", pos: "verb / noun", cefr: "A1", tr1: "seyahat etmek", tr2: "yolculuk", ex1: "I love to travel by train.", exTr1: "Trenle seyahat etmeyi severim.", ex2: "Air travel is very fast.", exTr2: "Hava yolculuğu çok hızlıdır." },
    { term: "try", pos: "verb / noun", cefr: "A1", tr1: "denemek, çabalamak", tr2: "deneme", ex1: "Try this new app today.", exTr1: "Bugün bu yeni uygulamayı dene.", ex2: "Give it one more try.", exTr2: "Ona bir şans daha ver." },
    { term: "understand", pos: "verb", cefr: "A1", tr1: "anlamak, kavramak", tr2: "hak vermek", ex1: "I understand this lesson.", exTr1: "Bu dersi anlıyorum.", ex2: "Do you understand my question?", exTr2: "Sorumu anlıyor musun?" },
    { term: "visit", pos: "verb / noun", cefr: "A1", tr1: "ziyaret etmek", tr2: "ziyaret", ex1: "We visit our family on Sunday.", exTr1: "Pazar günü ailemizi ziyaret ederiz.", ex2: "Thank you for your visit.", exTr2: "Ziyaretin için teşekkürler." },
    { term: "wait", pos: "verb", cefr: "A1", tr1: "beklemek", tr2: "hizmet etmek (wait on)", ex1: "Wait for me at the gate.", exTr1: "Kapıda beni bekle.", ex2: "Please wait five minutes.", exTr2: "Lütfen beş dakika bekle." },
    { term: "write", pos: "verb", cefr: "A1", tr1: "yazmak", tr2: "kaleme almak", ex1: "Write two short sentences.", exTr1: "İki kısa cümle yaz.", ex2: "I write notes in my book.", exTr2: "Defterime notlar yazarım." },

    // --- A2 GÜNLÜK KELİMELER ---
    { term: "achieve", pos: "verb", cefr: "A2", tr1: "başarmak, ulaşmak (hedefe)", tr2: "elde etmek", ex1: "You can achieve your goal.", exTr1: "Hedefine ulaşabilirsin.", ex2: "She achieved great results.", exTr2: "Harika sonuçlar elde etti." },
    { term: "agree", pos: "verb", cefr: "A2", tr1: "katılmak, aynı fikirde olmak", tr2: "anlaşmak, razı olmak", ex1: "I agree with your idea.", exTr1: "Fikrine katılıyorum.", ex2: "We agreed on the price.", exTr2: "Fiyat konusunda anlaştık." },
    { term: "allow", pos: "verb", cefr: "A2", tr1: "izin vermek", tr2: "olanak tanımak", ex1: "My boss allowed me to leave.", exTr1: "Patronum ayrılmama izin verdi.", ex2: "Pets are not allowed here.", exTr2: "Burada evcil hayvanlara izin verilmez." },
    { term: "arrive", pos: "verb", cefr: "A2", tr1: "varmak, ulaşmak", tr2: "gelmek (kargo/haber)", ex1: "The train arrived on time.", exTr1: "Tren zamanında vardı.", ex2: "We arrive in Ankara tonight.", exTr2: "Bu gece Ankara'ya varıyoruz." },
    { term: "avoid", pos: "verb", cefr: "A2", tr1: "kaçınmak, uzak durmak", tr2: "önlemek", ex1: "Avoid eating too much sugar.", exTr1: "Çok fazla şeker yemekten kaçın.", ex2: "Try to avoid common mistakes.", exTr2: "Yaygın hatalardan kaçınmaya çalış." },
    { term: "believe", pos: "verb", cefr: "A2", tr1: "inanmak", tr2: "düşünmek, sanmak", ex1: "I believe in your talent.", exTr1: "Yeteneğine inanıyorum.", ex2: "I believe he is right.", exTr2: "Onun haklı olduğuna inanıyorum." },
    { term: "borrow", pos: "verb", cefr: "A2", tr1: "ödünç almak", tr2: "alıntılamak", ex1: "Can I borrow your pen?", exTr1: "Kalemini ödünç alabilir miyim?", ex2: "She borrowed a book yesterday.", exTr2: "Dün bir kitap ödünç aldı." },
    { term: "build", pos: "verb", cefr: "A2", tr1: "inşa etmek, kurmak", tr2: "geliştirmek (beceri/güven)", ex1: "They build houses fast.", exTr1: "Hızlıca ev inşa ediyorlar.", ex2: "Build a habit every day.", exTr2: "Her gün bir alışkanlık kur." },
    { term: "compare", pos: "verb", cefr: "A2", tr1: "karşılaştırmak, kıyaslamak", tr2: "benzetmek", ex1: "Compare these two phones.", exTr1: "Bu iki telefonu karşılaştır.", ex2: "Do not compare yourself to others.", exTr2: "Kendini başkalarıyla kıyaslama." },
    { term: "continue", pos: "verb", cefr: "A2", tr1: "devam etmek", tr2: "sürdürmek", ex1: "Continue reading the text.", exTr1: "Metni okumaya devam et.", ex2: "The rain continued all night.", exTr2: "Yağmur bütün gece devam etti." },
    { term: "describe", pos: "verb", cefr: "A2", tr1: "tanımlamak, betimlemek", tr2: "tarif etmek", ex1: "Describe your daily routine.", exTr1: "Günlük rutinini tarif et.", ex2: "Words cannot describe my joy.", exTr2: "Kelimeler sevincimi tarif edemez." },
    { term: "discover", pos: "verb", cefr: "A2", tr1: "keşfetmek", tr2: "fark etmek, öğrenmek", ex1: "We discovered a quiet cafe.", exTr1: "Sakin bir kafe keşfettik.", ex2: "Discover new words every day.", exTr2: "Her gün yeni kelimeler keşfet." },
    { term: "discuss", pos: "verb", cefr: "A2", tr1: "tartışmak, görüşmek", tr2: "müzakere etmek", ex1: "Let us discuss the details.", exTr1: "Hadi detayları görüşelim.", ex2: "They discussed the project.", exTr2: "Projeyi tartıştılar." },
    { term: "focus", pos: "verb / noun", cefr: "A2", tr1: "odaklanmak", tr2: "odak, ilgi merkezi", ex1: "Focus on one task today.", exTr1: "Bugün tek bir göreve odaklan.", ex2: "Keep your focus strong.", exTr2: "Odağını güçlü tut." },
    { term: "offer", pos: "verb / noun", cefr: "A2", tr1: "teklif etmek, sunmak", tr2: "teklif", ex1: "They offered me a job.", exTr1: "Bana bir iş teklif ettiler.", ex2: "Accept this good offer.", exTr2: "Bu iyi teklifi kabul et." },
    { term: "prefer", pos: "verb", cefr: "A2", tr1: "tercih etmek", tr2: "yeğlemek", ex1: "I prefer tea to coffee.", exTr1: "Çayı kahveye tercih ederim.", ex2: "She prefers working from home.", exTr2: "Evden çalışmayı tercih ediyor." },
    { term: "protect", pos: "verb", cefr: "A2", tr1: "korumak", tr2: "savunmak", ex1: "Protect your password well.", exTr1: "Şifreni iyi koru.", ex2: "Trees protect the soil.", exTr2: "Ağaçlar toprağı korur." },
    { term: "reduce", pos: "verb", cefr: "A2", tr1: "azaltmak, düşürmek", tr2: "indirgemek", ex1: "Reduce your screen time.", exTr1: "Ekran süreni azalt.", ex2: "The shop reduced all prices.", exTr2: "Mağaza tüm fiyatları düşürdü." },
    { term: "suggest", pos: "verb", cefr: "A2", tr1: "önermek, tavsiye etmek", tr2: "ima etmek", ex1: "I suggest a short break.", exTr1: "Kısa bir mola öneriyorum.", ex2: "Can you suggest a book?", exTr2: "Bir kitap önerebilir misin?" },
    { term: "support", pos: "verb / noun", cefr: "A2", tr1: "desteklemek", tr2: "destek, yardım", ex1: "I always support my team.", exTr1: "Ekibimi her zaman desteklerim.", ex2: "Thanks for your support.", exTr2: "Desteğin için teşekkürler." },

    // --- A1 / A2 PHRASAL VERBLER & BAĞLAÇLAR ---
    { term: "find out", pos: "phrasal verb", cefr: "A2", tr1: "öğrenmek, ortaya çıkarmak", tr2: "keşfetmek (gerçeği)", cat: "phrase", ex1: "I will find out the truth.", exTr1: "Gerçeği öğreneceğim.", ex2: "Find out when the bus leaves.", exTr2: "Otobüsün ne zaman kalktığını öğren." },
    { term: "get up", pos: "phrasal verb", cefr: "A1", tr1: "yataktan kalkmak", tr2: "ayağa kalkmak", cat: "phrase", ex1: "I get up early on Monday.", exTr1: "Pazartesi günleri erken kalkarım.", ex2: "Get up and stretch a bit.", exTr2: "Kalk ve biraz esne." },
    { term: "turn on", pos: "phrasal verb", cefr: "A1", tr1: "açmak (ışık, bilgisayar, cihaz)", tr2: "çalıştırmak", cat: "phrase", ex1: "Turn on the light, please.", exTr1: "Lütfen ışığı aç.", ex2: "I turned on my laptop.", exTr2: "Dizüstü bilgisayarımı açtım." },
    { term: "turn off", pos: "phrasal verb", cefr: "A1", tr1: "kapatmak (cihaz, ışık)", tr2: "söndürmek", cat: "phrase", ex1: "Turn off the TV before sleep.", exTr1: "Uyumadan önce TV'yi kapat.", ex2: "Please turn off your phone.", exTr2: "Lütfen telefonunu kapat." },
    { term: "write down", pos: "phrasal verb", cefr: "A2", tr1: "not almak, bir yere yazmak", tr2: "kaydetmek", cat: "phrase", ex1: "Write down the new words.", exTr1: "Yeni kelimeleri not al.", ex2: "I wrote down her number.", exTr2: "Numarasını bir yere yazdım." },
    { term: "fill in", pos: "phrasal verb", cefr: "A2", tr1: "doldurmak (form, boşluk)", tr2: "yerine bakmak", cat: "phrase", ex1: "Fill in this short form.", exTr1: "Bu kısa formu doldur.", ex2: "Fill in the empty blanks.", exTr2: "Boşlukları doldur." },
    { term: "go on", pos: "phrasal verb", cefr: "A2", tr1: "devam etmek", tr2: "olup bitmek", cat: "phrase", ex1: "Please go on with your story.", exTr1: "Lütfen hikayene devam et.", ex2: "The show must go on.", exTr2: "Gösteri devam etmeli." },
    { term: "so", pos: "connector", cefr: "A1", tr1: "bu yüzden, dolayısıyla", tr2: "öyleyse, çok", cat: "phrase", ex1: "I was tired, so I slept.", exTr1: "Yorgundum, bu yüzden uyudum.", ex2: "It rained, so we stayed in.", exTr2: "Yağmur yağdı, bu yüzden evde kaldık." },
    { term: "also", pos: "connector", cefr: "A1", tr1: "ayrıca, bunun yanında", tr2: "da / de", cat: "phrase", ex1: "She speaks English and also French.", exTr1: "İngilizce ve ayrıca Fransızca konuşuyor.", ex2: "I also like swimming.", exTr2: "Yüzmeyi de severim." },
    { term: "although", pos: "connector", cefr: "A2", tr1: "...e rağmen, gerçi", tr2: "olsa da", cat: "phrase", ex1: "Although it was cold, we walked.", exTr1: "Hava soğuk olmasına rağmen yürüdük.", ex2: "I smiled although I was tired.", exTr2: "Yorgun olmama rağmen gülümsedim." },
    { term: "for example", pos: "connector", cefr: "A1", tr1: "örneğin, mesela", tr2: "örnek olarak", cat: "phrase", ex1: "I like fruits, for example apples.", exTr1: "Meyveleri severim, örneğin elmaları.", ex2: "Use daily apps, for example this one.", exTr2: "Günlük uygulamalar kullan, örneğin bunu." },

    // --- B1 - B2 İLERİ / OXFORD PAKETİ ---
    { term: "abandon", pos: "verb", cefr: "B2", tr1: "terk etmek, vazgeçmek", tr2: "yarıda bırakmak (proje/fikir)" },
    { term: "ability", pos: "noun", cefr: "A2", tr1: "yetenek, kabiliyet", tr2: "beceri, iktidar" },
    { term: "absorb", pos: "verb", cefr: "B2", tr1: "emmek, soğurmak", tr2: "kavramak, özümsemek (bilgi)" },
    { term: "abstract", pos: "adj / noun", cefr: "B2", tr1: "soyut, kavramsal", tr2: "özet (makale/bildiri özeti)" },
    { term: "accelerate", pos: "verb", cefr: "B2", tr1: "hızlandırmak, ivme kazandırmak", tr2: "hızlanmak" },
    { term: "accessible", pos: "adjective", cefr: "B2", tr1: "erişilebilir, ulaşılabilir", tr2: "anlaşılır, kolay kullanılır" },
    { term: "accommodate", pos: "verb", cefr: "B2", tr1: "konaklatmak, yer sağlamak", tr2: "uyum sağlamak, talebi karşılamak" },
    { term: "accomplish", pos: "verb", cefr: "B2", tr1: "başarmak, sonuçlandırmak", tr2: "tamamlamak" },
    { term: "account", pos: "noun / verb", cefr: "B1", tr1: "hesap (banka/kullanıcı)", tr2: "açıklamasını yapmak (account for)" },
    { term: "accumulate", pos: "verb", cefr: "B2", tr1: "biriktirmek, toplamak", tr2: "çoğalmak, yığılmak" },
    { term: "acknowledge", pos: "verb", cefr: "B2", tr1: "kabul etmek, doğrulamak", tr2: "alındığını bildirmek, takdir etmek" },
    { term: "adapt", pos: "verb", cefr: "B2", tr1: "uyum sağlamak, adapte olmak", tr2: "uyarlamak" },
    { term: "adequate", pos: "adjective", cefr: "B2", tr1: "yeterli, ihtiyacı karşılayan", tr2: "elverişli" },
    { term: "adjust", pos: "verb", cefr: "B2", tr1: "ayarlamak, düzenlemek", tr2: "alışmak, intibak etmek" },
    { term: "advocate", pos: "verb / noun", cefr: "B2", tr1: "savunmak, desteklemek", tr2: "savunucu, destekçi" },
    { term: "allocate", pos: "verb", cefr: "B2", tr1: "tahsis etmek, ayırmak (bütçe/bellek)", tr2: "paylaştırmak" },
    { term: "alter", pos: "verb", cefr: "B2", tr1: "değiştirmek, tadil etmek", tr2: "başkalaşmak" },
    { term: "ambiguous", pos: "adjective", cefr: "B2", tr1: "belirsiz, iki anlamlı, muğlak", tr2: "net olmayan" },
    { term: "anticipate", pos: "verb", cefr: "B2", tr1: "öngörmek, beklemek, tahmin etmek", tr2: "hazırlıklı olmak" },
    { term: "apparent", pos: "adjective", cefr: "B2", tr1: "açık, belli, aşikar", tr2: "görünürdeki" },
    { term: "assess", pos: "verb", cefr: "B2", tr1: "değerlendirmek, ölçmek", tr2: "değer biçmek" },
    { term: "assign", pos: "verb", cefr: "B2", tr1: "atamak, görevlendirmek", tr2: "değer atamak (yazılım)" },
    { term: "assume", pos: "verb", cefr: "B2", tr1: "varsaymak, farz etmek", tr2: "üstlenmek (sorumluluk/rol)" },
    { term: "assure", pos: "verb", cefr: "B2", tr1: "güvence vermek, temin etmek", tr2: "garantiye almak" },
    { term: "attribute", pos: "verb / noun", cefr: "B2", tr1: "dayandırmak, atfetmek", tr2: "nitelik, öznitelik (HTML/nesne)" },
    { term: "back up", pos: "phrasal verb", cefr: "B1", tr1: "yedeklemek (veri)", tr2: "destek çıkmak, arka çıkmak", cat: "phrase" },
    { term: "break down", pos: "phrasal verb", cefr: "B1", tr1: "bozulmak, arızalanmak", tr2: "alt parçalara ayırıp analiz etmek", cat: "phrase" },
    { term: "bring up", pos: "phrasal verb", cefr: "B1", tr1: "gündeme getirmek, bahsetmek", tr2: "büyütmek, yetiştirmek", cat: "phrase" },
    { term: "call off", pos: "phrasal verb", cefr: "B1", tr1: "iptal etmek, durdurmak", tr2: "geri çekmek", cat: "phrase" },
    { term: "catch up", pos: "phrasal verb", cefr: "B1", tr1: "yetişmek, eksikleri kapatmak", tr2: "görüşüp hasret gidermek", cat: "phrase" },
    { term: "due to", pos: "connector", cefr: "B1", tr1: "...den dolayı, nedeniyle", tr2: "... yüzünden", cat: "phrase" },
    { term: "even though", pos: "connector", cefr: "B1", tr1: "...olmasına rağmen, her ne kadar ... ise de", tr2: "karşın", cat: "phrase" },
    { term: "in addition to", pos: "connector", cefr: "B1", tr1: "...e ek olarak, yanı sıra", tr2: "bununla birlikte", cat: "phrase" },
    { term: "on behalf of", pos: "idiom / phrase", cefr: "B2", tr1: "... adına, ... temsilen", tr2: "... namına", cat: "phrase" },
    { term: "prior to", pos: "connector", cefr: "B2", tr1: "...den önce, öncesinde", tr2: "evvel", cat: "phrase" }
];
