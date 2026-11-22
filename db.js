// db.js - IndexedDB Çalışma Önbelleği, SRS Motoru ve GitHub Gist Bulut Senkronizasyonu
const DB_NAME = "LinguaQuestDB";
const DB_VERSION = 1;

const ACTIVE_USER_STORAGE_KEY = "LQ_ACTIVE_USER_V1";
const GIST_FILE_PREFIX = "linguaquest_user_";
const GIST_FILE_SUFFIX = ".json";
const GIST_META_FILENAME = "linguaquest_meta.json";

class DatabaseManager {
    constructor() {
        this.db = null;
        this._cloudSyncTimer = null;
        this._isRestoringOrSyncing = false;
        this.onCloudStatusChange = null;
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

    // İlk Açılış & Eksik Başlangıç Kelimelerini Tohumlama (Tüm 3900+ kelimeyi mevcut veritabanına da güvenle ekler/zenginleştirir)
    async seedInitialData() {
        const existingVocab = await this.getAll("vocabulary");
        const existingIds = new Set(existingVocab.map(v => v.id));
        const existingByTerm = new Map();
        for (const v of existingVocab) {
            const tKey = (v.term || "").toLowerCase();
            if (tKey && !existingByTerm.has(tKey)) {
                existingByTerm.set(tKey, v);
            }
        }

        if (typeof DEFAULT_WORDS !== "undefined") {
            const missingDefaults = [];
            const enrichTargets = [];

            for (const item of DEFAULT_WORDS) {
                const tKey = (item.term || "").toLowerCase();
                if (!existingIds.has(item.id) && !existingByTerm.has(tKey)) {
                    missingDefaults.push(item);
                } else {
                    const existing = existingByTerm.get(tKey) || existingVocab.find(v => v.id === item.id);
                    if (existing && (existing.meanings || []).length < (item.meanings || []).length) {
                        const prevByTr = new Map(
                            (existing.meanings || []).map(m => [(m.tr || "").toLowerCase(), m])
                        );
                        const mergedMeanings = item.meanings.map(m => {
                            const prevM = prevByTr.get((m.tr || "").toLowerCase());
                            return prevM
                                ? { ...m, askedCount: prevM.askedCount || 0, correctCount: prevM.correctCount || 0, wrongCount: prevM.wrongCount || 0 }
                                : { ...m };
                        });
                        enrichTargets.push({
                            ...existing,
                            meanings: mergedMeanings,
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
            }

            if (missingDefaults.length > 0 || enrichTargets.length > 0) {
                const tx = this.db.transaction("vocabulary", "readwrite");
                const store = tx.objectStore("vocabulary");
                const nowIso = new Date().toISOString();

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
                        updatedAt: nowIso
                    });
                }

                for (const updated of enrichTargets) {
                    store.put(updated);
                }

                await new Promise((res, rej) => {
                    tx.oncomplete = res;
                    tx.onerror = () => rej(tx.error);
                });
            }
        }

        // Varsayılan Profil & Ayarlar
        const profile = await this.get("settings", "profile");
        if (!profile) {
            await this.put("settings", {
                key: "profile",
                username: "",
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
        } else if (!profile.cefrLevel || profile.username === undefined) {
            if (!profile.cefrLevel) profile.cefrLevel = "B1";
            if (profile.username === undefined) profile.username = "";
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
            tx.oncomplete = () => {
                if (added > 0) this.scheduleCloudSync();
                resolve(added);
            };
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
            tx.oncomplete = () => {
                if (added > 0) this.scheduleCloudSync();
                resolve(added);
            };
            tx.onerror = () => reject(tx.error);
        });
    }

    // Aralıklı Tekrar (SRS: 3 Gün -> 7 Gün -> 21 Gün -> Ustalaşıldı) Güncellemesi
    async updateWordSRS(wordId, action) {
        const word = await this.get("vocabulary", wordId);
        if (!word) return null;

        const wasMasteredBefore = word.status === "mastered";
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

        if (!wasMasteredBefore && word.status === "mastered") {
            await this.recordDailyWordEvent(wordId, { masteredDelta: 1 });
        }

        this.scheduleCloudSync();
        return word;
    }

    async recordDailyWordEvent(wordId, { isCorrect = null, masteredDelta = 0 } = {}) {
        const today = new Date().toISOString().split("T")[0];
        const existing = (await this.get("activity", today)) || {
            date: today,
            xpEarned: 0,
            sentencesCount: 0,
            actionsCount: 0,
            wordsStudied: 0,
            wordIdsStudied: [],
            quizAnswersCount: 0,
            quizCorrectCount: 0,
            quizWrongCount: 0,
            vocabTestsCompleted: 0,
            sentenceSessionsCompleted: 0,
            masteredToday: 0
        };

        const idSet = new Set(Array.isArray(existing.wordIdsStudied) ? existing.wordIdsStudied : []);
        if (wordId) idSet.add(wordId);
        existing.wordIdsStudied = Array.from(idSet);
        existing.wordsStudied = Math.max(existing.wordsStudied || 0, existing.wordIdsStudied.length);

        if (isCorrect !== null) {
            existing.quizAnswersCount = (existing.quizAnswersCount || 0) + 1;
            if (isCorrect) existing.quizCorrectCount = (existing.quizCorrectCount || 0) + 1;
            else existing.quizWrongCount = (existing.quizWrongCount || 0) + 1;
            existing.actionsCount = (existing.actionsCount || 0) + 1;
        }
        if (masteredDelta > 0) {
            existing.masteredToday = (existing.masteredToday || 0) + masteredDelta;
            existing.actionsCount = (existing.actionsCount || 0) + 1;
        }

        await this.put("activity", existing);
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
        await this.recordDailyWordEvent(wordId, { isCorrect: Boolean(isCorrect) });
        this.scheduleCloudSync();
        return word;
    }

    // Mevcut Kelime veya Bağlacın Yan Anlamlarını Güncelle (AI Zenginleştirme)
    async updateWordMeanings(wordId, newMeaningsArray) {
        const word = await this.get("vocabulary", wordId);
        if (!word) return null;
        word.meanings = newMeaningsArray;
        word.updatedAt = new Date().toISOString();
        await this.put("vocabulary", word);
        this.scheduleCloudSync();
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
        this.scheduleCloudSync();
    }

    // Günlük Aktivite ve Seri (Streak) Güncelleme
    async logDailyActivity(xpEarned = 10, sentencesCount = 0, accuracyScore = null, extra = {}) {
        const today = new Date().toISOString().split("T")[0];
        const existing = await this.get("activity", today) || {
            date: today,
            xpEarned: 0,
            sentencesCount: 0,
            actionsCount: 0,
            wordsStudied: 0,
            wordIdsStudied: [],
            quizAnswersCount: 0,
            quizCorrectCount: 0,
            quizWrongCount: 0,
            vocabTestsCompleted: 0,
            sentenceSessionsCompleted: 0,
            masteredToday: 0
        };

        existing.xpEarned = (existing.xpEarned || 0) + xpEarned;
        existing.sentencesCount = (existing.sentencesCount || 0) + sentencesCount;
        existing.actionsCount = (existing.actionsCount || 0) + 1;
        if (extra?.vocabTestCompleted) {
            existing.vocabTestsCompleted = (existing.vocabTestsCompleted || 0) + 1;
        }
        if (extra?.sentenceSessionCompleted) {
            existing.sentenceSessionsCompleted = (existing.sentenceSessionsCompleted || 0) + 1;
        }
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
            if (extra?.vocabTestCompleted) {
                profile.totalVocabTestsCompleted = (profile.totalVocabTestsCompleted || 0) + 1;
            }
            if (extra?.sentenceSessionCompleted) {
                profile.totalSentenceSessionsCompleted = (profile.totalSentenceSessionsCompleted || 0) + 1;
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
            profile.bestStreak = Math.max(profile.bestStreak || 0, profile.streak || 0);

            await this.put("settings", profile);
        }
        this.scheduleCloudSync();
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
    async resetProgressKeepWords(options = {}) {
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
        const preservedUsername = profile?.username || "";
        if (profile) {
            await this.put("settings", {
                ...profile,
                username: preservedUsername,
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

        if (options?.syncResetToCloud !== false) {
            try {
                const cfg = await this.getCloudConfig();
                if (cfg.githubToken && cfg.username) {
                    await this.syncToGitHubGist({ silent: true, forceOverwrite: true });
                }
            } catch (_) {}
        }
        return vocab.length;
    }

    // JSON Yedeğini Geri Yükle (Restore)
    async importFullBackupJSON(jsonString) {
        const parsed = JSON.parse(jsonString);
        if (!parsed || !parsed.stores) {
            throw new Error("Geçersiz yedek dosyası formatı!");
        }

        const currentProfileBefore = await this.get("settings", "profile");
        const currentUsername = currentProfileBefore?.username || "";

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

        // Eğer "words_only" paketi yedek olarak yüklendiyse mevcut kullanıcının API Key'ini ve username'ini koruyarak ilerlemeyi sıfırla
        if (parsed.mode === "words_only") {
            const profile = await this.get("settings", "profile");
            if (profile) {
                await this.put("settings", {
                    ...profile,
                    username: profile.username || currentUsername,
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
        await this.seedInitialData();
        this.scheduleCloudSync();
        return true;
    }

    // =========================================================================
    // ÇOKLU KULLANICI & TEK GITHUB HESABI İLE GIST SENKRONİZASYONU
    // =========================================================================
    normalizeUsername(name) {
        const trMap = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "İ": "i" };
        const clean = (name || "")
            .toString()
            .trim()
            .replace(/[çğıöşüİ]/gi, (ch) => trMap[ch] || trMap[ch.toLowerCase()] || ch)
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 32);
        return clean;
    }

    getUserGistFilename(username) {
        const norm = this.normalizeUsername(username);
        return norm ? `${GIST_FILE_PREFIX}${norm}${GIST_FILE_SUFFIX}` : "";
    }

    normalizeGistId(input) {
        const raw = (input || "").toString().trim();
        if (!raw) return "";
        // Tam Gist URL'si yapıştırıldıysa ID'yi otomatik çıkar
        const urlMatch = raw.match(/gist\.github\.com\/(?:[^/\s]+\/)?([a-f0-9]{16,40})/i);
        if (urlMatch) return urlMatch[1];
        const clean = raw.replace(/[^a-f0-9]/gi, "");
        return clean.length >= 16 ? clean : raw;
    }

    cleanTokenInput(raw) {
        let val = (raw || "").toString().trim();
        if (!val) return "";
        val = val.replace(/^(Bearer|token)\s+/i, "").replace(/\s+/g, "");
        if (val.startsWith("LQKEY:")) {
            const parsed = this.decodeSyncKey(val);
            if (parsed?.token) return parsed.token;
        }
        if (val.startsWith("LQENC:")) {
            const decoded = this.decodeRepoToken(val);
            if (decoded) return decoded;
        }
        return val;
    }

    encodeTokenForRepo(rawToken) {
        const clean = this.cleanTokenInput(rawToken);
        if (!clean) return "";
        const key = "LQ_GIST_SHARED_2026";
        const reversed = clean.split("").reverse().join("");
        const bytes = new TextEncoder().encode(reversed);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) {
            const xorByte = bytes[i] ^ key.charCodeAt(i % key.length);
            bin += String.fromCharCode(xorByte);
        }
        return "LQENC:" + btoa(bin);
    }

    decodeRepoToken(encoded) {
        try {
            const val = (encoded || "").trim();
            if (!val || !val.startsWith("LQENC:")) return "";
            const key = "LQ_GIST_SHARED_2026";
            const bin = atob(val.slice(6));
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
                bytes[i] = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            }
            const reversed = new TextDecoder().decode(bytes);
            return reversed.split("").reverse().join("");
        } catch (_) {
            return "";
        }
    }

    encodeSyncKey(rawToken, gistId = "") {
        const cleanToken = this.cleanTokenInput(rawToken);
        if (!cleanToken) return "";
        const cleanGist = this.normalizeGistId(gistId);
        const payload = JSON.stringify({ t: cleanToken, g: cleanGist });
        const key = "LQ_SYNC_KEY_2026";
        const reversed = payload.split("").reverse().join("");
        const bytes = new TextEncoder().encode(reversed);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) {
            bin += String.fromCharCode(bytes[i] ^ key.charCodeAt(i % key.length));
        }
        return "LQKEY:" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    decodeSyncKey(syncKeyStr) {
        try {
            const val = (syncKeyStr || "").trim();
            if (!val) return null;
            if (val.startsWith("LQENC:")) {
                const token = this.decodeRepoToken(val);
                return token ? { token, gistId: "" } : null;
            }
            if (!val.startsWith("LQKEY:")) return null;
            let b64 = val.slice(6).replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4) b64 += "=";
            const key = "LQ_SYNC_KEY_2026";
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
                bytes[i] = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            }
            const reversed = new TextDecoder().decode(bytes);
            const jsonStr = reversed.split("").reverse().join("");
            const parsed = JSON.parse(jsonStr);
            if (!parsed?.t) return null;
            return { token: parsed.t, gistId: this.normalizeGistId(parsed.g || "") };
        } catch (_) {
            return null;
        }
    }

    getAppConfig() {
        const cfg = (typeof window !== "undefined" && window.LINGUAQUEST_CONFIG) ? window.LINGUAQUEST_CONFIG : {};
        const users = Array.isArray(cfg.users) && cfg.users.length > 0
            ? cfg.users.map(u => String(u).trim()).filter(Boolean)
            : ["ErenD.", "MustafaT."];
        return {
            version: (cfg.version || "v1.5.0").trim(),
            users,
            encodedToken: (cfg.encodedToken || "").trim(),
            gistId: this.normalizeGistId(cfg.gistId || "")
        };
    }

    getAppVersion() {
        return this.getAppConfig().version;
    }

    getAllowedUsers() {
        return this.getAppConfig().users;
    }

    findAllowedDisplayName(rawName) {
        const norm = this.normalizeUsername(rawName);
        if (!norm) return "";
        const found = this.getAllowedUsers().find(u => this.normalizeUsername(u) === norm);
        return found || "";
    }

    async getProfilePrefs() {
        const profile = await this.get("settings", "profile");
        return (profile && typeof profile.prefs === "object" && profile.prefs) ? { ...profile.prefs } : {};
    }

    async saveProfilePrefs(partialPrefs) {
        if (!partialPrefs || typeof partialPrefs !== "object") return {};
        const profile = await this.get("settings", "profile");
        if (!profile) return {};
        const nextPrefs = {
            ...(profile.prefs || {}),
            ...partialPrefs
        };
        profile.prefs = nextPrefs;
        profile.prefsUpdatedAt = new Date().toISOString();
        await this.put("settings", profile);
        this.scheduleCloudSync();
        return nextPrefs;
    }

    async getCloudConfig() {
        const appCfg = this.getAppConfig();
        const dbCfg = await this.get("settings", "cloudConfig");
        const profile = await this.get("settings", "profile");

        let storedUserDisplay = "";
        try {
            storedUserDisplay = localStorage.getItem(ACTIVE_USER_STORAGE_KEY) || "";
        } catch (_) {}

        const githubToken = this.decodeRepoToken(appCfg.encodedToken);
        const gistId = appCfg.gistId || this.normalizeGistId(dbCfg?.gistId || "");
        const candidateUser = storedUserDisplay || profile?.displayName || profile?.username || dbCfg?.username || "";
        const displayName = this.findAllowedDisplayName(candidateUser);
        const username = this.normalizeUsername(displayName);

        return {
            key: "cloudConfig",
            githubToken,
            gistId,
            username,
            displayName,
            autoSync: true,
            lastSyncAt: dbCfg?.lastSyncAt || null,
            isSharedEmbedded: Boolean(githubToken)
        };
    }

    async saveCloudConfig(partialCfg) {
        const current = await this.getCloudConfig();
        const nextGistId = partialCfg.gistId !== undefined
            ? this.normalizeGistId(partialCfg.gistId)
            : (current.gistId || "");

        let nextDisplayName = current.displayName || "";
        let nextUsername = current.username || "";
        if (partialCfg.username !== undefined) {
            const matched = this.findAllowedDisplayName(partialCfg.username);
            nextDisplayName = matched;
            nextUsername = this.normalizeUsername(matched);
        }

        const storedObj = {
            key: "cloudConfig",
            gistId: nextGistId,
            username: nextUsername,
            displayName: nextDisplayName,
            autoSync: true,
            lastSyncAt: partialCfg.lastSyncAt !== undefined ? partialCfg.lastSyncAt : current.lastSyncAt
        };

        await this.put("settings", storedObj);

        if (partialCfg.username !== undefined) {
            try {
                if (nextDisplayName) {
                    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, nextDisplayName);
                } else {
                    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
                }
            } catch (_) {}

            const profile = await this.get("settings", "profile");
            if (profile) {
                profile.username = nextUsername;
                profile.displayName = nextDisplayName;
                await this.put("settings", profile);
            }
        }

        return this.getCloudConfig();
    }

    async buildCompactProgressPayload() {
        const [vocab, days, mistakes, activity, profile, aiConfig] = await Promise.all([
            this.getAll("vocabulary"),
            this.getAll("days"),
            this.getAll("mistakes"),
            this.getAll("activity"),
            this.get("settings", "profile"),
            this.get("settings", "aiConfig")
        ]);

        const defaultMap = new Map();
        if (typeof DEFAULT_WORDS !== "undefined") {
            for (const dw of DEFAULT_WORDS) {
                defaultMap.set((dw.term || "").toLowerCase(), dw);
            }
        }

        const vocabDelta = [];
        const customWords = [];

        for (const v of vocab) {
            const tKey = (v.term || "").toLowerCase();
            const defItem = defaultMap.get(tKey);
            const hasProgress =
                (v.status && v.status !== "new") ||
                (v.correctCount || 0) > 0 ||
                (v.mistakeCount || 0) > 0 ||
                (v.srsStage || 0) > 0 ||
                (v.currentMeaningIndex || 0) > 0;

            if (hasProgress) {
                vocabDelta.push({
                    id: v.id,
                    term: v.term,
                    status: v.status || "new",
                    srsStage: v.srsStage || 0,
                    nextReviewDate: v.nextReviewDate || null,
                    currentMeaningIndex: v.currentMeaningIndex || 0,
                    correctCount: v.correctCount || 0,
                    mistakeCount: v.mistakeCount || 0,
                    updatedAt: v.updatedAt || null,
                    mStats: (v.meanings || []).map(m => ({
                        tr: m.tr,
                        a: m.askedCount || 0,
                        c: m.correctCount || 0,
                        w: m.wrongCount || 0
                    }))
                });
            }

            if (!defItem || (v.meanings || []).length > (defItem.meanings || []).length) {
                customWords.push({
                    id: v.id,
                    term: v.term,
                    category: v.category || "word",
                    partOfSpeech: v.partOfSpeech || "word",
                    cefr: v.cefr || "B1",
                    meanings: v.meanings || [],
                    customAdded: Boolean(v.customAdded)
                });
            }
        }

        return {
            app: "LinguaQuest_AI_User_Sync",
            version: 3,
            username: this.normalizeUsername(profile?.username || ""),
            displayName: profile?.displayName || "",
            savedAt: new Date().toISOString(),
            profile: profile || null,
            aiConfig: aiConfig ? {
                encodedApiKey: aiConfig.apiKey ? this.encodeTokenForRepo(aiConfig.apiKey) : "",
                model: aiConfig.model || "gemini-3.8-flash",
                preferredScenario: aiConfig.preferredScenario || "Günlük Hayat",
                updatedAt: aiConfig.updatedAt || null
            } : null,
            days: days || [],
            mistakes: mistakes || [],
            activity: activity || [],
            vocabDelta,
            customWords
        };
    }

    async applyCompactProgressPayload(payload, { merge = true } = {}) {
        if (!payload || typeof payload !== "object") return { applied: false };

        this._isRestoringOrSyncing = true;
        try {
            const currentVocab = await this.getAll("vocabulary");
            const byId = new Map(currentVocab.map(v => [v.id, v]));
            const byTerm = new Map(currentVocab.map(v => [(v.term || "").toLowerCase(), v]));
            const touchedVocab = new Map();
            const stageRank = { new: 0, review: 1, learning: 2, mastered: 3 };

            for (const cw of (payload.customWords || [])) {
                const tKey = (cw.term || "").toLowerCase();
                if (!tKey) continue;
                const existing = byId.get(cw.id) || byTerm.get(tKey);
                if (!existing) {
                    const created = {
                        ...cw,
                        status: "new",
                        srsStage: 0,
                        nextReviewDate: null,
                        currentMeaningIndex: 0,
                        correctCount: 0,
                        mistakeCount: 0,
                        updatedAt: new Date().toISOString()
                    };
                    byId.set(created.id, created);
                    byTerm.set(tKey, created);
                    touchedVocab.set(created.id, created);
                } else if ((cw.meanings || []).length > (existing.meanings || []).length) {
                    const prevByTr = new Map((existing.meanings || []).map(m => [(m.tr || "").toLowerCase(), m]));
                    existing.meanings = cw.meanings.map(m => {
                        const prevM = prevByTr.get((m.tr || "").toLowerCase());
                        return prevM
                            ? { ...m, askedCount: prevM.askedCount || 0, correctCount: prevM.correctCount || 0, wrongCount: prevM.wrongCount || 0 }
                            : { ...m };
                    });
                    touchedVocab.set(existing.id, existing);
                }
            }

            for (const d of (payload.vocabDelta || [])) {
                const tKey = (d.term || "").toLowerCase();
                const target = byId.get(d.id) || (tKey ? byTerm.get(tKey) : null);
                if (!target) continue;

                if (!merge) {
                    target.status = d.status || "new";
                    target.srsStage = d.srsStage || 0;
                    target.nextReviewDate = d.nextReviewDate || null;
                    target.currentMeaningIndex = d.currentMeaningIndex || 0;
                    target.correctCount = d.correctCount || 0;
                    target.mistakeCount = d.mistakeCount || 0;
                    target.updatedAt = d.updatedAt || new Date().toISOString();
                } else {
                    const localTotal = (target.correctCount || 0) + (target.mistakeCount || 0) + (target.srsStage || 0);
                    const remoteTotal = (d.correctCount || 0) + (d.mistakeCount || 0) + (d.srsStage || 0);
                    const remoteNewer = (d.updatedAt || "") > (target.updatedAt || "");

                    target.correctCount = Math.max(target.correctCount || 0, d.correctCount || 0);
                    target.mistakeCount = Math.max(target.mistakeCount || 0, d.mistakeCount || 0);
                    target.srsStage = Math.max(target.srsStage || 0, d.srsStage || 0);

                    if ((stageRank[d.status] || 0) > (stageRank[target.status] || 0) || (remoteNewer && remoteTotal >= localTotal)) {
                        target.status = d.status || target.status;
                        target.nextReviewDate = d.nextReviewDate ?? target.nextReviewDate;
                        target.currentMeaningIndex = d.currentMeaningIndex ?? target.currentMeaningIndex;
                        target.updatedAt = d.updatedAt || target.updatedAt;
                    }
                }

                if (Array.isArray(d.mStats) && Array.isArray(target.meanings)) {
                    const statsMap = new Map(d.mStats.map(s => [(s.tr || "").toLowerCase(), s]));
                    target.meanings = target.meanings.map(m => {
                        const rs = statsMap.get((m.tr || "").toLowerCase());
                        if (!rs) return m;
                        return {
                            ...m,
                            askedCount: merge ? Math.max(m.askedCount || 0, rs.a || 0) : (rs.a || 0),
                            correctCount: merge ? Math.max(m.correctCount || 0, rs.c || 0) : (rs.c || 0),
                            wrongCount: merge ? Math.max(m.wrongCount || 0, rs.w || 0) : (rs.w || 0)
                        };
                    });
                }

                touchedVocab.set(target.id, target);
            }

            if (touchedVocab.size > 0) {
                const tx = this.db.transaction("vocabulary", "readwrite");
                const store = tx.objectStore("vocabulary");
                for (const item of touchedVocab.values()) store.put(item);
                await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
            }

            const currentDays = await this.getAll("days");
            const dayMap = new Map(currentDays.map(d => [d.dayNumber, d]));
            const mergedDays = [];
            for (const rd of (payload.days || [])) {
                const ld = dayMap.get(rd.dayNumber);
                if (!ld || !merge) {
                    mergedDays.push(rd);
                } else {
                    const stageStatus = {};
                    for (const k of [1, 2, 3, 4]) {
                        const ls = ld.stageStatus?.[k] || {};
                        const rs = rd.stageStatus?.[k] || {};
                        stageStatus[k] = {
                            ...ls,
                            ...rs,
                            unlocked: Boolean(ls.unlocked || rs.unlocked),
                            completed: Boolean(ls.completed || rs.completed),
                            decisions: { ...(ls.decisions || {}), ...(rs.decisions || {}) },
                            results: (rs.results?.length || 0) >= (ls.results?.length || 0) ? (rs.results || []) : (ls.results || [])
                        };
                    }
                    mergedDays.push({
                        ...ld,
                        ...rd,
                        unlocked: Boolean(ld.unlocked || rd.unlocked),
                        completed: Boolean(ld.completed || rd.completed),
                        currentStage: Math.max(ld.currentStage || 1, rd.currentStage || 1),
                        stageStatus
                    });
                }
            }
            if (mergedDays.length > 0) {
                const txD = this.db.transaction("days", "readwrite");
                const stD = txD.objectStore("days");
                for (const d of mergedDays) stD.put(d);
                await new Promise((res, rej) => { txD.oncomplete = res; txD.onerror = () => rej(txD.error); });
            }

            const currentMistakes = await this.getAll("mistakes");
            const mistakeMap = new Map(currentMistakes.map(m => [m.termId, m]));
            const mergedMistakes = [];
            for (const rm of (payload.mistakes || [])) {
                const lm = mistakeMap.get(rm.termId);
                if (!lm || !merge) {
                    mergedMistakes.push(rm);
                } else {
                    const useRemote = (rm.updatedAt || "") >= (lm.updatedAt || "");
                    mergedMistakes.push({
                        ...(useRemote ? rm : lm),
                        errorCount: Math.max(lm.errorCount || 0, rm.errorCount || 0)
                    });
                }
            }
            if (mergedMistakes.length > 0) {
                const txM = this.db.transaction("mistakes", "readwrite");
                const stM = txM.objectStore("mistakes");
                for (const m of mergedMistakes) stM.put(m);
                await new Promise((res, rej) => { txM.oncomplete = res; txM.onerror = () => rej(txM.error); });
            }

            const currentAct = await this.getAll("activity");
            const actMap = new Map(currentAct.map(a => [a.date, a]));
            const mergedAct = [];
            for (const ra of (payload.activity || [])) {
                const la = actMap.get(ra.date);
                if (!la || !merge) {
                    mergedAct.push(ra);
                } else {
                    const mergedIds = Array.from(new Set([
                        ...(Array.isArray(la.wordIdsStudied) ? la.wordIdsStudied : []),
                        ...(Array.isArray(ra.wordIdsStudied) ? ra.wordIdsStudied : [])
                    ]));
                    mergedAct.push({
                        date: ra.date,
                        xpEarned: Math.max(la.xpEarned || 0, ra.xpEarned || 0),
                        sentencesCount: Math.max(la.sentencesCount || 0, ra.sentencesCount || 0),
                        actionsCount: Math.max(la.actionsCount || 0, ra.actionsCount || 0),
                        wordIdsStudied: mergedIds,
                        wordsStudied: Math.max(la.wordsStudied || 0, ra.wordsStudied || 0, mergedIds.length),
                        quizAnswersCount: Math.max(la.quizAnswersCount || 0, ra.quizAnswersCount || 0),
                        quizCorrectCount: Math.max(la.quizCorrectCount || 0, ra.quizCorrectCount || 0),
                        quizWrongCount: Math.max(la.quizWrongCount || 0, ra.quizWrongCount || 0),
                        vocabTestsCompleted: Math.max(la.vocabTestsCompleted || 0, ra.vocabTestsCompleted || 0),
                        sentenceSessionsCompleted: Math.max(la.sentenceSessionsCompleted || 0, ra.sentenceSessionsCompleted || 0),
                        masteredToday: Math.max(la.masteredToday || 0, ra.masteredToday || 0)
                    });
                }
            }
            if (mergedAct.length > 0) {
                const txA = this.db.transaction("activity", "readwrite");
                const stA = txA.objectStore("activity");
                for (const a of mergedAct) stA.put(a);
                await new Promise((res, rej) => { txA.oncomplete = res; txA.onerror = () => rej(txA.error); });
            }

            if (payload.profile) {
                const lp = await this.get("settings", "profile");
                const rp = payload.profile;
                const allDaysAfter = await this.getAll("days");
                const completedDays = allDaysAfter.filter(d => d.completed).length;
                const activeUsername = this.normalizeUsername(lp?.username || payload.username || rp.username || "");

                if (!lp || !merge) {
                    await this.put("settings", {
                        ...rp,
                        key: "profile",
                        username: activeUsername,
                        completedDaysCount: Math.max(rp.completedDaysCount || 0, completedDays)
                    });
                } else {
                    const maxXp = Math.max(lp.xp || 0, rp.xp || 0);
                    const lastDateL = lp.lastActiveDate || "";
                    const lastDateR = rp.lastActiveDate || "";
                    let bestStreak = lp.streak || 0;
                    let bestLastDate = lastDateL || null;
                    if (lastDateR > lastDateL) {
                        bestStreak = rp.streak || 0;
                        bestLastDate = lastDateR;
                    } else if (lastDateR === lastDateL) {
                        bestStreak = Math.max(lp.streak || 0, rp.streak || 0);
                    }

                    const localPrefsTs = lp.prefsUpdatedAt || "";
                    const remotePrefsTs = rp.prefsUpdatedAt || payload.savedAt || "";
                    const remotePrefsNewer = Boolean(remotePrefsTs && remotePrefsTs > localPrefsTs);
                    const mergedPrefs = remotePrefsNewer
                        ? { ...(lp.prefs || {}), ...(rp.prefs || {}) }
                        : { ...(rp.prefs || {}), ...(lp.prefs || {}) };

                    await this.put("settings", {
                        ...lp,
                        username: activeUsername,
                        xp: maxXp,
                        level: Math.floor(maxXp / 250) + 1,
                        currentDay: Math.max(lp.currentDay || 1, rp.currentDay || 1),
                        cefrLevel: remotePrefsNewer ? (rp.cefrLevel || lp.cefrLevel || "B1") : (lp.cefrLevel || rp.cefrLevel || "B1"),
                        totalSentencesTranslated: Math.max(lp.totalSentencesTranslated || 0, rp.totalSentencesTranslated || 0),
                        totalVocabTestsCompleted: Math.max(lp.totalVocabTestsCompleted || 0, rp.totalVocabTestsCompleted || 0),
                        totalSentenceSessionsCompleted: Math.max(lp.totalSentenceSessionsCompleted || 0, rp.totalSentenceSessionsCompleted || 0),
                        accuracySum: Math.max(lp.accuracySum || 0, rp.accuracySum || 0),
                        completedDaysCount: Math.max(lp.completedDaysCount || 0, rp.completedDaysCount || 0, completedDays),
                        streak: bestStreak,
                        bestStreak: Math.max(lp.bestStreak || 0, rp.bestStreak || 0, bestStreak),
                        lastActiveDate: bestLastDate,
                        avatar: remotePrefsNewer ? (rp.avatar || lp.avatar || "🧙‍♂️") : (lp.avatar || rp.avatar || "🧙‍♂️"),
                        theme: remotePrefsNewer ? (rp.theme || lp.theme || "dark") : (lp.theme || rp.theme || "dark"),
                        prefs: mergedPrefs,
                        prefsUpdatedAt: remotePrefsNewer ? remotePrefsTs : (localPrefsTs || remotePrefsTs)
                    });
                }
            }

            if (payload.aiConfig && typeof payload.aiConfig === "object") {
                const existingAi = (await this.get("settings", "aiConfig")) || {
                    key: "aiConfig",
                    apiKey: "",
                    model: "gemini-3.8-flash",
                    preferredScenario: "Günlük Hayat",
                    updatedAt: ""
                };
                const decodedKey = payload.aiConfig.encodedApiKey
                    ? this.decodeRepoToken(payload.aiConfig.encodedApiKey)
                    : (payload.aiConfig.apiKey || "");

                if (!merge) {
                    await this.put("settings", {
                        ...existingAi,
                        key: "aiConfig",
                        apiKey: decodedKey || "",
                        model: payload.aiConfig.model || "gemini-3.8-flash",
                        preferredScenario: payload.aiConfig.preferredScenario || "Günlük Hayat",
                        updatedAt: payload.aiConfig.updatedAt || payload.savedAt || ""
                    });
                } else {
                    const localTs = existingAi.updatedAt || "";
                    const remoteTs = payload.aiConfig.updatedAt || payload.savedAt || "";
                    const remoteIsNewer = Boolean(remoteTs && remoteTs > localTs);

                    await this.put("settings", {
                        ...existingAi,
                        key: "aiConfig",
                        apiKey: remoteIsNewer
                            ? (decodedKey || existingAi.apiKey || "")
                            : (existingAi.apiKey || decodedKey || ""),
                        model: remoteIsNewer
                            ? (payload.aiConfig.model || existingAi.model || "gemini-3.8-flash")
                            : (existingAi.model || payload.aiConfig.model || "gemini-3.8-flash"),
                        preferredScenario: remoteIsNewer
                            ? (payload.aiConfig.preferredScenario || existingAi.preferredScenario || "Günlük Hayat")
                            : (existingAi.preferredScenario || payload.aiConfig.preferredScenario || "Günlük Hayat"),
                        updatedAt: remoteIsNewer ? remoteTs : (localTs || remoteTs)
                    });
                }
            }

            return { applied: true, restoredWords: touchedVocab.size, restoredDays: mergedDays.length };
        } finally {
            this._isRestoringOrSyncing = false;
        }
    }

    async githubRequest(url, options = {}, token = "") {
        const cleanTok = this.cleanTokenInput(token);
        if (!cleanTok) {
            throw new Error("GitHub Token boş veya geçersiz.");
        }
        const headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${cleanTok}`,
            ...(options.headers || {})
        };
        if (options.body && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }
        let res;
        try {
            res = await fetch(url, { ...options, headers, cache: "no-store" });
        } catch (netErr) {
            throw new Error("GitHub sunucusuna ulaşılamadı (internet bağlantınızı veya tarayıcı engelleyicisini kontrol edin).");
        }
        if (!res.ok) {
            let apiMsg = "";
            try {
                const errJson = await res.json();
                if (errJson?.message) apiMsg = errJson.message;
            } catch (_) {}
            if (res.status === 401) {
                throw new Error(`GitHub Token geçersiz veya süresi dolmuş (401${apiMsg ? `: ${apiMsg}` : ""}). Yeni bir 'gist' yetkili Classic Token oluşturun.`);
            }
            if (res.status === 403 || (res.status === 404 && url.endsWith("/gists"))) {
                throw new Error(`Bu GitHub Token'da 'gist' yazma yetkisi yok (${res.status}${apiMsg ? `: ${apiMsg}` : ""}). Token oluştururken 'gist' iznini işaretleyin.`);
            }
            throw new Error(`GitHub API Hatası (${res.status})${apiMsg ? `: ${apiMsg}` : ""}`);
        }
        return res.json();
    }

    async findOrCreateGistId(token, existingGistId = "", fallbackFilename = "") {
        const cleanTok = this.cleanTokenInput(token);
        const normGistId = this.normalizeGistId(existingGistId);

        if (normGistId) {
            try {
                const gist = await this.githubRequest(`https://api.github.com/gists/${normGistId}`, { method: "GET" }, cleanTok);
                if (gist?.id) return gist;
            } catch (_) {}
        }

        const gists = await this.githubRequest("https://api.github.com/gists?per_page=50", { method: "GET" }, cleanTok);
        const found = (gists || []).find(g => {
            if (!g.files) return false;
            return Object.keys(g.files).some(fn =>
                fn.startsWith(GIST_FILE_PREFIX) ||
                fn === GIST_META_FILENAME ||
                fn === "linguaquest_cloud_sync.json"
            );
        });
        if (found) {
            const fullGist = await this.githubRequest(`https://api.github.com/gists/${found.id}`, { method: "GET" }, cleanTok);
            await this.saveCloudConfig({ gistId: fullGist.id });
            return fullGist;
        }

        const useMetaFile = !fallbackFilename;
        const initialFilename = fallbackFilename || GIST_META_FILENAME;
        const initialContent = useMetaFile
            ? JSON.stringify({
                app: "LinguaQuest_AI_MultiUser",
                version: 2,
                createdAt: new Date().toISOString()
            })
            : JSON.stringify(await this.buildCompactProgressPayload());

        const created = await this.githubRequest("https://api.github.com/gists", {
            method: "POST",
            body: JSON.stringify({
                description: "LinguaQuest AI — Çoklu Kullanıcı Otomatik İlerleme Gist'i (Secret)",
                public: false,
                files: {
                    [initialFilename]: {
                        content: initialContent
                    }
                }
            })
        }, cleanTok);
        await this.saveCloudConfig({ gistId: created.id });
        return created;
    }

    async readFileFromGist(gistObj, filename, token) {
        const file = gistObj?.files?.[filename];
        if (!file) return null;
        let text = file.content || "";
        if (file.truncated && file.raw_url) {
            const rawRes = await fetch(file.raw_url, {
                headers: { "Authorization": `Bearer ${this.cleanTokenInput(token)}` },
                cache: "no-store"
            });
            if (rawRes.ok) text = await rawRes.text();
        }
        if (!text.trim()) return null;
        return JSON.parse(text);
    }

    async listCloudUsers() {
        const cfg = await this.getCloudConfig();
        if (!cfg.githubToken) return [];
        const gist = await this.findOrCreateGistId(cfg.githubToken, cfg.gistId);
        const files = Object.keys(gist?.files || {});
        return files
            .filter(fn => fn.startsWith(GIST_FILE_PREFIX) && fn.endsWith(GIST_FILE_SUFFIX))
            .map(fn => fn.slice(GIST_FILE_PREFIX.length, -GIST_FILE_SUFFIX.length))
            .filter(u => u && u !== "default")
            .sort();
    }

    async pullFromGitHubGist({ silent = false, merge = true } = {}) {
        const cfg = await this.getCloudConfig();
        if (!cfg.githubToken) {
            if (silent) return { skipped: true };
            throw new Error("GitHub Gist bağlantısı yapılandırılmamış.");
        }
        if (!cfg.username) {
            if (silent) return { skipped: true, needsUsername: true };
            throw new Error("Önce bir kullanıcı adı belirleyin veya seçin.");
        }

        const filename = this.getUserGistFilename(cfg.username);
        if (this.onCloudStatusChange) this.onCloudStatusChange("syncing");
        try {
            const gist = await this.findOrCreateGistId(cfg.githubToken, cfg.gistId, filename);
            const remotePayload = await this.readFileFromGist(gist, filename, cfg.githubToken);
            let result = { applied: false, gistId: gist.id, filename, fileFound: Boolean(remotePayload) };
            if (remotePayload) {
                const mergeRes = await this.applyCompactProgressPayload(remotePayload, { merge });
                result = { ...mergeRes, gistId: gist.id, filename, fileFound: true, remoteSavedAt: remotePayload.savedAt };
            }
            const nowIso = new Date().toISOString();
            await this.saveCloudConfig({ gistId: gist.id, lastSyncAt: nowIso });
            if (this.onCloudStatusChange) this.onCloudStatusChange("synced", nowIso);
            return result;
        } catch (err) {
            if (this.onCloudStatusChange) this.onCloudStatusChange("error", err.message);
            if (!silent) throw err;
            return { error: err.message };
        }
    }

    async syncToGitHubGist({ silent = false, forceOverwrite = false } = {}) {
        const cfg = await this.getCloudConfig();
        if (!cfg.githubToken) {
            if (silent) return { skipped: true };
            throw new Error("GitHub Gist bağlantısı yapılandırılmamış.");
        }
        if (!cfg.username) {
            if (silent) return { skipped: true, needsUsername: true };
            throw new Error("Önce bir kullanıcı adı belirleyin veya seçin.");
        }

        const filename = this.getUserGistFilename(cfg.username);
        if (this.onCloudStatusChange) this.onCloudStatusChange("syncing");
        try {
            const gist = await this.findOrCreateGistId(cfg.githubToken, cfg.gistId, filename);
            if (!forceOverwrite) {
                const remotePayload = await this.readFileFromGist(gist, filename, cfg.githubToken);
                if (remotePayload) {
                    await this.applyCompactProgressPayload(remotePayload, { merge: true });
                }
            }

            const payload = await this.buildCompactProgressPayload();
            const jsonStr = JSON.stringify(payload);
            await this.githubRequest(`https://api.github.com/gists/${gist.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    files: {
                        [filename]: {
                            content: jsonStr
                        }
                    }
                })
            }, cfg.githubToken);

            const nowIso = new Date().toISOString();
            await this.saveCloudConfig({ gistId: gist.id, lastSyncAt: nowIso });
            if (this.onCloudStatusChange) this.onCloudStatusChange("synced", nowIso);
            return {
                ok: true,
                gistId: gist.id,
                filename,
                username: cfg.username,
                lastSyncAt: nowIso,
                bytes: jsonStr.length,
                vocabCount: payload.vocabDelta.length,
                daysCount: payload.days.length
            };
        } catch (err) {
            if (this.onCloudStatusChange) this.onCloudStatusChange("error", err.message);
            if (!silent) throw err;
            return { error: err.message };
        }
    }

    async switchUserProfile(selectedUser) {
        const displayName = this.findAllowedDisplayName(selectedUser);
        const norm = this.normalizeUsername(displayName);
        if (!displayName || !norm) {
            throw new Error("Geçersiz kullanıcı! Lütfen listeden kayıtlı bir kullanıcı seçin.");
        }

        const prevCfg = await this.getCloudConfig();
        if (!prevCfg.githubToken) {
            throw new Error("Bulut bağlantısı yapılandırılmamış (cloudConfig.js içinde şifreli GitHub Token bulunamadı).");
        }

        const isSameUser = Boolean(prevCfg.username && prevCfg.username === norm);
        let loadedFromCloud = false;
        let gistId = prevCfg.gistId || "";

        // 1. Önceki kullanıcı farklıysa mevcut ilerlemesini GitHub Gist'e kaydet
        if (prevCfg.username && !isSameUser) {
            await this.syncToGitHubGist({ silent: true });
        }

        // 2. Yerel önbelleği ve önceki kişinin Gemini API anahtarını sıfırla (tamamen bulut tabanlı)
        await this.resetProgressKeepWords({ syncResetToCloud: false });
        const existingAi = await this.get("settings", "aiConfig");
        await this.put("settings", {
            ...(existingAi || {}),
            key: "aiConfig",
            apiKey: "",
            model: "gemini-3.8-flash",
            preferredScenario: "Günlük Hayat",
            updatedAt: ""
        });

        await this.saveCloudConfig({ username: displayName });

        // 3. Seçilen kullanıcının tüm ilerlemesini ve Gemini API Key'ini GitHub Gist'ten çek
        const pullRes = await this.pullFromGitHubGist({ silent: false, merge: false });
        gistId = pullRes?.gistId || gistId;
        if (pullRes?.applied) {
            loadedFromCloud = true;
        } else {
            await this.syncToGitHubGist({ silent: true, forceOverwrite: true });
        }

        return { username: norm, displayName, loadedFromCloud, gistId };
    }

    scheduleCloudSync() {
        if (this._isRestoringOrSyncing) return;
        if (this._cloudSyncTimer) clearTimeout(this._cloudSyncTimer);
        this._cloudSyncTimer = setTimeout(async () => {
            try {
                const cfg = await this.getCloudConfig();
                if (cfg.githubToken && cfg.username) {
                    await this.syncToGitHubGist({ silent: true });
                }
            } catch (_) {}
        }, 2500);
    }
}

window.dbManager = new DatabaseManager();
