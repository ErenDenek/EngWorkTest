// gameEngine.js - Çekirdek Oyun Döngüsü, 4 Aşamalı Günlük İlerleme ve SRS / Hata Telafi Sınavı

class GameEngine {
    constructor() {
        this.totalMapDays = 7; // Haritada gösterilen gün durağı sayısı (dinamik uzar)
        this.currentDayNumber = 1;
        this.activeDayData = null;
    }

    async init() {
        await window.dbManager.init();
        const profile = await window.dbManager.get("settings", "profile");
        this.currentDayNumber = profile?.currentDay || 1;
        if (this.currentDayNumber >= this.totalMapDays) {
            this.totalMapDays = this.currentDayNumber + 3;
        }
        await this.ensureDayInitialized(this.currentDayNumber);
        return this.getMapOverview();
    }

    // Belirli bir Günün (Day 1, Day 2...) 3 kelime + 3 kalıp ve 4 aşama verisini (Kullanıcının seçtiği CEFR seviyesine göre) hazırla
    async ensureDayInitialized(dayNumber, forceRefreshForLevel = false) {
        let dayData = await window.dbManager.get("days", dayNumber);
        if (dayData && !forceRefreshForLevel) {
            this.activeDayData = dayData;
            return dayData;
        }

        const profile = await window.dbManager.get("settings", "profile");
        const targetCefr = profile?.cefrLevel || "B1";

        const allVocab = await window.dbManager.getAll("vocabulary");
        const allDays = await window.dbManager.getAll("days");

        // Daha önceki günlerde seçilmiş kelimeleri tekrar seçmemeye çalış
        const usedIds = new Set();
        allDays.forEach(d => {
            if (d.dayNumber !== dayNumber) {
                (d.wordIds || []).forEach(id => usedIds.add(id));
                (d.phraseIds || []).forEach(id => usedIds.add(id));
            }
        });

        // 1. Öncelik: Kullanıcının seçtiği CEFR seviyesindeki ('A1','A2','B1','B2','C1') veya özel eklediği kelimeler
        const levelWords = allVocab.filter(v => v.category === "word" && !usedIds.has(v.id) && v.status !== "mastered" && (v.cefr === targetCefr || v.customAdded));
        const levelPhrases = allVocab.filter(v => v.category === "phrase" && !usedIds.has(v.id) && v.status !== "mastered" && (v.cefr === targetCefr || v.customAdded));

        // 2. Öncelik: Herhangi bir kullanılmamış kelime/kalıp
        const availableWords = allVocab.filter(v => v.category === "word" && !usedIds.has(v.id) && v.status !== "mastered");
        const availablePhrases = allVocab.filter(v => v.category === "phrase" && !usedIds.has(v.id) && v.status !== "mastered");

        const fallbackWords = allVocab.filter(v => v.category === "word");
        const fallbackPhrases = allVocab.filter(v => v.category === "phrase");

        const selectedWords = [...levelWords, ...availableWords.filter(w => !levelWords.includes(w)), ...fallbackWords].slice(0, 3);
        const selectedPhrases = [...levelPhrases, ...availablePhrases.filter(p => !levelPhrases.includes(p)), ...fallbackPhrases].slice(0, 3);

        dayData = {
            dayNumber,
            cefrLevel: targetCefr,
            title: this.getDayTitle(dayNumber),
            unlocked: dayNumber <= (profile?.currentDay || 1),
            completed: dayData?.completed || false,
            currentStage: dayData?.currentStage || 1,
            wordIds: selectedWords.map(w => w.id),
            phraseIds: selectedPhrases.map(p => p.id),
            stageStatus: dayData?.stageStatus || {
                1: { unlocked: true, completed: false, decisions: {} },
                2: { unlocked: false, completed: false, decisions: {} },
                3: { unlocked: false, completed: false, scenario: "Günlük Hayat", sentences: [], results: [] },
                4: { unlocked: false, completed: false, story: null, evaluation: null }
            },
            updatedAt: new Date().toISOString()
        };

        await window.dbManager.put("days", dayData);
        this.activeDayData = dayData;
        return dayData;
    }

