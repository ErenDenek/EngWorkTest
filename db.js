// db.js - IndexedDB Veri Kalıcılığı, SRS Motoru ve JSON Yedekleme/Geri Yükleme Katmanı
const DB_NAME = "LinguaQuestDB";
const DB_VERSION = 1;

class DatabaseManager {
    constructor() {
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 1. Kelime & Kalıp Havuzu (SRS + Çoklu anlam takibi)
                if (!db.objectStoreNames.contains("vocabulary")) {
                    const vocabStore = db.createObjectStore("vocabulary", { keyPath: "id" });
                    vocabStore.createIndex("category", "category", { unique: false });
                    vocabStore.createIndex("status", "status", { unique: false });
                    vocabStore.createIndex("cefr", "cefr", { unique: false });
                    vocabStore.createIndex("nextReviewDate", "nextReviewDate", { unique: false });
                }

                // 2. Günlük İlerleme Haritası (Days & 4 Stages)
                if (!db.objectStoreNames.contains("days")) {
                    db.createObjectStore("days", { keyPath: "dayNumber" });
                }

                // 3. Hata Kumbarası (Weak Points / Mistake Bank)
                if (!db.objectStoreNames.contains("mistakes")) {
                    const mistakeStore = db.createObjectStore("mistakes", { keyPath: "termId" });
                    mistakeStore.createIndex("errorCount", "errorCount", { unique: false });
                }

                // 4. Aktivite Isı Haritası (Heatmap) ve Günlük Üretim Kayıtları
                if (!db.objectStoreNames.contains("activity")) {
                    db.createObjectStore("activity", { keyPath: "date" }); // YYYY-MM-DD
                }

                // 5. Ayarlar & Genel Profil İstatistikleri
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings", { keyPath: "key" });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                await this.seedInitialData();
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB Hatası:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Genel Store Yardımcıları
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async put(storeName, item) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const req = store.put(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // İlk Açılış & Eksik Başlangıç Kelimelerini Tohumlama (Yeni A1/A2 kelimeleri mevcut veritabanına da güvenle ekler)
    async seedInitialData() {
        const existingVocab = await this.getAll("vocabulary");
        const existingIds = new Set(existingVocab.map(v => v.id));
        const existingTerms = new Set(existingVocab.map(v => (v.term || "").toLowerCase()));

        if (typeof DEFAULT_WORDS !== "undefined") {
            const missingDefaults = DEFAULT_WORDS.filter(item =>
                !existingIds.has(item.id) && !existingTerms.has(item.term.toLowerCase())
            );
            if (missingDefaults.length > 0) {
                const tx = this.db.transaction("vocabulary", "readwrite");
                const store = tx.objectStore("vocabulary");
                for (const item of missingDefaults) {
                    store.put({
                        ...item,
                        status: "new", // 'new' | 'learning' | 'review' | 'mastered'
                        srsStage: 0, // 0: yeni, 1: 3 gün, 2: 7 gün, 3: 21 gün, 4: mastered
                        nextReviewDate: null,
                        currentMeaningIndex: 0,
                        correctCount: 0,
                        mistakeCount: 0,
                        customAdded: false,
                        updatedAt: new Date().toISOString()
                    });
                }
                await new Promise((res) => { tx.oncomplete = res; });
            }
        }

        // Varsayılan Profil & Ayarlar
        const profile = await this.get("settings", "profile");
        if (!profile) {
            await this.put("settings", {
                key: "profile",
                xp: 0,
                level: 1,
                currentDay: 1,
                cefrLevel: "B1", // A1, A2, B1, B2, C1
                totalSentencesTranslated: 0,
                accuracySum: 0,
                completedDaysCount: 0,
                streak: 0,
                lastActiveDate: null,
                theme: "dark",
                avatar: "🧙‍♂️"
            });
        } else if (!profile.cefrLevel) {
            profile.cefrLevel = "B1";
            await this.put("settings", profile);
        }

        const aiConfig = await this.get("settings", "aiConfig");
        if (!aiConfig) {
            await this.put("settings", {
                key: "aiConfig",
                apiKey: "",
                model: "gemini-2.5-flash",
                preferredScenario: "Günlük Hayat"
            });
        }
    }

    // Oxford 3000 / NGSL Genişletilmiş Paketini Yükle (Seviye & Kategori Filtreli + Gerçek Kısa Örnek Cümleli)
    async loadExtendedOxfordPack(filterLevel = "ALL", filterCategory = "ALL") {
        if (typeof OXFORD_EXTENDED_PACK === "undefined") return 0;
        const existing = await this.getAll("vocabulary");
        const existingTerms = new Set(existing.map(v => v.term.toLowerCase()));
        let added = 0;

        const tx = this.db.transaction("vocabulary", "readwrite");
        const store = tx.objectStore("vocabulary");

        for (const item of OXFORD_EXTENDED_PACK) {
            const itemCat = item.cat || "word";
            if (filterLevel !== "ALL" && item.cefr !== filterLevel) continue;
            if (filterCategory !== "ALL" && itemCat !== filterCategory) continue;

            if (!existingTerms.has(item.term.toLowerCase())) {
                const termLower = item.term.toLowerCase();
                const id = (itemCat === "phrase" ? "p_" : "w_") + termLower.replace(/[^a-z0-9]/g, "_") + "_" + Math.floor(Math.random() * 1000);
                store.put({
                    id,
                    term: termLower,
                    category: itemCat,
                    partOfSpeech: item.pos,
                    cefr: item.cefr || "B1",
                    meanings: [
                        {
                            tr: item.tr1,
                            context: "Birincil Anlam",
                            example: item.ex1 || `I use "${termLower}" every day.`,
                            exampleTr: item.exTr1 || `Her gün "${termLower}" kelimesini kullanırım.`
                        },
                        {
                            tr: item.tr2,
                            context: "Alternatif / Yan Bağlam",
                            example: item.ex2 || `This is a simple example with "${termLower}".`,
                            exampleTr: item.exTr2 || `Bu "${termLower}" ile basit bir örnektir.`
                        }
                    ],
                    status: "new",
                    srsStage: 0,
                    nextReviewDate: null,
                    currentMeaningIndex: 0,
                    correctCount: 0,
                    mistakeCount: 0,
                    customAdded: false,
                    updatedAt: new Date().toISOString()
                });
                existingTerms.add(termLower);
                added++;
            }
        }

        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(added);
        });
    }

