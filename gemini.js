// gemini.js - Google Gemini REST API Entegrasyonu & Zengin Akıllı Demo/Mock Motoru

class GeminiService {
    constructor() {
        this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
    }

    async getConfig() {
        const cfg = await window.dbManager.get("settings", "aiConfig");
        return cfg || { apiKey: "", model: "gemini-2.5-flash", preferredScenario: "Günlük Hayat" };
    }

    async isLiveMode() {
        const cfg = await this.getConfig();
        return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 10);
    }

    // Google Gemini API'den Mevcut Tüm Modelleri Canlı Tara (generateContent destekleyenler)
    async fetchAvailableModels(customApiKey = null) {
        const cfg = await this.getConfig();
        const apiKey = (customApiKey !== null ? customApiKey : (cfg.apiKey || "")).trim();

        if (!apiKey) {
            throw new Error("Modelleri taramak için lütfen önce geçerli bir Gemini API Key girin.");
        }

        const url = `${this.baseUrl}?key=${encodeURIComponent(apiKey)}&pageSize=100`;
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${response.status} Hatası`;
            throw new Error(`Model tarama hatası: ${errMsg}`);
        }

        const data = await response.json();
        const rawModels = Array.isArray(data.models) ? data.models : [];

        // Sadece metin/içerik üretimi (generateContent) destekleyen gemini modellerini filtrele ve sırala
        const supported = rawModels
            .filter(m =>
                Array.isArray(m.supportedGenerationMethods) &&
                m.supportedGenerationMethods.includes("generateContent") &&
                m.name.includes("gemini")
            )
            .map(m => {
                const shortId = m.name.replace(/^models\//, "");
                return {
                    id: shortId,
                    displayName: m.displayName || shortId,
                    description: m.description || "",
                    version: m.version || ""
                };
            })
            .sort((a, b) => b.id.localeCompare(a.id));

        return supported;
    }

    // Gemini REST API Çağrısı (JSON Şema Garantili + systemInstruction/JSON desteklemeyen modeller için güvenli yedek)
    async callGeminiJSON(systemInstruction, userPrompt) {
        const cfg = await this.getConfig();
        const apiKey = (cfg.apiKey || "").trim();
        const model = cfg.model || "gemini-2.5-flash";

        if (!apiKey) {
            throw new Error("NO_API_KEY");
        }

        const url = `${this.baseUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const makeRequest = async (useSystemField) => {
            const body = useSystemField
                ? {
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.85,
                        responseMimeType: "application/json"
                    }
                }
                : {
                    contents: [{
                        role: "user",
                        parts: [{ text: `${systemInstruction}\n\n---\n${userPrompt}\n\nLütfen yalnızca geçerli JSON döndür.` }]
                    }],
                    generationConfig: {
                        temperature: 0.85
                    }
                };

            return fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
        };

        let response = await makeRequest(true);
        if (!response.ok && response.status === 400) {
            // Bazı modeller systemInstruction veya responseMimeType desteklemediğinde birleşik prompt ile tekrar dene
            response = await makeRequest(false);
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${response.status} Hatası`;
            throw new Error(`Gemini API Hatası: ${errMsg}`);
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        return JSON.parse(cleaned);
    }

    getLevelComplexityRules(cefrLevel = "B1") {
        const lvl = (cefrLevel || "B1").toUpperCase();
        if (lvl.includes("A1")) {
            return "ÇOK BASİT A1 SEVİYESİ: Her cümle EN FAZLA 4-6 İngilizce kelime uzunluğunda olsun. Sadece tek yüklemli, düz ve günlük basit cümleler kur (Present Simple, can veya basit Past Simple). Noktalı virgül (;), devrik cümle veya uzun yan cümle KESİNLİKLE YASAK. Örnek zorluk: 'I wake up at seven.' veya 'I need a cup of tea.'";
        }
        if (lvl.includes("A2")) {
            return "BASİT A2 SEVİYESİ: Her cümle EN FAZLA 5-8 İngilizce kelime uzunluğunda olsun. Kısa, anlaşılır günlük cümleler kur. Noktalı virgül (;) veya karmaşık akademik yapılar kullanma. En fazla 'and, but, because, so' gibi tek basit bağlaç kullan.";
        }
        if (lvl.includes("B1")) {
            return "ORTA B1 SEVİYESİ: 7-11 kelimelik net ve doğal günlük/iş cümleleri kur.";
        }
        return "İLERİ B2/C1 SEVİYESİ: 10-15 kelimelik akıcı, doğal ve nüanslı cümleler kur.";
    }

    // 1. Aşama 3 & Cümle Pratiği: 10 Türkçe -> İngilizce Cümle Üretimi (Hedef Kelime/Kalıplar + CEFR + Senaryo + İpuçlu)
    async generateArenaSentences(words, phrases, scenario = "Günlük Hayat", cefrLevel = "B1", excludeTurkish = []) {
        const allTargets = [...words, ...phrases];
        const levelRule = this.getLevelComplexityRules(cefrLevel);

        if (await this.isLiveMode()) {
            try {
                const sys = `Sen uzman bir İngilizce-Türkçe dil koçusun. Kullanıcının İngilizce seviyesi "${cefrLevel}" (CEFR) ve seçtiği senaryo "${scenario}".
ZORUNLU SEVİYE KURALI: ${levelRule}
Bu kurala birebir uyarak doğal, birbirinden farklı 10 adet Türkçe cümle üreteceksin. Kullanıcı bu Türkçe cümleleri İngilizceye çevirecek.
JSON formatında yanıt ver:
{
  "sentences": [
    {
      "index": 1,
      "turkish": "Türkçe cümle",
      "targetTerms": ["hedef_kelime_veya_kalip"],
      "hint": "Kısa ipucu: Hangi anlamda kullanıldığı",
      "grammarTip": "Çok kısa ve anlaşılır gramer ipucu",
      "starterWords": "Cümleye başlarken ilk 2 kelime...",
      "referenceEnglish": "İdeal İngilizce karşılığı"
    }
  ]
}`;
                const termSummary = allTargets.map(t => `- "${t.term}" (${t.partOfSpeech}): ${(t.meanings || []).map(m => m.tr).join(" / ")}`).join("\n");
                const avoidNote = excludeTurkish.length > 0
                    ? `\nKesinlikle şu cümleleri tekrar etme:\n${excludeTurkish.slice(-8).map(s => `- ${s}`).join("\n")}`
                    : "";
                const prompt = `Kullanıcı Seviyesi: ${cefrLevel}
Senaryo / Konu: ${scenario}
Hedeflenen kelime ve kalıplar:
${termSummary}

Lütfen ${cefrLevel} seviyesinin kelime uzunluğu sınırına KESİNLİKLE uyarak 10 adet Türkçe cümle üret.${avoidNote}`;

                const res = await this.callGeminiJSON(sys, prompt);
                if (res && Array.isArray(res.sentences) && res.sentences.length > 0) {
                    return { mode: "live", sentences: res.sentences.slice(0, 10) };
                }
            } catch (err) {
                console.warn("Gemini canlı üretim başarısız oldu, Dinamik Yerel Cümle Motoruna geçiliyor:", err.message);
            }
        }

        // Dinamik Yerel Cümle Motoru (Seviyeye göre A1/A2 kısa cümleler veya B1/B2 cümleler üretir)
        return {
            mode: "demo",
            sentences: this.buildMockArenaSentences(words, phrases, scenario, cefrLevel, excludeTurkish)
        };
    }

    // Tekil "🔄 Başka Cümle Öner" Üreticisi (Mevcut ve önceki cümlelerden farklı tek bir yeni cümle getirir)
    async generateSingleAlternativeSentence(words, phrases, scenario = "Günlük Hayat", cefrLevel = "B1", excludedTurkishList = []) {
        const allTargets = [...words, ...phrases];
        const levelRule = this.getLevelComplexityRules(cefrLevel);

        if (await this.isLiveMode()) {
            try {
                const sys = `Sen uzman bir İngilizce-Türkçe dil koçusun. Kullanıcı mevcut cümleyi beğenmedi veya başka bir cümle örneği görmek istiyor.
Kullanıcının seviyesi "${cefrLevel}" (CEFR) ve seçtiği konu "${scenario}".
ZORUNLU SEVİYE KURALI: ${levelRule}
Önceki cümlelerden tamamen farklı, yepyeni bir Türkçe cümle ve çeviri ipuçları üret.
JSON formatında yanıt ver:
{
  "turkish": "Yeni Türkçe cümle",
  "targetTerms": ["hedef_kelime_veya_kalip"],
  "hint": "Kısa ipucu: hangi anlam ve zaman kullanıldığı",
  "grammarTip": "Kısa gramer / yapı ipucu",
  "starterWords": "Cümle başlangıcı ilk 2 kelime...",
  "referenceEnglish": "İdeal İngilizce karşılığı"
}`;
                const termSummary = allTargets.map(t => `- "${t.term}" (${t.partOfSpeech}): ${(t.meanings || []).map(m => m.tr).join(" / ")}`).join("\n");
                const avoidText = excludedTurkishList.slice(-12).map(s => `- "${s}"`).join("\n");
                const prompt = `Kullanıcı Seviyesi: ${cefrLevel}
Konu / Senaryo: ${scenario}
Hedef kelime/kalıplar:
${termSummary}

Şu daha önce gösterilen cümlelerden FARKLI yeni bir cümle üret:
${avoidText || "(Yok)"}`;

                const res = await this.callGeminiJSON(sys, prompt);
                if (res && res.turkish && res.referenceEnglish) {
                    return { mode: "live", sentence: res };
                }
            } catch (err) {
                console.warn("Alternatif cümle canlı üretim hatası, yerel alternatif seçiliyor:", err.message);
            }
        }

        const candidates = this.buildMockArenaSentences(words, phrases, scenario, cefrLevel, excludedTurkishList);
        return {
            mode: "demo",
            sentence: candidates[0]
        };
    }

    // "🐣 Basitleştir (Kolay Cümle)" — Mevcut cümleyi 4-5 kelimelik çok basit bir A1 cümlesine çevirir
    async simplifySentence(currentSentenceObj, words = [], phrases = []) {
        const targetTerms = currentSentenceObj?.targetTerms || [];
        const allItems = [...words, ...phrases, ...(typeof DEFAULT_WORDS !== "undefined" ? DEFAULT_WORDS : [])];
        const matchedItem = allItems.find(x => targetTerms.some(t => t.toLowerCase() === x.term.toLowerCase()));

        if (await this.isLiveMode()) {
            try {
                const sys = `Sen başlangıç seviyesi (A1) İngilizce öğretmenisin. Kullanıcı verilen Türkçe cümleyi çok zor buldu.
Aynı anlamı veya aynı hedef kelimeyi kullanarak EN FAZLA 4-5 KELİMELİK, çocukların bile kolayca çevirebileceği çok basit bir Türkçe cümle ve İngilizce karşılığını yaz.
JSON formatında yanıt ver:
{
  "turkish": "Çok basit 4-5 kelimelik Türkçe cümle",
  "targetTerms": ["hedef_kelime"],
  "hint": "Çok basit ipucu",
  "grammarTip": "Örn: Sadece Özne + Fiil + Nesne (I + verb + noun)",
  "starterWords": "İlk 2 kelime...",
  "referenceEnglish": "4-5 kelimelik basit İngilizce cümle"
}`;
                const prompt = `Zor bulunan cümle: "${currentSentenceObj?.turkish || ""}"
Hedef kelime(ler): ${targetTerms.join(", ") || (matchedItem?.term || "work")}.
Lütfen bunu 4-5 kelimelik süper basit A1 seviyesine indir.`;
                const res = await this.callGeminiJSON(sys, prompt);
                if (res && res.turkish && res.referenceEnglish) {
                    return { mode: "live", sentence: res };
                }
            } catch (err) {
                console.warn("Basitleştirme API hatası, yerel basit cümleye geçiliyor:", err.message);
            }
        }

        // Yerel 4-5 kelimelik A1 basit cümle üreteci
        const simpleA1Bank = this.getSimpleA1A2Pool("Günlük Hayat", "A1");
        if (matchedItem) {
            const shortExample = (matchedItem.meanings || []).find(m => m.example && m.example.split(/\s+/).length <= 7);
            if (shortExample && shortExample.exampleTr !== currentSentenceObj?.turkish) {
                return {
                    mode: "demo",
                    sentence: {
                        turkish: shortExample.exampleTr,
                        targetTerms: [matchedItem.term],
                        hint: `Basitleştirildi! "${matchedItem.term}" = ${shortExample.tr}`,
                        grammarTip: "Basit A1 Yapısı: Özne + Fiil + Nesne.",
                        starterWords: shortExample.example.split(/\s+/).slice(0, 2).join(" ") + "...",
                        referenceEnglish: shortExample.example
                    }
                };
            }
        }

        const picked = simpleA1Bank.find(s => s.turkish !== currentSentenceObj?.turkish) || simpleA1Bank[0];
        return {
            mode: "demo",
            sentence: {
                ...picked,
                starterWords: picked.referenceEnglish.split(/\s+/).slice(0, 2).join(" ") + "..."
            }
        };
    }

    getSimpleA1A2Pool(scenario = "Günlük Hayat", cefrLevel = "A1") {
        const isA1 = (cefrLevel || "").toUpperCase().includes("A1");
        const a1Pool = [
            { turkish: "Her sabah beş kilometre koşarım.", targetTerms: ["run"], hint: `"run" = koşmak`, grammarTip: "Geniş zaman: I + run...", referenceEnglish: "I run five kilometers every morning." },
            { turkish: "Her gün üç yeni kelime öğrenirim.", targetTerms: ["learn"], hint: `"learn" = öğrenmek`, grammarTip: "Geniş zaman: I + learn...", referenceEnglish: "I learn three new words every day." },
            { turkish: "Her gün bir ofiste çalışırım.", targetTerms: ["work"], hint: `"work" = çalışmak`, grammarTip: "Geniş zaman: I work at...", referenceEnglish: "I work at an office every day." },
            { turkish: "Bu görevde bana yardım edebilir misin?", targetTerms: ["help"], hint: `"help" = yardım etmek`, grammarTip: "Soru cümlesi: Can you help...", referenceEnglish: "Can you help me with this task?" },
            { turkish: "Lütfen cevaplarını dikkatlice kontrol et.", targetTerms: ["check"], hint: `"check" = kontrol etmek`, grammarTip: "Emir cümlesi: Please check...", referenceEnglish: "Please check your answers carefully." },
            { turkish: "Her sabah saat yedide uyanırım.", targetTerms: ["wake up"], hint: `"wake up" = uyanmak`, grammarTip: "Saatlerden önce 'at' kullanılır.", referenceEnglish: "I wake up at seven every morning." },
            { turkish: "Telefonumu arıyorum.", targetTerms: ["look for"], hint: `"look for" = aramak`, grammarTip: "Şimdiki zaman: I am looking for...", referenceEnglish: "I am looking for my phone." },
            { turkish: "Bir fincan çaya ihtiyacım var.", targetTerms: ["need"], hint: `"need" = ihtiyacı olmak`, grammarTip: "Basit cümle: I need...", referenceEnglish: "I need a cup of tea." },
            { turkish: "Lütfen pencereyi kapat.", targetTerms: ["close"], hint: `"close" = kapatmak`, grammarTip: "Emir kipi: Close the...", referenceEnglish: "Close the window, please." },
            { turkish: "Lütfen ışığı aç.", targetTerms: ["turn on"], hint: `"turn on" = açmak (cihaz/ışık)`, grammarTip: "Emir kipi: Turn on the...", referenceEnglish: "Turn on the light, please." },
            { turkish: "Bugün bir kahve almak istiyorum.", targetTerms: ["buy"], hint: `"buy" = satın almak`, grammarTip: "I want to + fiil", referenceEnglish: "I want to buy a coffee." },
            { turkish: "Trenle seyahat etmeyi severim.", targetTerms: ["travel"], hint: `"travel" = seyahat etmek`, grammarTip: "I love to + fiil", referenceEnglish: "I love to travel by train." },
            { turkish: "Lütfen bu kelimeyi açıkla.", targetTerms: ["explain"], hint: `"explain" = açıklamak`, grammarTip: "Please + fiil", referenceEnglish: "Please explain this word." },
            { turkish: "Şimdi ücretsiz bir hesap oluştur.", targetTerms: ["create"], hint: `"create" = oluşturmak`, grammarTip: "Emir kipi: Create a...", referenceEnglish: "Create a free account now." },
            { turkish: "Her gece İngilizce çalışırım.", targetTerms: ["study"], hint: `"study" = ders çalışmak`, grammarTip: "Geniş zaman: I study...", referenceEnglish: "I study English every night." },
            { turkish: "Lütfen mesajıma cevap ver.", targetTerms: ["answer"], hint: `"answer" = cevap vermek`, grammarTip: "Please answer...", referenceEnglish: "Please answer my message." }
        ];

        const a2Pool = [
            { turkish: "İngilizce çalışıyorum çünkü daha iyi bir iş istiyorum.", targetTerms: ["because"], hint: `"because" = çünkü`, grammarTip: "İki basit cümleyi 'because' ile bağla.", referenceEnglish: "I study English because I want a better job." },
            { turkish: "Yorgundum, bu yüzden erken uyudum.", targetTerms: ["so"], hint: `"so" = bu yüzden`, grammarTip: "Geçmiş zaman + so + geçmiş zaman", referenceEnglish: "I was tired, so I slept early." },
            { turkish: "Hayallerinden asla vazgeçme.", targetTerms: ["give up"], hint: `"give up" = vazgeçmek`, grammarTip: "Never + fiil", referenceEnglish: "Never give up on your dreams." },
            { turkish: "Notlarımızı ekiple paylaşırız.", targetTerms: ["share"], hint: `"share" = paylaşmak`, grammarTip: "We share...", referenceEnglish: "We share our notes with the team." },
            { turkish: "Çalışmanı sık sık kaydet.", targetTerms: ["save"], hint: `"save" = kaydetmek`, grammarTip: "Emir kipi: Save your...", referenceEnglish: "Save your work often." },
            { turkish: "Bugün tek bir göreve odaklan.", targetTerms: ["focus"], hint: `"focus" = odaklanmak`, grammarTip: "focus + on + nesne", referenceEnglish: "Focus on one task today." },
            { turkish: "Çayı kahveye tercih ederim.", targetTerms: ["prefer"], hint: `"prefer" = tercih etmek`, grammarTip: "prefer A to B", referenceEnglish: "I prefer tea to coffee." },
            { turkish: "Yeni kelimeleri bir yere not al.", targetTerms: ["write down"], hint: `"write down" = not almak`, grammarTip: "Write down + nesne", referenceEnglish: "Write down the new words." }
        ];

        return isA1 ? a1Pool : [...a1Pool, ...a2Pool];
    }

    buildMockArenaSentences(words, phrases, scenario = "Günlük Hayat", cefrLevel = "B1", excludeTurkish = []) {
        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
        const makeStarter = (ref) => {
            const parts = (ref || "").split(/\s+/).filter(Boolean);
            return parts.slice(0, Math.min(2, parts.length)).join(" ") + "...";
        };

        const lvlUpper = (cefrLevel || "B1").toUpperCase();
        const isBeginner = lvlUpper.includes("A1") || lvlUpper.includes("A2");
        const maxWordCount = lvlUpper.includes("A1") ? 7 : (lvlUpper.includes("A2") ? 9 : 30);

        const defaultWordsPool = typeof DEFAULT_WORDS !== "undefined" ? DEFAULT_WORDS : [];
        const oxPack = typeof OXFORD_EXTENDED_PACK !== "undefined" ? OXFORD_EXTENDED_PACK : [];
        const w = words && words.length > 0 ? words : defaultWordsPool.filter(x => x.category === "word").slice(0, 3);
        const p = phrases && phrases.length > 0 ? phrases : defaultWordsPool.filter(x => x.category === "phrase").slice(0, 3);
        const allSourceItems = [...w, ...p];

        const candidates = [];
        const seenTurkish = new Set();
        const addCandidate = (obj) => {
            const key = (obj.turkish || "").trim();
            if (!key || seenTurkish.has(key)) return;
            // A1 / A2 seçildiyse uzun veya noktalı virgüllü karmaşık cümleleri kesinlikle alma!
            const engWords = (obj.referenceEnglish || "").split(/\s+/).filter(Boolean).length;
            if (isBeginner && (engWords > maxWordCount || key.includes(";"))) return;

            seenTurkish.add(key);
            candidates.push({
                starterWords: obj.starterWords || makeStarter(obj.referenceEnglish),
                ...obj
            });
        };

        // 1. A1/A2 seçildiyse öncelikle Süper Basit A1/A2 havuzunu ve Oxford paketindeki kısa cümleleri ekle
        if (isBeginner) {
            this.getSimpleA1A2Pool(scenario, cefrLevel).forEach(addCandidate);
            oxPack.filter(x => (lvlUpper.includes("A1") ? x.cefr === "A1" : (x.cefr === "A1" || x.cefr === "A2")) && x.ex1 && x.exTr1)
                .forEach(item => {
                    addCandidate({
                        turkish: item.exTr1,
                        targetTerms: [item.term],
                        hint: `"${item.term}" = ${item.tr1}`,
                        grammarTip: `Basit ${cefrLevel} Yapısı: Kısa ve düz cümle kurun.`,
                        referenceEnglish: item.ex1
                    });
                });
        }

        // 2. Seçilen kelimelerin ve kalıpların kısa/uygun örnek cümlelerini havuza ekle
        allSourceItems.forEach(item => {
            (item.meanings || []).forEach((m, mIdx) => {
                if (m.exampleTr && m.example && !m.exampleTr.includes("örnek cümle")) {
                    addCandidate({
                        turkish: m.exampleTr,
                        targetTerms: [item.term],
                        hint: `"${item.term}" ifadesini "${m.tr}" (${m.context || `${mIdx + 1}. Anlam`}) anlamında kullanın.`,
                        grammarTip: `Seviye ${cefrLevel} • ${m.context || "Bağlam"}: "${item.term}" (${item.partOfSpeech}) yapısının cümledeki yerine dikkat edin.`,
                        referenceEnglish: m.example
                    });
                }
            });
        });

        // 2. Konu/Senaryo Bazlı Zengin ve Gramer Açısından Kusursuz Cümle Havuzu
        const scenarioBanks = {
            "Günlük Hayat": [
                {
                    turkish: `Hafta sonu arkadaşlarımla buluşmadan önce haftalık işlerimi tamamlamam gerekiyor.`,
                    targetTerms: ["catch up"],
                    hint: `"catch up" (yetişmek, eksikleri kapatmak) ifadesini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "before + V-ing" (buluşmadan önce) yapısını kullanabilirsiniz.`,
                    referenceEnglish: `I need to catch up on my weekly tasks before meeting my friends this weekend.`
                },
                {
                    turkish: `Yeni bir dil öğrenmek sabır ister; öte yandan düzenli pratik yaptığınızda süreç çok keyifli hale gelir.`,
                    targetTerms: ["on the other hand"],
                    hint: `Zıtlık/denge bağlacı olan "on the other hand" yapısını kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: İki bağımsız cümleyi noktalı virgül ve bağlaç ile bağlayın.`,
                    referenceEnglish: `Learning a new language requires patience; on the other hand, it becomes very enjoyable when you practice regularly.`
                },
                {
                    turkish: `Yoğun bir programa rağmen her akşam yirmi dakika kitap okumaya özen gösteriyorum.`,
                    targetTerms: ["in spite of"],
                    hint: `"...e rağmen" anlamındaki "in spite of" veya "despite" bağlacını kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "in spite of" sonrasında isim veya V-ing gelir.`,
                    referenceEnglish: `I make sure to read a book for twenty minutes every evening in spite of my busy schedule.`
                }
            ],
            "İş/Profesyonel": [
                {
                    turkish: `Müşteri memnuniyetini korumak için gelen geri bildirimleri gecikmeden ele almalıyız.`,
                    targetTerms: ["maintain", "address"],
                    hint: `"maintain" (korumak) ve "address" (ele almak, çözüm aramak) fiillerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "In order to + V1" amaç cümlesi ve "must/should" gereklilik kipini kullanın.`,
                    referenceEnglish: `In order to maintain customer satisfaction, we must address the incoming feedback without delay.`
                },
                {
                    turkish: `Yeni pazarlama kampanyamızın bütçesini hesaba katmazsak beklenmedik maliyetlerle karşılaşabiliriz.`,
                    targetTerms: ["take into account", "encounter"],
                    hint: `"take into account" (hesaba katmak) ve "encounter" (karşılaşmak) ifadelerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: Koşul cümlesi (If + Present Simple, may/might + V1) kurabilirsiniz.`,
                    referenceEnglish: `If we do not take the budget of our new marketing campaign into account, we may encounter unexpected costs.`
                },
                {
                    turkish: `Ekibimiz sıkı teslim tarihlerine rağmen projeyi zamanında teslim etmek için harika bir çözüm buldu.`,
                    targetTerms: ["deliver", "come up with"],
                    hint: `"deliver" (teslim etmek/sonuç üretmek) ve "come up with" (çözüm/fikir bulmak) ifadelerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "despite + noun phrase" ile cümleye başlayabilirsiniz.`,
                    referenceEnglish: `Despite tight deadlines, our team came up with a great solution to deliver the project on time.`
                }
            ],
            "Teknik/Yazılım": [
                {
                    turkish: `Kullanıcı verilerini korumak için uygulamayı yayınlamadan önce tüm testleri çalıştırmalıyız.`,
                    targetTerms: ["run"],
                    hint: `Teknik anlamda "çalıştırmak" için "run" fiilini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "before + V-ing" (before deploying) yapısını kullanabilirsiniz.`,
                    referenceEnglish: `To protect user data, we must run all the tests before deploying the application.`
                },
                {
                    turkish: `Veritabanındaki performans sorununu tespit edip bir saat içinde çözdük.`,
                    targetTerms: ["spot", "resolve"],
                    hint: `"spot" (tespit etmek/fark etmek) ve "resolve" (çözmek) fiillerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: Geçmiş zaman (Past Simple) ile iki eylemi "and" ile bağlayın.`,
                    referenceEnglish: `We spotted the performance issue in the database and resolved it within an hour.`
                },
                {
                    turkish: `İlerlemenizi düzenli olarak yedeklediğiniz sürece cihaz değiştirseniz bile verilerinizi kaybetmezsiniz.`,
                    targetTerms: ["back up", "as long as"],
                    hint: `"back up" (yedeklemek) ve "as long as" (...dığı sürece) ifadelerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: Şart bağlacı "as long as" sonrası Geniş Zaman (Present Simple) alır.`,
                    referenceEnglish: `As long as you back up your progress regularly, you will not lose your data even if you switch devices.`
                }
            ],
            "Seyahat & Kültür": [
                {
                    turkish: `Yeni bir ülkeye seyahat ettiğinizde yerel gelenekleri göz önünde bulundurmak önemlidir.`,
                    targetTerms: ["take into account"],
                    hint: `"take into account" (göz önünde bulundurmak) kalıbını kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "It is important to + V1" yapısını deneyin.`,
                    referenceEnglish: `When traveling to a new country, it is important to take local traditions into account.`
                },
                {
                    turkish: `Havaalanındaki yönlendirme tabelaları sayesinde çıkış kapımızı kolayca bulabildik.`,
                    targetTerms: ["figure out"],
                    hint: `"figure out" (çözmek, anlamak, bulmak) phrasal verb'ünü kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "Thanks to + isim" ve "were able to + V1" kullanın.`,
                    referenceEnglish: `Thanks to the direction signs at the airport, we were able to figure out our departure gate easily.`
                },
                {
                    turkish: `Farklı kültürlerden insanlarla sohbet etmek dünya görüşümüzü hızla genişletir.`,
                    targetTerms: ["diverse", "expand"],
                    hint: `"diverse" (çeşitli/farklı) ve "expand" (genişletmek) kelimelerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: Cümle öznesi olarak "-ing" (Gerund: Talking with...) kullanın.`,
                    referenceEnglish: `Talking with people from diverse cultures rapidly expands our worldview.`
                }
            ],
            "Akademik & Tartışma": [
                {
                    turkish: `Araştırmacılar, toplanan verilerin doğruluğunu ölçmek için kapsamlı testler gerçekleştirdi.`,
                    targetTerms: ["carry out", "accurate"],
                    hint: `"carry out" (yürütmek/gerçekleştirmek) ve "accurate" (doğru/kesin) ifadelerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: "in order to + V1" ve geçmiş zaman (Past Simple) kullanın.`,
                    referenceEnglish: `Researchers carried out extensive tests in order to ensure the collected data was accurate.`
                },
                {
                    turkish: `Yapay zeka öğrenme hızını artırır; öte yandan eleştirel düşünme becerimizi de korumamız gerekir.`,
                    targetTerms: ["on the other hand", "retain"],
                    hint: `"on the other hand" (öte yandan) ve "retain" (korumak/muhafaza etmek) ifadelerini kullanın.`,
                    grammarTip: `Seviye ${cefrLevel}: Zıtlık bağlacından sonra gereklilik kipi (need to / must) kullanın.`,
                    referenceEnglish: `Artificial intelligence increases learning speed; on the other hand, we also need to retain our critical thinking skills.`
                }
            ]
        };

        // Seçili senaryo cümlelerini ekle (Karışık Konular ise hepsinden karma al)
        if (scenario === "Karışık Konular" || !scenarioBanks[scenario]) {
            Object.values(scenarioBanks).forEach(list => list.forEach(addCandidate));
        } else {
            scenarioBanks[scenario].forEach(addCandidate);
            // Çeşitlilik için diğer senaryolardan da destek ekle
            Object.entries(scenarioBanks).forEach(([scName, list]) => {
                if (scName !== scenario) list.slice(0, 1).forEach(addCandidate);
            });
        }

        // Havuzdaki diğer kelimelerden de yedek cümleler ekle ki "Başka Cümle Öner" her zaman taze cümle verebilsin
        shuffle(defaultWordsPool).slice(0, 8).forEach(dw => {
            (dw.meanings || []).forEach(m => {
                if (m.exampleTr && m.example) {
                    addCandidate({
                        turkish: m.exampleTr,
                        targetTerms: [dw.term],
                        hint: `"${dw.term}" (${m.tr}) ifadesini kullanın.`,
                        grammarTip: `Seviye ${cefrLevel} • Bağlam (${m.context || "Genel"}): Özne-Yüklem uyumuna dikkat edin.`,
                        referenceEnglish: m.example
                    });
                }
            });
        });

        const excludeSet = new Set(excludeTurkish || []);
        const freshCandidates = shuffle(candidates.filter(c => !excludeSet.has(c.turkish)));
        const fallbackCandidates = shuffle(candidates.filter(c => excludeSet.has(c.turkish)));
        const finalPool = [...freshCandidates, ...fallbackCandidates].slice(0, 10);

        return finalPool.map((item, idx) => ({
            index: idx + 1,
            ...item
        }));
    }

    // 2. Aşama 3: 3 Katmanlı Çeviri Değerlendirmesi (Samimi, Esnek ve Seviye Dostu)
    async evaluateTranslation(turkishSentence, userEnglish, targetTerms = [], referenceEnglish = "", scenario = "Günlük Hayat", cefrLevel = "B1") {
        if (await this.isLiveMode()) {
            try {
                const sys = `Sen sabırlı, sıcakkanlı ve pratik bir İngilizce öğretmenisin. Kullanıcının seviyesi "${cefrLevel}" (CEFR).
ÇOK ÖNEMLİ KURALLAR (BUNLARA KESİNLİKLE UY):
1. Büyük/küçük harf hatalarından (ör. sunday / Sunday), noktalama eksikliğinden veya bitişik/ayrı yazım gibi ufak yazım detaylarından (ör. everyday / every day) KESİNLİKLE puan kırma ve bunları hata olarak eleştirme!
2. "Zaman zarfı, sıfat, edat tümleci" gibi ağır akademik dilbilgisi terimleri KULLANMA. Kısa, samimi ve anlaşılır cümlelerle (en fazla 1-2 cümle) anlat.
3. Cümlenin anlamı anlaşılıyorsa yüksek puan ver (80-100). Sadece kelimenin kendisi yanlışsa (ör. except yerine expect yazılmışsa) "expect yerine except (hariç) kullanmalısın" diye tek cümlede nazikçe belirt.
4. "nativeTouch" ve "alternativeVersion" alanlarında KESİNLİKLE resmi, ağır veya uzun cümleler (ör. "I am employed six days a week...") önerme! Kullanıcının seviyesine (${cefrLevel}) uygun, günlük konuşmada gerçekten kullanılan basit, kısa ve samimi bir alternatif ver (ör. "I work every day but Sunday." veya "I don't work on Sundays.").

JSON formatında yanıt ver:
{
  "score": 0-100 arası tam sayı,
  "grammarFeedback": "1. Katman: Kısa, motive edici ve anlaşılır 1-2 cümlelik değerlendirme (ağır terimler yok, küçük harf/noktalama eleştirisi yok)",
  "correctedSentence": "En basit ve doğal düzeltilmiş hali",
  "nativeTouch": "2. Katman: Günlük hayatta ana dili İngilizce olan birinin bunu nasıl kısa ve basitçe söyleyeceği (1 cümle)",
  "alternativeVersion": "3. Katman: Aynı seviyede (${cefrLevel}) çok basit ve akılda kalıcı alternatif bir cümle",
  "missedTargets": ["yalnızca anlamı tamamen bozan yanlış/eksik hedef kelimeler (varsa)"]
}`;
                const prompt = `Kullanıcı Seviyesi: ${cefrLevel}
Senaryo: ${scenario}
Türkçe Cümle: "${turkishSentence}"
Hedef Kelimeler: ${targetTerms.join(", ")}
Referans Örnek: "${referenceEnglish}"
Kullanıcının Yazdığı: "${userEnglish}"

Lütfen kullanıcıyı yormadan, kısa ve seviye dostu (${cefrLevel}) JSON geri bildirimi ver.`;

                const res = await this.callGeminiJSON(sys, prompt);
                if (res && typeof res.score === "number") {
                    return { mode: "live", ...res };
                }
            } catch (err) {
                console.warn("Gemini değerlendirme hatası, Demo değerlendiriciye geçiliyor:", err.message);
            }
        }

        // Akıllı Demo / Mock Değerlendirici
        return this.mockEvaluateTranslation(turkishSentence, userEnglish, targetTerms, referenceEnglish, scenario, cefrLevel);
    }

    mockEvaluateTranslation(turkishSentence, userEnglish, targetTerms, referenceEnglish, scenario, cefrLevel = "B1") {
        const cleanUser = (userEnglish || "").trim().toLowerCase();
        const missedTargets = [];

        for (const term of targetTerms) {
            const root = term.toLowerCase().split(" ")[0];
            if (!cleanUser.includes(root)) {
                missedTargets.push(term);
            }
        }

        const wordCount = cleanUser.split(/\s+/).filter(Boolean).length;
        let score = 88;
        if (wordCount < 2) score = 40;
        else if (missedTargets.length > 0) score = Math.max(55, 88 - missedTargets.length * 20);
        else if (cleanUser === referenceEnglish.toLowerCase().replace(/[.!?]+$/, "")) score = 98;

        const grammarFeedback = missedTargets.length === 0
            ? `Süpersin! Hedef ifadeyi (${targetTerms.join(", ")}) cümlede doğru kullandın, anlam tamamen net.`
            : `Anlam anlaşılıyor! Sadece hedef kelimemiz olan "${missedTargets.join(", ")}" ifadesini kullanmayı unutma: "${referenceEnglish}"`;

        const nativeTouch = `Günlük konuşmada en doğal ve kısa söylenişi: "${referenceEnglish}"`;
        const alternativeVersion = `Basit Alternatif (${cefrLevel}): "${referenceEnglish}"`;

        return {
            mode: "demo",
            score,
            grammarFeedback,
            correctedSentence: referenceEnglish,
            nativeTouch,
            alternativeVersion,
            missedTargets
        };
    }

    // 3. Aşama 4: Gün Sonu Hikayesi (Boss Battle) Üretimi ve Değerlendirmesi
    async generateBossStory(words, phrases, cefrLevel = "B1") {
        const allTerms = [...words, ...phrases];

        if (await this.isLiveMode()) {
            try {
                const sys = `Sen yaratıcı bir İngilizce hikaye anlatıcısısın. Kullanıcının İngilizce seviyesi "${cefrLevel}". Verilen 3 kelime ve 3 kalıbın tamamını içeren, "${cefrLevel}" seviyesine uygun 3-4 cümlelik akıcı ve anlamlı bir İngilizce paragraf yaz.
JSON formatı:
{
  "title": "Kısa Hikaye Başlığı",
  "englishStory": "3-4 cümlelik İngilizce paragraf (hedef kelimeler doğal şekilde geçsin)",
  "referenceTurkish": "Paragrafın ideal ve akıcı Türkçe çevirisi"
}`;
                const listStr = allTerms.map(t => `${t.term} (${t.meanings[0].tr})`).join(", ");
                const prompt = `Seviye: ${cefrLevel}
Günün kelimeleri ve kalıpları: ${listStr}.
Lütfen bunların hepsini 3-4 cümlelik tek bir kısa İngilizce paragrafta birleştir.`;

                const res = await this.callGeminiJSON(sys, prompt);
                if (res && res.englishStory) {
                    return { mode: "live", ...res };
                }
            } catch (err) {
                console.warn("Boss story canlı üretim hatası, Demo hikayeye geçiliyor:", err.message);
            }
        }

        const w0 = words[0]?.term || "run";
        const w1 = words[1]?.term || "address";
        const w2 = words[2]?.term || "deliver";
        const p0 = phrases[0]?.term || "figure out";
        const p1 = phrases[1]?.term || "on the other hand";
        const p2 = phrases[2]?.term || "as long as";

        return {
            mode: "demo",
            title: "The Release Day Challenge",
            englishStory: `When you ${w0} an ambitious project, you must quickly ${p0} how to ${w1} unexpected technical obstacles. Tight deadlines can be stressful; ${p1}, they motivate the whole team to stay focused. Our engineers will always ${w2} great results ${p2} everyone collaborates openly.`,
            referenceTurkish: `İddialı bir projeyi yönettiğinizde, beklenmedik teknik engelleri nasıl ele alacağınızı hızla çözmelisiniz. Sıkı teslim tarihleri stresli olabilir; öte yandan tüm ekibi odaklanmaya motive eder. Herkes açıkça işbirliği yaptığı sürece mühendislerimiz her zaman harika sonuçlar üretecektir.`
        };
    }

    async evaluateBossStory(englishStory, referenceTurkish, userTurkish) {
        if (await this.isLiveMode()) {
            try {
                const sys = `Kullanıcının İngilizce Boss Battle paragrafına yaptığı Türkçe çeviriyi değerlendir.
JSON formatı:
{
  "score": 0-100 arası puan,
  "feedback": "Detaylı Türkçe değerlendirme, doğru yakalanan nüanslar ve varsa eksik kalan kısımlar",
  "idealTranslation": "İdeal Türkçe çeviri"
}`;
                const prompt = `İngilizce Hikaye: "${englishStory}"
Referans Türkçe: "${referenceTurkish}"
Kullanıcının Türkçe Çevirisi: "${userTurkish}"`;

                const res = await this.callGeminiJSON(sys, prompt);
                if (res && typeof res.score === "number") {
                    return { mode: "live", ...res };
                }
            } catch (err) {
                console.warn("Boss story değerlendirme hatası, Demo değerlendirmeye geçiliyor:", err.message);
            }
        }

        const clean = (userTurkish || "").trim();
        const wordCount = clean.split(/\s+/).filter(Boolean).length;
        const score = wordCount >= 10 ? 92 : (wordCount >= 4 ? 65 : 30);

        return {
            mode: "demo",
            score,
            feedback: score >= 70
                ? "Tebrikler! Paragraftaki hem çok anlamlı kelimeleri hem de bağlaç geçişlerini Türkçeye oldukça doğal ve bütünlüklü bir şekilde aktardın."
                : "Çevirin biraz kısa kaldı. Paragraftaki tüm cümleleri ve bağlaç nüanslarını eksiksiz aktardığından emin ol.",
            idealTranslation: referenceTurkish
        };
    }

    // 4. Manuel Kelime / Phrasal Verb / Bağlaç Ekleme: "AI ile Doldur" (Gerçek Anlamlar + Ücretsiz Sözlük Fallback)
    async autofillWordDetails(termInput) {
        const cleanTerm = (termInput || "").trim().toLowerCase();
        if (!cleanTerm) throw new Error("Lütfen önce bir İngilizce kelime, phrasal verb veya bağlaç yazın.");

        // 1. Öncelik: Gemini API Key girilmişse doğrudan Gemini'den 4 zengin Türkçe anlam ve örnek cümle al
        if (await this.isLiveMode()) {
            try {
                const sys = `Sen kapsamlı bir İngilizce-Türkçe sözlük motorusun. Girilen İngilizce kelime, phrasal verb veya bağlacın farklı bağlamlardaki en önemli 3 veya 4 GERÇEK Türkçe anlamını (birincil anlam + 2-3 yan anlam), kelime türünü, CEFR seviyesini ve doğal örnek cümlelerini JSON olarak döndür:
{
  "term": "kelime veya kalıp",
  "category": "word (tek kelime ise) veya phrase (phrasal verb, bağlaç, deyim, kalıp ise)",
  "partOfSpeech": "verb / noun / adjective / phrasal verb / connector / idiom",
  "cefr": "A1 / A2 / B1 / B2 / C1",
  "meanings": [
    {
      "tr": "Gerçek Türkçe anlamı (örn: boş, yazısız / boşluk / ifadesiz)",
      "context": "Hangi bağlamda kullanıldığı (ör. Günlük Hayat, İş & Yönetim, Teknik/Yazılım, Mecazi/Deyimsel)",
      "example": "İngilizce örnek cümle",
      "exampleTr": "Örnek cümlenin Türkçe çevirisi"
    }
  ]
}`;
                const prompt = `İngilizce ifade: "${cleanTerm}". Lütfen bu ifadenin gerçek Türkçe anlamlarını, 3-4 farklı bağlamdaki yan anlamlarını ve örnek cümlelerini JSON olarak üret.`;
                const res = await this.callGeminiJSON(sys, prompt);
                if (res && Array.isArray(res.meanings) && res.meanings.length > 0) {
                    return res;
                }
            } catch (err) {
                console.warn("Gemini kelime doldurma hatası, çevrimiçi sözlük/çeviri servisine geçiliyor:", err.message);
            }
        }

        // 2. Öncelik: Gemini API Key yoksa veya hata verdiyse, asla "1. Birincil Anlam" gibi sahte (placeholder) yazı döndürme!
        // Doğrudan yerleşik sözlük + ücretsiz DictionaryAPI & Çeviri servisinden gerçek Türkçe anlamlarını çek.
        return await this.fetchRealDictionaryFallback(cleanTerm);
    }

    async fetchRealDictionaryFallback(cleanTerm) {
        // Sık eklenen kelimeler için zengin yerleşik çoklu anlam sözlüğü (ör. blank vb.)
        const builtinRichDict = {
            "blank": {
                category: "word",
                partOfSpeech: "adjective / noun / verb",
                cefr: "A2",
                meanings: [
                    { tr: "boş, doldurulmamış, yazısız (kağıt, sayfa, alan)", context: "Günlük / Belge", example: "Please sign your name in the blank space at the bottom.", exampleTr: "Lütfen alttaki boş alana adınızı imzalayın." },
                    { tr: "boşluk, doldurulacak kutucuk (form/sınav)", context: "Eğitim / Teknik", example: "Fill in the blanks with the correct phrasal verbs.", exampleTr: "Boşlukları doğru phrasal verb'lerle doldurun." },
                    { tr: "ifadesiz, tepkisiz, boş bakan (yüz/bakış)", context: "Duygu / İletişim", example: "She gave me a blank look when I asked about the server crash.", exampleTr: "Sunucu çökmesi hakkında soru sorduğumda bana boş/ifadesiz bir bakış attı." },
                    { tr: "aklının durması, bir anlığına hiçbir şey hatırlayamamak (go blank)", context: "Deyimsel / Zihin", example: "My mind went completely blank during the job interview.", exampleTr: "İş görüşmesi sırasında zihnim tamamen durdu (hiçbir şey hatırlayamadım)." }
                ]
            }
        };

        if (builtinRichDict[cleanTerm]) {
            return { term: cleanTerm, ...builtinRichDict[cleanTerm] };
        }

        const isPhrase = cleanTerm.includes(" ");
        const meanings = [];
        let detectedPos = isPhrase ? "phrasal verb / connector" : "word";

        try {
            // 1) MyMemory Ücretsiz Çeviri API'sinden gerçek Türkçe karşılıklarını çek
            const trRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanTerm)}&langpair=en|tr`);
            const trData = await trRes.json();
            const mainTr = trData?.responseData?.translatedText || "";
            const matches = Array.isArray(trData?.matches) ? trData.matches : [];

            // Farklı Türkçe çeviri alternatiflerini topla
            const distinctTranslations = [];
            if (mainTr && mainTr.toLowerCase() !== cleanTerm) {
                distinctTranslations.push(mainTr.toLowerCase());
            }
            for (const m of matches) {
                const t = (m.translation || "").trim().toLowerCase();
                if (t && t !== cleanTerm && !distinctTranslations.includes(t) && t.length < 60) {
                    distinctTranslations.push(t);
                }
            }

            // 2) Free Dictionary API'den İngilizce tanım, kelime türü ve gerçek örnek cümleleri çek
            let dictDefinitions = [];
            if (!isPhrase) {
                const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanTerm)}`);
                if (dictRes.ok) {
                    const dictJson = await dictRes.json();
                    const firstEntry = dictJson?.[0];
                    if (firstEntry?.meanings?.length > 0) {
                        detectedPos = firstEntry.meanings.map(m => m.partOfSpeech).slice(0, 2).join(" / ");
                        for (const mGroup of firstEntry.meanings) {
                            for (const defObj of (mGroup.definitions || []).slice(0, 2)) {
                                dictDefinitions.push({
                                    pos: mGroup.partOfSpeech,
                                    def: defObj.definition,
                                    example: defObj.example || `The word "${cleanTerm}" is used as a ${mGroup.partOfSpeech} in this context.`
                                });
                            }
                        }
                    }
                }
            }

            const count = Math.max(distinctTranslations.length, dictDefinitions.length, 1);
            for (let i = 0; i < Math.min(4, count); i++) {
                const defInfo = dictDefinitions[i] || dictDefinitions[0];
                let trText = distinctTranslations[i] || distinctTranslations[0] || "";

                // Eğer İngilizce tanım varsa onu da Türkçeye çevirip yan anlam olarak zenginleştir
                if (defInfo?.def && i > 0 && !distinctTranslations[i]) {
                    try {
                        const defTrRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(defInfo.def)}&langpair=en|tr`);
                        const defTrData = await defTrRes.json();
                        if (defTrData?.responseData?.translatedText) {
                            trText = defTrData.responseData.translatedText;
                        }
                    } catch (_) { }
                }

                const exEn = defInfo?.example || `We used "${cleanTerm}" to express this idea clearly.`;
                let exTr = "";
                try {
                    const exTrRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(exEn)}&langpair=en|tr`);
                    const exTrData = await exTrRes.json();
                    exTr = exTrData?.responseData?.translatedText || "";
                } catch (_) { }

                meanings.push({
                    tr: trText || cleanTerm,
                    context: defInfo?.pos ? `${defInfo.pos.toUpperCase()} Bağlamı` : `${i + 1}. Anlam`,
                    example: exEn,
                    exampleTr: exTr
                });
            }
        } catch (err) {
            console.warn("Çevrimiçi sözlük yedek servisi hatası:", err);
        }

        if (meanings.length === 0) {
            throw new Error("Kelimenin gerçek anlamlarını otomatik çekebilmek için lütfen sağ üstten Gemini API Key girin veya internet bağlantınızı kontrol edin.");
        }

        return {
            term: cleanTerm,
            category: isPhrase ? "phrase" : "word",
            partOfSpeech: detectedPos,
            cefr: "B1",
            meanings
        };
    }

    // 5. Mevcut Kelime veya Bağlaçlara Eksik 3-4 Yan Anlamı Otomatik Ekleme (AI Enrich)
    async enrichItemWithExtraMeanings(item) {
        const cleanTerm = (item.term || "").trim().toLowerCase();
        const existingList = (item.meanings || []).map(m => `${m.tr} (${m.context || "Genel"})`).join("; ");

        if (await this.isLiveMode()) {
            try {
                const sys = `Sen uzman bir İngilizce-Türkçe sözlük ve dilbilim motorusun. Verilen İngilizce kelime, phrasal verb veya bağlacın farklı bağlamlardaki GERÇEK Türkçe anlamlarını (birincil anlam + 3 yan anlam = toplam 4 anlam) örnek cümleleriyle JSON olarak döndür:
{
  "meanings": [
    {
      "tr": "Gerçek Türkçe anlamı",
      "context": "Bağlam (Günlük / İş / Teknik / Mecazi vb.)",
      "example": "Doğal İngilizce örnek cümle",
      "exampleTr": "Örnek cümlenin Türkçe çevirisi"
    }
  ]
}`;
                const prompt = `İfade: "${item.term}" (${item.partOfSpeech}, Seviye: ${item.cefr || "B1"}).
Mevcut Kayıtlı Anlamları: ${existingList}.
Lütfen varsa yer tutucu/eksik anlamları gerçek Türkçe anlamlarla değiştir ve bu ifadenin 4 farklı bağlamdaki gerçek anlamını örnek cümleleriyle üret.`;

                const res = await this.callGeminiJSON(sys, prompt);
                if (res && Array.isArray(res.meanings) && res.meanings.length >= 2) {
                    return res.meanings;
                }
            } catch (err) {
                console.warn("AI yan anlam zenginleştirme hatası, gerçek sözlük servisine geçiliyor:", err.message);
            }
        }

        const fallbackData = await this.fetchRealDictionaryFallback(cleanTerm);
        return fallbackData.meanings;
    }

    // 6. AI ile Toplu Kelime / Phrasal Verb / Bağlaç Paketi İndir & Üret (15+ Öğe)
    async generateBulkVocabularyPack(cefrLevel = "A1", categoryType = "word", topic = "Günlük Hayat", existingTerms = [], count = 15) {
        if (!(await this.isLiveMode())) {
            throw new Error("Yapay zeka ile özel kelime paketi üretmek için lütfen önce Ayarlar'dan Gemini API Key girin. Anahtarınız yoksa aynı penceredeki hazır A1/A2/Oxford paketlerini tek tıkla yükleyebilirsiniz.");
        }

        const catDesc = categoryType === "phrasal"
            ? "günlük ve iş hayatında sık kullanılan Phrasal Verb (eylem öbeği)"
            : (categoryType === "connector" ? "İngilizce bağlaç ve kalıp (connector/idiom)" : "en sık kullanılan temel İngilizce kelime (word)");
        const catField = categoryType === "word" ? "word" : "phrase";
        const posHint = categoryType === "phrasal" ? "phrasal verb" : (categoryType === "connector" ? "connector" : "verb / noun / adjective");

        const avoidList = existingTerms.slice(0, 60).join(", ");
        const sys = `Sen kapsamlı bir İngilizce-Türkçe müfredat uzmanısın. İstenen CEFR seviyesinde (${cefrLevel}) ve konuda (${topic}) ${count} adet ${catDesc} üret.
Her öğenin en az 2 gerçek Türkçe anlamı (birincil + yan anlam) ve kısa, anlaşılır örnek cümleleri olsun.
JSON formatında yanıt ver:
{
  "items": [
    {
      "term": "ingilizce ifade",
      "category": "${catField}",
      "partOfSpeech": "${posHint}",
      "cefr": "${cefrLevel}",
      "meanings": [
        {
          "tr": "1. Türkçe anlamı",
          "context": "Günlük / İş / Genel",
          "example": "Kısa ve net İngilizce örnek cümle",
          "exampleTr": "Örnek cümlenin Türkçe çevirisi"
        },
        {
          "tr": "2. Türkçe yan anlamı",
          "context": "Alternatif Bağlam",
          "example": "İkinci kısa İngilizce örnek cümle",
          "exampleTr": "Türkçe çevirisi"
        }
      ]
    }
  ]
}`;

        const prompt = `Seviye: ${cefrLevel}
Tür: ${catDesc}
Konu: ${topic}
Adet: ${count}
Lütfen şu mevcut kelimelerden FARKLI olan ${count} yeni ifade üret: ${avoidList || "(Yok)"}`;

        const res = await this.callGeminiJSON(sys, prompt);
        if (!res || !Array.isArray(res.items) || res.items.length === 0) {
            throw new Error("Gemini API geçerli bir kelime paketi döndürmedi.");
        }
        return res.items;
    }
}

window.geminiService = new GeminiService();