    // Kullanıcı İngilizce Seviyesini (CEFR) Değiştirdiğinde Henüz Tamamlanmamış Günlerin Kelimelerini Yeni Seviyeye Göre Yenile
    async updateTargetCefrLevel(newCefrLevel) {
        const profile = await window.dbManager.get("settings", "profile");
        if (profile) {
            profile.cefrLevel = newCefrLevel;
            await window.dbManager.put("settings", profile);
        }

        const allDays = await window.dbManager.getAll("days");
        for (const d of allDays) {
            if (!d.completed) {
                await this.ensureDayInitialized(d.dayNumber, true);
            }
        }
        await this.ensureDayInitialized(this.currentDayNumber, true);
    }

    getDayTitle(dayNum) {
        const titles = [
            "Başlangıç Vadisi: Çekirdek Eylemler",
            "Bağlam Ormanı: İş & Günlük Nüanslar",
            "Kalıplar Köprüsü: Akıcı Bağlaçlar",
            "Strateji Kulesi: Profesyonel İletişim",
            "Algoritma Kalesi: Teknik & Soyut Düşünce",
            "Hitabet Limanı: İkna & Müzakere",
            "Ustalık Zirvesi: Doğal Akış"
        ];
        return titles[(dayNum - 1) % titles.length] || `Gün ${dayNum}: İleri Seviye Keşif`;
    }

    // Harita Görünümü İçin Tüm Günlerin Durumu
    async getMapOverview() {
        const profile = await window.dbManager.get("settings", "profile");
        this.currentDayNumber = profile?.currentDay || 1;
        const maxDays = Math.max(this.totalMapDays, this.currentDayNumber + 2);

        const daysList = [];
        for (let d = 1; d <= maxDays; d++) {
            let dayObj = await window.dbManager.get("days", d);
            if (!dayObj && d <= this.currentDayNumber) {
                dayObj = await this.ensureDayInitialized(d);
            } else if (!dayObj) {
                dayObj = {
                    dayNumber: d,
                    title: this.getDayTitle(d),
                    unlocked: false,
                    completed: false,
                    currentStage: 1,
                    stageStatus: {
                        1: { unlocked: false, completed: false },
                        2: { unlocked: false, completed: false },
                        3: { unlocked: false, completed: false },
                        4: { unlocked: false, completed: false }
                    }
                };
            }
            if (d <= this.currentDayNumber) {
                dayObj.unlocked = true;
            }
            daysList.push(dayObj);
        }

        const dueSRS = await window.dbManager.getDueSRSWords();
        return {
            profile,
            currentDayNumber: this.currentDayNumber,
            days: daysList,
            dueSRSCount: dueSRS.length
        };
    }

    // Bir Günün Kelime ve Kalıp Detaylarını Getir
    async getDayFullDetails(dayNumber) {
        const day = await this.ensureDayInitialized(dayNumber);
        const words = [];
        for (const id of day.wordIds) {
            const w = await window.dbManager.get("vocabulary", id);
            if (w) words.push(w);
        }
        const phrases = [];
        for (const id of day.phraseIds) {
            const p = await window.dbManager.get("vocabulary", id);
            if (p) phrases.push(p);
        }
        return { day, words, phrases };
    }

    // Aşama 1 veya Aşama 2 Tamamlama
    async completeVocabStage(dayNumber, stageNum, decisionsMap) {
        const day = await this.ensureDayInitialized(dayNumber);

        // Her kelime/kalıp için kullanıcının seçtiği SRS aksiyonunu uygula ('learn', 'mastered', 'review_list')
        for (const [termId, action] of Object.entries(decisionsMap)) {
            await window.dbManager.updateWordSRS(termId, action);
        }

        day.stageStatus[stageNum].completed = true;
        day.stageStatus[stageNum].decisions = decisionsMap;

        const nextStage = stageNum + 1;
        if (day.stageStatus[nextStage]) {
            day.stageStatus[nextStage].unlocked = true;
            if (day.currentStage < nextStage) {
                day.currentStage = nextStage;
            }
        }

        day.updatedAt = new Date().toISOString();
        await window.dbManager.put("days", day);
        await window.dbManager.logDailyActivity(30, 0, null);
        return day;
    }