    // Dışarıdan Toplu JSON veya CSV Kelime Havuzu Yükleme (Oxford 3000 {en, tr}, NGSL, Standart formatlar)
    async importBulkVocabulary(rawInput) {
        let items = [];
        if (Array.isArray(rawInput)) {
            items = rawInput;
        } else if (rawInput && typeof rawInput === "object") {
            items = rawInput.words || rawInput.items || rawInput.data || rawInput.vocabulary || [];
        }
        if (!Array.isArray(items) || items.length === 0) return 0;

        // Mevcut havuzu al ve varsa aynı dosya içindeki tekrarlayan kelimelerin Türkçe anlamlarını birleştir
        const existing = await this.getAll("vocabulary");
        const existingTerms = new Set(existing.map(v => (v.term || "").toLowerCase()));

        // CEFR seviyesi olmayan Oxford 3000 kelimeleri için dengeli seviye tahmini
        const oxLookup = new Map();
        if (typeof OXFORD_EXTENDED_PACK !== "undefined") {
            OXFORD_EXTENDED_PACK.forEach(x => oxLookup.set(x.term.toLowerCase(), x));
        }

        const guessCefr = (w) => {
            const found = oxLookup.get(w);
            if (found?.cefr) return found.cefr;
            if (w.length <= 4) return "A1";
            if (w.length <= 6) return "A2";
            if (w.length <= 8) return "B1";
            return "B2";
        };

        const groupedNew = new Map();
        for (const raw of items) {
            if (!raw || typeof raw !== "object") continue;
            const termRaw = (raw.term || raw.word || raw.en || raw.english || "").toString().trim();
            if (!termRaw) continue;
            const termLower = termRaw.toLowerCase();
            if (existingTerms.has(termLower)) continue;

            const trVal = (raw.tr || raw.turkish || raw.meaning || raw.definition || "").toString().trim();
            const category = raw.category || (termRaw.includes(" ") ? "phrase" : "word");

            const incomingMeanings = Array.isArray(raw.meanings) && raw.meanings.length > 0
                ? raw.meanings
                : [{
                    tr: trVal || "Anlam belirtilmedi",
                    context: raw.context || "Genel",
                    example: (raw.example || "").toString().trim(),
                    exampleTr: (raw.exampleTr || "").toString().trim()
                }];

            if (!groupedNew.has(termLower)) {
                const oxMatch = oxLookup.get(termLower);
                groupedNew.set(termLower, {
                    term: termRaw,
                    category: oxMatch?.cat || category,
                    partOfSpeech: raw.partOfSpeech || raw.pos || oxMatch?.pos || (category === "phrase" ? "phrase" : "word"),
                    cefr: raw.cefr || raw.level || guessCefr(termLower),
                    meanings: [...incomingMeanings]
                });
            } else {
                const prev = groupedNew.get(termLower);
                for (const m of incomingMeanings) {
                    if (m.tr && !prev.meanings.some(pm => pm.tr.toLowerCase() === m.tr.toLowerCase())) {
                        prev.meanings.push(m);
                    }
                }
            }
        }

        if (groupedNew.size === 0) return 0;

        let added = 0;
        const baseTs = Date.now();
        const tx = this.db.transaction("vocabulary", "readwrite");
        const store = tx.objectStore("vocabulary");

        for (const [termLower, entry] of groupedNew.entries()) {
            const id = (entry.category === "phrase" ? "p_" : "w_") + termLower.replace(/[^a-z0-9]/g, "_") + "_" + baseTs + "_" + added;
            store.put({
                id,
                term: entry.term,
                category: entry.category,
                partOfSpeech: entry.partOfSpeech,
                cefr: entry.cefr,
                meanings: entry.meanings,
                status: "new",
                srsStage: 0,
                nextReviewDate: null,
                currentMeaningIndex: 0,
                correctCount: 0,
                mistakeCount: 0,
                customAdded: true,
                updatedAt: new Date().toISOString()
            });
            added++;
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(added);
            tx.onerror = () => reject(tx.error);
        });
    }

    // Aralıklı Tekrar (SRS: 3 Gün -> 7 Gün -> 21 Gün -> Ustalaşıldı) Güncellemesi
    async updateWordSRS(wordId, action) {
        const word = await this.get("vocabulary", wordId);
        if (!word) return null;

        const now = new Date();
        const addDays = (days) => {
            const d = new Date(now);
            d.setDate(d.getDate() + days);
            return d.toISOString().split("T")[0];
        };

        if (action === "mastered") {
            word.status = "mastered";
            word.srsStage = 4;
            word.nextReviewDate = null;
        } else if (action === "learn") {
            word.status = "learning";
            word.srsStage = 1;
            word.nextReviewDate = addDays(3); // İlk tekrar 3 gün sonra
        } else if (action === "review_list") {
            word.status = "review";
            word.srsStage = 1;
            word.nextReviewDate = now.toISOString().split("T")[0]; // Hemen tekrar listesinde
        } else if (action === "srs_success") {
            word.correctCount = (word.correctCount || 0) + 1;
            // Çoklu anlam ilerletme: 1. anlam bilindiyse bir sonraki tekrarda 2. veya 3. yan anlam sorulur
            if (word.meanings && word.meanings.length > 1) {
                word.currentMeaningIndex = (word.currentMeaningIndex + 1) % word.meanings.length;
            }
            if (word.srsStage <= 1) {
                word.srsStage = 2;
                word.status = "learning";
                word.nextReviewDate = addDays(7); // 7 gün sonra
            } else if (word.srsStage === 2) {
                word.srsStage = 3;
                word.status = "learning";
                word.nextReviewDate = addDays(21); // 21 gün sonra
            } else {
                word.srsStage = 4;
                word.status = "mastered";
                word.nextReviewDate = null;
            }
        } else if (action === "srs_fail") {
            word.mistakeCount = (word.mistakeCount || 0) + 1;
            word.srsStage = 1;
            word.status = "review";
            word.nextReviewDate = addDays(3); // Başa döner (3 gün)
        }

        word.updatedAt = now.toISOString();
        await this.put("vocabulary", word);
        return word;
    }

    // Testlerde Kelimenin Hangi Anlamıyla Çıktığını ve Doğru/Yanlış Sayısını Kaydet
    async recordQuizAttempt(wordId, meaningIndex, isCorrect) {
        const word = await this.get("vocabulary", wordId);
        if (!word) return null;

        word.correctCount = (word.correctCount || 0) + (isCorrect ? 1 : 0);
        word.mistakeCount = (word.mistakeCount || 0) + (isCorrect ? 0 : 1);

        if (Array.isArray(word.meanings) && word.meanings[meaningIndex]) {
            const m = word.meanings[meaningIndex];
            m.askedCount = (m.askedCount || 0) + 1;
            m.correctCount = (m.correctCount || 0) + (isCorrect ? 1 : 0);
            m.wrongCount = (m.wrongCount || 0) + (isCorrect ? 0 : 1);
        }

        if (isCorrect && Array.isArray(word.meanings) && word.meanings.length > 1) {
            word.currentMeaningIndex = (meaningIndex + 1) % word.meanings.length;
        }

        word.updatedAt = new Date().toISOString();
        await this.put("vocabulary", word);
        return word;
    }

    // Mevcut Kelime veya Bağlacın Yan Anlamlarını Güncelle (AI Zenginleştirme)
    async updateWordMeanings(wordId, newMeaningsArray) {
        const word = await this.get("vocabulary", wordId);
        if (!word) return null;
        word.meanings = newMeaningsArray;
        word.updatedAt = new Date().toISOString();
        await this.put("vocabulary", word);
        return word;
    }

    // Bugün Tekrar Edilmesi Gereken SRS Kelimelerini Getir
    async getDueSRSWords() {
        const all = await this.getAll("vocabulary");
        const today = new Date().toISOString().split("T")[0];
        return all.filter(w =>
            w.status === "review" ||
            (w.status === "learning" && w.nextReviewDate && w.nextReviewDate <= today)
        );
    }

    // Hata Kumbarasına Kaydet
    async recordMistake(termObj, userSentence, feedbackNote) {
        const existing = await this.get("mistakes", termObj.id);
        const entry = existing || {
            termId: termObj.id,
            term: termObj.term,
            category: termObj.category,
            partOfSpeech: termObj.partOfSpeech,
            primaryMeaning: termObj.meanings?.[0]?.tr || "",
            errorCount: 0,
            lastMistakeExample: "",
            lastFeedback: "",
            updatedAt: null
        };
        entry.errorCount += 1;
        entry.lastMistakeExample = userSentence;
        entry.lastFeedback = feedbackNote;
        entry.updatedAt = new Date().toISOString();
        await this.put("mistakes", entry);
        await this.updateWordSRS(termObj.id, "srs_fail");
    }

    // Günlük Aktivite ve Seri (Streak) Güncelleme
    async logDailyActivity(xpEarned = 10, sentencesCount = 0, accuracyScore = null) {
        const today = new Date().toISOString().split("T")[0];
        const existing = await this.get("activity", today) || {
            date: today,
            xpEarned: 0,
            sentencesCount: 0,
            actionsCount: 0
        };

        existing.xpEarned += xpEarned;
        existing.sentencesCount += sentencesCount;
        existing.actionsCount += 1;
        await this.put("activity", existing);

        // Profil & Seri (Streak) Güncelle
        const profile = await this.get("settings", "profile");
        if (profile) {
            profile.xp = (profile.xp || 0) + xpEarned;
            profile.level = Math.floor(profile.xp / 250) + 1;

            if (sentencesCount > 0) {
                profile.totalSentencesTranslated = (profile.totalSentencesTranslated || 0) + sentencesCount;
            }
            if (accuracyScore !== null && !isNaN(accuracyScore)) {
                profile.accuracySum = (profile.accuracySum || 0) + accuracyScore;
            }

            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterday = yesterdayDate.toISOString().split("T")[0];

            if (profile.lastActiveDate !== today) {
                if (profile.lastActiveDate === yesterday) {
                    profile.streak = (profile.streak || 0) + 1;
                } else {
                    profile.streak = 1;
                }
                profile.lastActiveDate = today;
            }

            await this.put("settings", profile);
        }
    }

    // Tüm Veritabanını JSON Olarak Dışa Aktar (MacBook <-> Windows Taşıma)
    async exportFullBackupJSON() {
        const backup = {
            app: "LinguaQuest_AI_English",
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            stores: {
                vocabulary: await this.getAll("vocabulary"),
                days: await this.getAll("days"),
                mistakes: await this.getAll("mistakes"),
                activity: await this.getAll("activity"),
                settings: await this.getAll("settings")
            }
        };
        return JSON.stringify(backup, null, 2);
    }

    // Arkadaşla Paylaşım İçin SADECE Kelime Havuzunu Dışa Aktar (Kişisel İlerleme, Hatalar ve API Key Hariç)
    async exportWordsOnlyJSON() {
        const vocab = await this.getAll("vocabulary");
        const cleanVocab = vocab.map(item => ({
            ...item,
            status: "new",
            srsStage: 0,
            nextReviewDate: null,
            currentMeaningIndex: 0,
            correctCount: 0,
            mistakeCount: 0,
            meanings: (item.meanings || []).map(m => ({
                tr: m.tr,
                context: m.context || "Genel",
                example: m.example || "",
                exampleTr: m.exampleTr || ""
            }))
        }));

        const payload = {
            app: "LinguaQuest_AI_English",
            mode: "words_only",
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            words: cleanVocab, // "JSON/CSV Yükle" ile doğrudan eklenebilmesi için
            stores: {
                vocabulary: cleanVocab,
                days: [],
                mistakes: [],
                activity: []
            }
        };
        return JSON.stringify(payload, null, 2);
    }

    // Kelimeleri & Yan Anlamları Koru, Sadece İlerlemeyi Sıfırla
    async resetProgressKeepWords() {
        await this.clearStore("days");
        await this.clearStore("mistakes");
        await this.clearStore("activity");

        const vocab = await this.getAll("vocabulary");
        const tx = this.db.transaction("vocabulary", "readwrite");
        const store = tx.objectStore("vocabulary");
        for (const item of vocab) {
            store.put({
                ...item,
                status: "new",
                srsStage: 0,
                nextReviewDate: null,
                currentMeaningIndex: 0,
                correctCount: 0,
                mistakeCount: 0,
                meanings: (item.meanings || []).map(m => ({
                    tr: m.tr,
                    context: m.context || "Genel",
                    example: m.example || "",
                    exampleTr: m.exampleTr || ""
                })),
                updatedAt: new Date().toISOString()
            });
        }
        await new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = () => rej(tx.error);
        });

        const profile = await this.get("settings", "profile");
        if (profile) {
            await this.put("settings", {
                ...profile,
                xp: 0,
                level: 1,
                currentDay: 1,
                totalSentencesTranslated: 0,
                accuracySum: 0,
                completedDaysCount: 0,
                streak: 0,
                lastActiveDate: null
            });
        }
        return vocab.length;
    }

    // JSON Yedeğini Geri Yükle (Restore)
    async importFullBackupJSON(jsonString) {
        const parsed = JSON.parse(jsonString);
        if (!parsed || !parsed.stores) {
            throw new Error("Geçersiz yedek dosyası formatı!");
        }

        const storeNames = ["vocabulary", "days", "mistakes", "activity", "settings"];
        for (const sName of storeNames) {
            if (Array.isArray(parsed.stores[sName])) {
                await this.clearStore(sName);
                const tx = this.db.transaction(sName, "readwrite");
                const store = tx.objectStore(sName);
                for (const item of parsed.stores[sName]) {
                    store.put(item);
                }
                await new Promise((res, rej) => {
                    tx.oncomplete = res;
                    tx.onerror = () => rej(tx.error);
                });
            }
        }

        // Eğer "words_only" paketi yedek olarak yüklendiyse mevcut kullanıcının API Key'ini koruyarak ilerlemeyi sıfırla
        if (parsed.mode === "words_only") {
            const profile = await this.get("settings", "profile");
            if (profile) {
                await this.put("settings", {
                    ...profile,
                    xp: 0,
                    level: 1,
                    currentDay: 1,
                    totalSentencesTranslated: 0,
                    accuracySum: 0,
                    completedDaysCount: 0,
                    streak: 0,
                    lastActiveDate: null
                });
            }
        }
        return true;
    }
}

window.dbManager = new DatabaseManager();