    // Aşama 3 (Aktif Çeviri Arenası - 10 Cümle) Sonuç Kaydı ve Tamamlama
    async saveArenaResult(dayNumber, sentenceIndex, resultObj) {
        const day = await this.ensureDayInitialized(dayNumber);
        if (!Array.isArray(day.stageStatus[3].results)) {
            day.stageStatus[3].results = [];
        }
        day.stageStatus[3].results[sentenceIndex] = resultObj;

        // Hata yapılan hedef kelimeler varsa Hata Kumbarasına ekle
        const { words, phrases } = await this.getDayFullDetails(dayNumber);
        const allDayTerms = [...words, ...phrases];

        if (resultObj.score < 70 || (resultObj.missedTargets && resultObj.missedTargets.length > 0)) {
            const missedNames = resultObj.missedTargets && resultObj.missedTargets.length > 0
                ? resultObj.missedTargets
                : (resultObj.targetTerms || []);

            for (const mName of missedNames) {
                const matched = allDayTerms.find(t => t.term.toLowerCase() === mName.toLowerCase());
                if (matched) {
                    await window.dbManager.recordMistake(
                        matched,
                        resultObj.userEnglish,
                        resultObj.grammarFeedback
                    );
                }
            }
        } else {
            // Doğru kullanılan kelimelerin SRS sayacını ödüllendir
            for (const tName of (resultObj.targetTerms || [])) {
                const matched = allDayTerms.find(t => t.term.toLowerCase() === tName.toLowerCase());
                if (matched) {
                    await window.dbManager.updateWordSRS(matched.id, "srs_success");
                }
            }
        }

        await window.dbManager.put("days", day);
        await window.dbManager.logDailyActivity(15, 1, resultObj.score);
        return day;
    }

    async completeArenaStage(dayNumber) {
        const day = await this.ensureDayInitialized(dayNumber);
        day.stageStatus[3].completed = true;
        day.stageStatus[4].unlocked = true;
        if (day.currentStage < 4) {
            day.currentStage = 4;
        }
        day.updatedAt = new Date().toISOString();
        await window.dbManager.put("days", day);
        await window.dbManager.logDailyActivity(50, 0, null);
        return day;
    }

    // Aşama 4 (Gün Sonu Hikayesi - Boss Battle) Tamamlama ve Sonraki Günü Açma
    async completeBossStage(dayNumber, storyObj, evaluationObj) {
        const day = await this.ensureDayInitialized(dayNumber);
        day.stageStatus[4].completed = true;
        day.stageStatus[4].story = storyObj;
        day.stageStatus[4].evaluation = evaluationObj;
        day.completed = true;
        day.updatedAt = new Date().toISOString();
        await window.dbManager.put("days", day);

        // Sonraki günü aç ve profili ilerlet
        const nextDayNum = dayNumber + 1;
        const nextDay = await this.ensureDayInitialized(nextDayNum);
        nextDay.unlocked = true;
        await window.dbManager.put("days", nextDay);

        const profile = await window.dbManager.get("settings", "profile");
        if (profile) {
            if (profile.currentDay <= dayNumber) {
                profile.currentDay = nextDayNum;
            }
            const allDays = await window.dbManager.getAll("days");
            profile.completedDaysCount = allDays.filter(d => d.completed).length;
            await window.dbManager.put("settings", profile);
        }

        await window.dbManager.logDailyActivity(100, 1, evaluationObj.score);
        this.currentDayNumber = nextDayNum;
        return { completedDay: day, nextDay };
    }
}

window.gameEngine = new GameEngine();
