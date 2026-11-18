// ui.js - Görsel SVG Harita Motoru, 4 Aşamalı Arena Arayüzü, İstatistik Dashboard ve Konfeti Efekti

class UIController {
    constructor() {
        this.selectedDayNumber = 1;
        this.activeScenario = "Günlük Hayat";
        this.arenaIndex = 0;
        this.arenaSentences = [];
        this.activeVocabSubtab = "word"; // 'word' | 'phrasal' | 'connector' | 'mistakes' | 'all'
        this.vocabRenderLimit = 100;
    }

    async init() {
        const overview = await window.gameEngine.init();
        this.selectedDayNumber = overview.currentDayNumber;

        // Tema ayarı
        const theme = overview.profile?.theme || "dark";
        document.documentElement.setAttribute("data-theme", theme);
        document.getElementById("btn-theme-toggle").textContent = theme === "dark" ? "🌙" : "☀️";

        this.bindGlobalEvents();
        await this.refreshAllViews();
        await this.checkFirstRunApiPrompt();
    }

    bindGlobalEvents() {
        // Sekme Geçişleri
        document.querySelectorAll(".tab-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
                document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
                btn.classList.add("active");
                const targetId = btn.getAttribute("data-tab");
                document.getElementById(targetId).classList.add("active");

                if (targetId === "vocab-view") await this.renderVocabLibrary();
                if (targetId === "stats-view") await this.renderStatsDashboard();
                if (targetId === "settings-view") await this.loadSettingsForm();
                if (targetId === "map-view") await this.renderMapAndQuest();
                if (targetId === "sentence-practice-view") await this.renderSentencePracticeSetup();
                if (targetId === "vocab-test-view") await this.renderVocabTestSetup();
            });
        });

        // Karanlık / Aydınlık Mod
        document.getElementById("btn-theme-toggle").addEventListener("click", async () => {
            const current = document.documentElement.getAttribute("data-theme") || "dark";
            const next = current === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            document.getElementById("btn-theme-toggle").textContent = next === "dark" ? "🌙" : "☀️";

            const profile = await window.dbManager.get("settings", "profile");
            if (profile) {
                profile.theme = next;
                await window.dbManager.put("settings", profile);
            }
        });

        // Hızlı Kelime / Phrasal Verb / Bağlaç Ekleme Butonları
        document.getElementById("btn-quick-add-word").addEventListener("click", () => this.openAddWordModal("word"));
        document.getElementById("btn-open-add-word-modal").addEventListener("click", () => this.openAddWordModal("word"));
        const btnAddPhrasal = document.getElementById("btn-open-add-phrasal-modal");
        if (btnAddPhrasal) btnAddPhrasal.addEventListener("click", () => this.openAddWordModal("phrasal"));
        const btnAddConnector = document.getElementById("btn-open-add-connector-modal");
        if (btnAddConnector) btnAddConnector.addEventListener("click", () => this.openAddWordModal("connector"));

        document.querySelectorAll("#add-type-preset-pills .scenario-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                this.applyAddModalPreset(pill.getAttribute("data-preset"));
            });
        });

        // Toplu Eksik Yan Anlamları AI ile Tamamla (3-4 Anlam)
        const btnBulkEnrich = document.getElementById("btn-bulk-ai-enrich");
        if (btnBulkEnrich) {
            btnBulkEnrich.addEventListener("click", () => this.handleBulkAIEnrichMeanings());
        }

        // Üst Çubuktan İngilizce Seviyesi (CEFR) Değiştirme
        const hudCefr = document.getElementById("hud-cefr-select");
        if (hudCefr) {
            hudCefr.addEventListener("change", async (e) => {
                const newLvl = e.target.value;
                await window.gameEngine.updateTargetCefrLevel(newLvl);
                this.showToast(`🎓 İngilizce seviyeniz ${newLvl} olarak güncellendi! Günlük kelimeler ve cümleler ${newLvl} seviyesine göre uyarlandı.`);
                await this.refreshAllViews();
            });
        }

        document.getElementById("btn-close-add-word-modal").addEventListener("click", () => {
            document.getElementById("add-word-modal-overlay").style.display = "none";
        });

        // Aşama Modal Kapatma
        document.getElementById("btn-close-stage-modal").addEventListener("click", () => {
            document.getElementById("stage-modal-overlay").style.display = "none";
        });

        // AI ile Kelime Doldur
        document.getElementById("btn-ai-autofill-word").addEventListener("click", () => this.handleAIAutofillWord());

        // Özel Kelimeyi Kaydet
        document.getElementById("btn-save-custom-word").addEventListener("click", () => this.handleSaveCustomWord());

        // Kelime Paketleri & AI Toplu Kelime İndirme Merkezi Modalı
        const btnOpenPackModal = document.getElementById("btn-open-word-pack-modal");
        if (btnOpenPackModal) {
            btnOpenPackModal.addEventListener("click", () => {
                document.getElementById("word-pack-modal-overlay").style.display = "flex";
            });
        }
        const btnClosePackModal = document.getElementById("btn-close-word-pack-modal");
        if (btnClosePackModal) {
            btnClosePackModal.addEventListener("click", () => {
                document.getElementById("word-pack-modal-overlay").style.display = "none";
            });
        }

        // Hazır Seviye Paketlerini Yükle
        document.querySelectorAll(".btn-load-pack-filter").forEach(btn => {
            btn.addEventListener("click", async () => {
                const lvl = btn.getAttribute("data-lvl") || "ALL";
                const cat = btn.getAttribute("data-cat") || "ALL";
                const count = await window.dbManager.loadExtendedOxfordPack(lvl, cat);
                this.showToast(count > 0
                    ? `📦 ${count} yeni kelime/kalıp (${lvl === "ALL" ? "Karışık" : lvl}) havuza eklendi!`
                    : "📦 Bu paketteki tüm kelimeler zaten havuzunuzda mevcut.");
                await this.renderVocabLibrary();
                await this.updateHUD();
            });
        });

        // AI ile 15 Yeni Kelime Üret & Havuza Ekle
        const btnGenAIPack = document.getElementById("btn-generate-ai-vocab-pack");
        if (btnGenAIPack) {
            btnGenAIPack.addEventListener("click", async () => {
                const lvl = document.getElementById("ai-pack-level").value;
                const catType = document.getElementById("ai-pack-type").value;
                const topic = document.getElementById("ai-pack-topic").value.trim() || "Günlük Hayat";
                btnGenAIPack.disabled = true;
                btnGenAIPack.textContent = "⏳ AI 15 Kelime Üretiyor...";
                try {
                    const existing = await window.dbManager.getAll("vocabulary");
                    const existingTerms = existing.map(x => x.term);
                    const items = await window.geminiService.generateBulkVocabularyPack(lvl, catType, topic, existingTerms, 15);
                    const added = await window.dbManager.importBulkVocabulary(items);
                    this.showToast(`✨ AI tarafından üretilen ${added} yeni ${lvl} kelimesi/kalıbı havuza eklendi!`);
                    await this.renderVocabLibrary();
                    await this.updateHUD();
                } catch (err) {
                    this.showToast("❌ " + err.message);
                } finally {
                    btnGenAIPack.disabled = false;
                    btnGenAIPack.textContent = "✨ AI ile 15 Kelime İndir";
                }
            });
        }

        // Doğrudan Üst Çubuktan "🤖 Olmayan Kelimeleri AI ile Bul & Ekle"
        const btnFindMissingAI = document.getElementById("btn-ai-find-missing-words");
        if (btnFindMissingAI) {
            btnFindMissingAI.addEventListener("click", () => this.handleFindMissingWordsWithAI(btnFindMissingAI));
        }

        // Klasördeki oxford_3000.json Dosyasını Tek Tıkla Yükle (CORS olursa dosya seçiciyi otomatik açar)
        const btnLoadLocalOx3000 = document.getElementById("btn-load-local-oxford3000");
        if (btnLoadLocalOx3000) {
            btnLoadLocalOx3000.addEventListener("click", async () => {
                btnLoadLocalOx3000.disabled = true;
                btnLoadLocalOx3000.textContent = "⏳ Yükleniyor...";
                try {
                    const res = await fetch("./oxford_3000.json");
                    if (!res.ok) throw new Error("Yerel dosya doğrudan okunamadı");
                    const parsed = await res.json();
                    const added = await window.dbManager.importBulkVocabulary(parsed);
                    document.getElementById("word-pack-modal-overlay").style.display = "none";
                    this.showToast(`📚 oxford_3000.json başarıyla yüklendi: ${added} yeni kelime havuza eklendi!`);
                    await this.renderVocabLibrary();
                    await this.updateHUD();
                } catch (err) {
                    // file:// protokolünde tarayıcı güvenlik kısıtı varsa dosya seçiciyi doğrudan aç
                    this.showToast("📂 Lütfen açılan pencereden oxford_3000.json dosyasını seçin.");
                    document.getElementById("word-pack-modal-overlay").style.display = "none";
                    document.getElementById("input-bulk-vocab").click();
                } finally {
                    btnLoadLocalOx3000.disabled = false;
                    btnLoadLocalOx3000.textContent = "📚 oxford_3000.json (3.845 Kelime) İçe Aktar";
                }
            });
        }

        // Örnek CSV Şablonunu İndir
        const btnSampleCsv = document.getElementById("btn-download-sample-csv");
        if (btnSampleCsv) {
            btnSampleCsv.addEventListener("click", () => {
                const sampleCsv = [
                    "term,pos,cefr,tr,example",
                    "apple,noun,A1,elma,I eat an apple every morning.",
                    "happy,adjective,A1,mutlu,She is very happy today.",
                    "wake up,phrasal verb,A1,uyanmak,I wake up at seven.",
                    "because,connector,A1,çünkü,I stay home because it is raining.",
                    "decide,verb,A2,karar vermek,We decided to learn English."
                ].join("\n");
                const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "ornek_kelime_sablonu.csv";
                a.click();
                URL.revokeObjectURL(url);
                this.showToast("⬇️ Örnek CSV şablonu indirildi!");
            });
        }

        // Dışarıdan Toplu JSON / CSV Yükle (Oxford 3000 / NGSL Formatı)
        document.getElementById("input-bulk-vocab").addEventListener("change", (e) => this.handleBulkVocabUpload(e));

        // Kelime Arama, Sıralama & Alt Sekme Filtreleme
        ["vocab-search", "vocab-filter-status", "vocab-filter-cefr", "vocab-sort-order"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => {
                    this.vocabRenderLimit = 100;
                    this.renderVocabLibrary();
                });
                el.addEventListener("change", () => {
                    this.vocabRenderLimit = 100;
                    this.renderVocabLibrary();
                });
            }
        });

        document.querySelectorAll("#vocab-subtabs .vocab-subtab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#vocab-subtabs .vocab-subtab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.activeVocabSubtab = btn.getAttribute("data-subtab");
                this.vocabRenderLimit = 100;
                if (this.activeVocabSubtab === "mistakes") {
                    const sortEl = document.getElementById("vocab-sort-order");
                    if (sortEl) sortEl.value = "most_wrong";
                }
                this.renderVocabLibrary();
            });
        });

        // Günlük SRS Isınma Turu
        document.getElementById("btn-warmup-srs").addEventListener("click", () => this.openSRSWarmupModal());

        // Hata Telafi Sınavı Başlat
        document.getElementById("btn-start-mistake-exam").addEventListener("click", () => this.openMistakeRecoveryExam());

        // Ayarlar & API Key Kaydetme
        document.getElementById("btn-toggle-key-vis").addEventListener("click", () => {
            const inp = document.getElementById("setting-api-key");
            inp.type = inp.type === "password" ? "text" : "password";
        });
        document.getElementById("btn-save-settings").addEventListener("click", () => this.saveSettingsForm());
        document.getElementById("btn-test-api").addEventListener("click", () => this.testGeminiConnection());
        document.getElementById("btn-scan-models").addEventListener("click", () => {
            const keyVal = document.getElementById("setting-api-key").value.trim();
            this.scanAndPopulateModels(keyVal, "setting-ai-model", "model-scan-info");
        });

        // Üstteki AI Durum Rozetine tıklayınca da API Kurulum/Model Tarama penceresini aç
        document.getElementById("hud-ai-mode").style.cursor = "pointer";
        document.getElementById("hud-ai-mode").addEventListener("click", () => {
            this.openOnboardingModal();
        });

        // İlk Kurulum (Onboarding) Modal Eventleri
        document.getElementById("btn-close-onboarding").addEventListener("click", () => {
            document.getElementById("api-onboarding-modal").style.display = "none";
        });
        document.getElementById("btn-onboard-skip-demo").addEventListener("click", () => {
            document.getElementById("api-onboarding-modal").style.display = "none";
            this.showToast("🧪 Demo Modu aktif. İstediğiniz zaman sağ üstten veya Ayarlar'dan Gemini API Key girebilirsiniz.");
        });
        document.getElementById("btn-onboard-toggle-vis").addEventListener("click", () => {
            const inp = document.getElementById("onboard-api-key");
            inp.type = inp.type === "password" ? "text" : "password";
        });
        document.getElementById("btn-onboard-scan-models").addEventListener("click", () => {
            const keyVal = document.getElementById("onboard-api-key").value.trim();
            this.scanAndPopulateModels(keyVal, "onboard-ai-model", "onboard-scan-status");
        });
        document.getElementById("btn-onboard-save-start").addEventListener("click", async () => {
            const keyVal = document.getElementById("onboard-api-key").value.trim();
            const modelVal = document.getElementById("onboard-ai-model").value;
            if (!keyVal) {
                this.showToast("⚠️ Lütfen önce Google Gemini API Key girin veya Demo Modunu seçin.");
                return;
            }
            const aiConfig = await window.geminiService.getConfig();
            await window.dbManager.put("settings", {
                ...aiConfig,
                key: "aiConfig",
                apiKey: keyVal,
                model: modelVal
            });
            document.getElementById("api-onboarding-modal").style.display = "none";
            await this.updateHUD();
            await this.loadSettingsForm();
            this.showToast(`✅ Gemini API Key ve "${modelVal}" modeli kaydedildi!`);
        });

        // JSON Backup, Sadece Kelime Paylaşımı & İlerleme Sıfırlama
        document.getElementById("btn-export-json").addEventListener("click", () => this.exportBackupFile());
        document.getElementById("input-import-json").addEventListener("change", (e) => this.importBackupFile(e));

        const btnExportWordsOnly = document.getElementById("btn-export-words-only");
        if (btnExportWordsOnly) {
            btnExportWordsOnly.addEventListener("click", () => this.exportWordsOnlyFile());
        }

        const btnResetKeepWords = document.getElementById("btn-reset-progress-keep-words");
        if (btnResetKeepWords) {
            btnResetKeepWords.addEventListener("click", () => this.handleResetProgressKeepWords());
        }
    }

    async refreshAllViews() {
        await this.updateHUD();
        await this.renderMapAndQuest();
    }

    async updateHUD() {
        const profile = await window.dbManager.get("settings", "profile");
        const dueSRS = await window.dbManager.getDueSRSWords();
        const isLive = await window.geminiService.isLiveMode();

        if (profile) {
            document.getElementById("hud-streak").textContent = profile.streak || 0;
            document.getElementById("hud-xp").textContent = `${profile.xp || 0} XP`;
            document.getElementById("hud-level").textContent = `Lv.${profile.level || 1}`;
            const hudCefr = document.getElementById("hud-cefr-select");
            if (hudCefr && profile.cefrLevel) {
                hudCefr.value = profile.cefrLevel;
            }
        }

        const badge = document.getElementById("srs-due-badge");
        const warmupCnt = document.getElementById("warmup-count");
        if (warmupCnt) warmupCnt.textContent = dueSRS.length;
        if (dueSRS.length > 0) {
            badge.style.display = "inline-block";
            badge.textContent = dueSRS.length;
        } else {
            badge.style.display = "none";
        }

        const aiPill = document.getElementById("hud-ai-mode");
        const dot = aiPill.querySelector(".status-dot");
        const txt = document.getElementById("hud-ai-text");
        if (isLive) {
            dot.className = "status-dot live";
            txt.textContent = "Gemini AI Aktif";
        } else {
            dot.className = "status-dot demo";
            txt.textContent = "Demo Modu";
        }
    }

    // =========================================================================
    // 1. KIVRIMLI SVG İLERLEME HARİTASI VE 4 AŞAMALI GÜNLÜK GÖREV PANELİ
    // =========================================================================
    async renderMapAndQuest() {
        const overview = await window.gameEngine.getMapOverview();
        const container = document.getElementById("svg-map-container");
        const days = overview.days;
        const avatarEmoji = overview.profile?.avatar || "🧙‍♂️";

        // Kıvrımlı S-Eğrisi SVG Koordinatları Hesaplama
        const nodeSpacingY = 95;
        const svgHeight = Math.max(600, days.length * nodeSpacingY + 90);
        const svgWidth = 500;

        const coords = days.map((d, idx) => {
            const y = svgHeight - 65 - idx * nodeSpacingY;
            const wave = Math.sin(idx * 1.15) * 125;
            const x = Math.round(svgWidth / 2 + wave);
            return { x, y, day: d };
        });

        // Yumuşak Bezier Path Oluşturma
        let fullPathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 0; i < coords.length - 1; i++) {
            const curr = coords[i];
            const next = coords[i + 1];
            const midY = (curr.y + next.y) / 2;
            fullPathD += ` C ${curr.x} ${midY}, ${next.x} ${midY}, ${next.x} ${next.y}`;
        }

        // Aktif ilerleme yolu
        const unlockedIndex = Math.max(0, coords.findIndex(c => c.day.dayNumber === overview.currentDayNumber));
        let activePathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 0; i < unlockedIndex; i++) {
            const curr = coords[i];
            const next = coords[i + 1];
            const midY = (curr.y + next.y) / 2;
            activePathD += ` C ${curr.x} ${midY}, ${next.x} ${midY}, ${next.x} ${next.y}`;
        }

        const activeCoord = coords.find(c => c.day.dayNumber === this.selectedDayNumber) || coords[unlockedIndex] || coords[0];

        let nodesSvg = "";
        coords.forEach(({ x, y, day }) => {
            const isSelected = day.dayNumber === this.selectedDayNumber;
            const isCompleted = day.completed;
            const isUnlocked = day.unlocked;

            const fill = isCompleted ? "#10b981" : (isUnlocked ? "#6366f1" : "#334155");
            const stroke = isSelected ? "#fbbf24" : "#ffffff";
            const strokeW = isSelected ? 5 : 2.5;
            const icon = isCompleted ? "⭐" : (isUnlocked ? `GÜN ${day.dayNumber}` : "🔒");

            nodesSvg += `
                <g class="map-node-group" data-day="${day.dayNumber}" transform="translate(${x}, ${y})">
                    ${isSelected ? `<circle r="38" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5,5" />` : ""}
                    <circle r="29" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />
                    <text y="5" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="800">${icon}</text>
                    <rect x="-85" y="34" width="170" height="22" rx="6" fill="rgba(15,23,42,0.85)" />
                    <text y="49" text-anchor="middle" fill="#e2e8f0" font-size="10.5" font-weight="600">
                        Gün ${day.dayNumber}: ${day.title.split(":")[0]}
                    </text>
                </g>
            `;
        });

        // Avatar Düğümü
        const avatarSvg = `
            <g class="avatar-walker" id="map-avatar-token" transform="translate(${activeCoord.x}, ${activeCoord.y - 44})">
                <circle r="22" fill="#0f172a" stroke="#10b981" stroke-width="3" />
                <text y="8" text-anchor="middle" font-size="22">${avatarEmoji}</text>
            </g>
        `;

        container.innerHTML = `
            <svg class="adventure-svg" viewBox="0 0 ${svgWidth} ${svgHeight}">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                <!-- Arka Plan Patika -->
                <path d="${fullPathD}" fill="none" stroke="var(--map-trail-bg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="14 10" />
                <!-- Tamamlanan Parlak Patika -->
                <path d="${activePathD}" fill="none" stroke="var(--map-trail-active)" stroke-width="8" stroke-linecap="round" filter="url(#glow)" />
                ${nodesSvg}
                ${avatarSvg}
            </svg>
        `;

        // Gün düğümlerine tıklama
        container.querySelectorAll(".map-node-group").forEach(node => {
            node.addEventListener("click", async () => {
                const clickedDay = parseInt(node.getAttribute("data-day"), 10);
                const targetObj = days.find(d => d.dayNumber === clickedDay);
                if (!targetObj || !targetObj.unlocked) {
                    this.showToast("🔒 Bu gün henüz kilitli! Önceki günün 4 aşamasını tamamlayın.");
                    return;
                }
                this.selectedDayNumber = clickedDay;
                await this.renderMapAndQuest();
            });
        });

        await this.renderDayQuestPanel(this.selectedDayNumber);
    }

    async renderDayQuestPanel(dayNumber) {
        const panel = document.getElementById("day-quest-panel");
        const { day, words, phrases } = await window.gameEngine.getDayFullDetails(dayNumber);

        const stageMeta = [
            {
                num: 1,
                icon: "🔍",
                name: "Aşama 1: Kelime Avı Testi (Karışık Havuz & Yan Anlamlar)",
                desc: "Öğrenilmeyi bekleyen kelimelerden doğrudan çift yönlü (EN↔TR) çoktan seçmeli test."
            },
            {
                num: 2,
                icon: "🧩",
                name: "Aşama 2: Bağlaç & Phrasal Verb Testi",
                desc: "Havuzdaki bağlaç ve phrasal verblerden doğrudan çift yönlü çoktan seçmeli test."
            },
            {
                num: 3,
                icon: "⚔️",
                name: "Aşama 3: Aktif Çeviri Arenası (10 Cümle)",
                desc: "Günün kelime ve kalıplarını içeren 10 Türkçe -> İngilizce çeviri ve 3 katmanlı AI analizi."
            },
            {
                num: 4,
                icon: "🐉",
                name: "Aşama 4: Gün Sonu Hikayesi (Boss Battle)",
                desc: "Tüm hedef ifadelerin birleştiği İngilizce hikayeyi Türkçeye çevir ve günü tamamla!"
            }
        ];

        const stagesHtml = stageMeta.map(s => {
            const st = day.stageStatus[s.num] || { unlocked: false, completed: false };
            const stateClass = st.completed ? "completed" : (st.unlocked ? "unlocked" : "locked");
            const btnLabel = st.completed ? "Tekrar Oyna ✓" : (st.unlocked ? "Başlat ▶" : "🔒 Kilitli");
            const btnClass = st.completed ? "btn-secondary" : (st.unlocked ? "btn-primary" : "btn-secondary");

            return `
                <div class="stage-step-card ${stateClass}">
                    <div class="stage-step-left">
                        <div class="stage-icon-circle">${s.icon}</div>
                        <div>
                            <h4>${s.name}</h4>
                            <p class="text-muted">${s.desc}</p>
                        </div>
                    </div>
                    <button class="btn ${btnClass} btn-sm btn-launch-stage" data-stage="${s.num}" ${!st.unlocked ? "disabled" : ""}>
                        ${btnLabel}
                    </button>
                </div>
            `;
        }).join("");

        panel.innerHTML = `
            <div class="quest-day-banner">
                <span class="quest-day-tag">GÜN ${day.dayNumber} ${day.completed ? "• TAMAMLANDI 🏆" : "• AKTİF GÖREV"}</span>
                <h2>${day.title}</h2>
                <p class="text-muted">Her aşama bir sonrakinin kilidini açar. 4. Aşama (Boss Battle) bittiğinde yeni güne geçersin.</p>
            </div>
            <div class="stage-roadmap">
                ${stagesHtml}
            </div>
        `;

        panel.querySelectorAll(".btn-launch-stage").forEach(btn => {
            btn.addEventListener("click", () => {
                const stNum = parseInt(btn.getAttribute("data-stage"), 10);
                this.openStageModal(dayNumber, stNum);
            });
        });
    }

    // =========================================================================
    // 2. AŞAMA 1, 2, 3 ve 4 MODAL PENCERELERİ
    // =========================================================================
    async openStageModal(dayNumber, stageNum) {
        const overlay = document.getElementById("stage-modal-overlay");
        const badge = document.getElementById("stage-modal-badge");
        const title = document.getElementById("stage-modal-title");
        const body = document.getElementById("stage-modal-body");

        overlay.style.display = "flex";
        badge.textContent = `Gün ${dayNumber} • Aşama ${stageNum}`;

        const { day, words, phrases } = await window.gameEngine.getDayFullDetails(dayNumber);

        if (stageNum === 1 || stageNum === 2) {
            const isWords = stageNum === 1;
            title.textContent = isWords ? "🔍 Aşama 1: Kelime Avı Testi (Karışık Havuz)" : "🧩 Aşama 2: Bağlaç & Kalıp Testi (Karışık Havuz)";
            const items = isWords ? words : phrases;
            const currentDecisions = {};
            items.forEach(item => {
                currentDecisions[item.id] = "learn";
            });

            // 3 kart gösterme adımını kaldırıp doğrudan çoktan seçmeli teste geçiyoruz
            await this.renderMultipleChoiceQuiz(dayNumber, stageNum, items, currentDecisions);
        } else if (stageNum === 3) {
            await this.renderStage3Arena(dayNumber, words, phrases);
        } else if (stageNum === 4) {
            await this.renderStage4BossBattle(dayNumber, words, phrases);
        }
    }

    // Kelime veya Phrasal Verb İçin Aşamalı Harf İpucu Maskesi (İstenen sayıda harfi sırayla açar)
    buildWordMaskHint(term, revealCount = 1) {
        const cleanTerm = (term || "").trim();
        let remaining = Math.max(1, revealCount);
        const words = cleanTerm.split(/\s+/);

        const masked = words.map(w => {
            const chars = w.split("").map(ch => {
                if (!/[a-zA-Z0-9]/.test(ch)) return ch;
                if (remaining > 0) {
                    remaining--;
                    return ch;
                }
                return "_";
            });
            return chars.join(" ");
        }).join("   ");

        const letterCount = cleanTerm.replace(/[^a-zA-Z0-9]/g, "").length;
        const shownCount = Math.min(revealCount, letterCount);
        return `${masked}  (${shownCount}/${letterCount} harf${words.length > 1 ? `, ${words.length} kelime` : ""})`;
    }

    // Tekil Yan Anlam Odaklı ve Seçili Soru Tipine Göre (Şıklı + Yazmalı) Soru Üretici
    buildVocabQuizQuestion(item, idx, allVocab, targetCategory = "all", questionTypeMode = "mixed") {
        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
        const meaningsArr = Array.isArray(item.meanings) && item.meanings.length > 0
            ? item.meanings
            : [{ tr: item.term, context: "Genel", example: "" }];

        const chosenMeaningIndex = (typeof item.currentMeaningIndex === "number" ? item.currentMeaningIndex : idx) % meaningsArr.length;
        const targetMeaningObj = meaningsArr[chosenMeaningIndex];
        const singleTrMeaning = targetMeaningObj.tr;
        const meaningContext = targetMeaningObj.context || `${chosenMeaningIndex + 1}. Anlam`;

        let direction;
        if (questionTypeMode === "write_only") {
            direction = "WRITE_EN";
        } else if (questionTypeMode === "mc_only") {
            direction = Math.random() < 0.5 ? "EN_TO_TR" : "TR_TO_EN";
        } else {
            const roll = Math.random();
            direction = roll < 0.45 ? "WRITE_EN" : (roll < 0.725 ? "EN_TO_TR" : "TR_TO_EN");
        }

        if (direction === "WRITE_EN") {
            return {
                type: "WRITE_EN",
                badge: `🇹🇷 Türkçe ➔ ⌨️ İngilizcesini Yaz (${chosenMeaningIndex + 1}. Anlam • ${meaningContext})`,
                promptTitle: singleTrMeaning,
                promptSub: `Bağlam: ${meaningContext} • Tür: ${item.partOfSpeech} • Seviye: ${item.cefr || "B1"}`,
                correctAnswer: item.term,
                options: [],
                termObj: item,
                testedMeaningIndex: chosenMeaningIndex,
                testedMeaningObj: targetMeaningObj
            };
        }

        const sameCatPool = targetCategory !== "all"
            ? allVocab.filter(v => v.id !== item.id && v.category === targetCategory)
            : [];
        const distractorsPool = shuffle(sameCatPool);
        const fallbackDistractors = shuffle(allVocab.filter(v => v.id !== item.id));
        const finalDistractors = (distractorsPool.length >= 3 ? distractorsPool : fallbackDistractors).slice(0, 3);

        if (direction === "EN_TO_TR") {
            const wrongTrOptions = finalDistractors.map(v => {
                const mList = v.meanings || [];
                const pick = mList[Math.floor(Math.random() * mList.length)] || { tr: v.term };
                return pick.tr;
            });
            return {
                type: "EN_TO_TR",
                badge: `🇬🇧 İngilizce ➔ 🇹🇷 Türkçe (${chosenMeaningIndex + 1}. Anlam • ${meaningContext})`,
                promptTitle: item.term,
                promptSub: targetMeaningObj.example
                    ? `Örnek Bağlam: "${targetMeaningObj.example}"`
                    : `Bağlam: ${meaningContext} (${item.partOfSpeech})`,
                correctAnswer: singleTrMeaning,
                options: shuffle([singleTrMeaning, ...wrongTrOptions]),
                termObj: item,
                testedMeaningIndex: chosenMeaningIndex,
                testedMeaningObj: targetMeaningObj
            };
        }

        const wrongEnOptions = finalDistractors.map(v => v.term);
        return {
            type: "TR_TO_EN",
            badge: `🇹🇷 Türkçe ➔ 🇬🇧 İngilizce Seç (${chosenMeaningIndex + 1}. Anlam • ${meaningContext})`,
            promptTitle: singleTrMeaning,
            promptSub: `Bağlam: ${meaningContext} • Tür: ${item.partOfSpeech}`,
            correctAnswer: item.term,
            options: shuffle([item.term, ...wrongEnOptions]),
            termObj: item,
            testedMeaningIndex: chosenMeaningIndex,
            testedMeaningObj: targetMeaningObj
        };
    }

    // Ortak Kelime Soru Etkileşimi (Yazmalı Mod + Çoktan Seçmeli Mod)
    mountVocabQuestionBox(quizBoxEl, q, { onSuccess, onMistake }) {
        let answered = false;
        let wrongTries = 0;
        let hintLvl = 0;
        let answerWasRevealed = false;
        let cooldownTimer = null;

        if (q.type === "WRITE_EN") {
            const totalLetters = (q.correctAnswer || "").replace(/[^a-zA-Z0-9]/g, "").length;
            quizBoxEl.innerHTML = `
                <small class="text-muted">Verilen Türkçe anlamın İngilizce karşılığını aşağıya <strong>yazın</strong>:</small>
                <h2 style="font-size:1.65rem;margin:0.45rem 0;color:var(--accent-primary);">${q.promptTitle}</h2>
                <p class="text-muted">${q.promptSub}</p>

                <div class="form-group" style="margin-top:1rem;">
                    <div class="input-with-btn">
                        <input type="text" id="quiz-write-input" class="form-input" autocomplete="off" spellcheck="false"
                            placeholder="İngilizce kelimeyi veya kalıbı yazın (Enter ile kontrol et)..." />
                        <button type="button" class="btn btn-primary" id="btn-quiz-check-write">✅ Kontrol Et</button>
                    </div>
                    <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;align-items:center;">
                        <button type="button" class="hint-chip-btn" id="btn-quiz-write-hint">💡 Harf Al (+1 Harf)</button>
                        <button type="button" class="hint-chip-btn" id="btn-quiz-reveal-answer" style="display:none;color:var(--accent-warning);">👁️ Cevabı Göster</button>
                    </div>
                    <div id="quiz-write-hint-box" class="hint-reveal-box" style="display:none;"></div>
                </div>
                <div id="quiz-step-feedback" style="margin-top:1rem;"></div>
            `;

            const inputEl = document.getElementById("quiz-write-input");
            const checkBtn = document.getElementById("btn-quiz-check-write");
            const hintBtn = document.getElementById("btn-quiz-write-hint");
            const revealBtn = document.getElementById("btn-quiz-reveal-answer");
            const hintBox = document.getElementById("quiz-write-hint-box");
            const fbEl = document.getElementById("quiz-step-feedback");

            setTimeout(() => inputEl && inputEl.focus(), 40);

            // Her 7 saniyede bir sınırsız harf alma hakkı
            hintBtn.addEventListener("click", () => {
                if (answered || hintBtn.disabled) return;
                hintLvl++;
                hintBox.style.display = "block";
                hintBox.innerHTML = `💡 <strong>Harf İpucu:</strong> <code style="font-size:0.98rem;letter-spacing:1.2px;">${this.buildWordMaskHint(q.correctAnswer, hintLvl)}</code>`;
                inputEl.focus();

                if (hintLvl >= totalLetters) {
                    hintBtn.disabled = true;
                    hintBtn.textContent = "✅ Tüm Harfler Açıldı";
                    return;
                }

                let secsLeft = 7;
                hintBtn.disabled = true;
                hintBtn.textContent = `⏳ Yeni Harf Hakkı: ${secsLeft} sn`;
                if (cooldownTimer) clearInterval(cooldownTimer);
                cooldownTimer = setInterval(() => {
                    if (answered || !document.body.contains(hintBtn)) {
                        clearInterval(cooldownTimer);
                        return;
                    }
                    secsLeft--;
                    if (secsLeft <= 0) {
                        clearInterval(cooldownTimer);
                        hintBtn.disabled = false;
                        hintBtn.textContent = "💡 Harf Al (+1 Harf)";
                    } else {
                        hintBtn.textContent = `⏳ Yeni Harf Hakkı: ${secsLeft} sn`;
                    }
                }, 1000);
            });

            // Cevabı Göster: Cevabı gösterir AMA soru geçilmez, kullanıcının pekiştirmek için tekrar yazmasını bekler!
            revealBtn.addEventListener("click", () => {
                if (answered) return;
                answerWasRevealed = true;
                revealBtn.style.display = "none";
                inputEl.value = "";
                inputEl.focus();
                fbEl.innerHTML = `
                    <div class="feedback-banner" style="background:rgba(245,158,11,0.2);color:#fbbf24;">
                        👁️ <strong>Doğru Cevap:</strong> <code style="font-size:1rem;">${q.correctAnswer}</code> (${q.testedMeaningObj.tr})
                        ${q.testedMeaningObj.example ? `<br><small>Örnek: "${q.testedMeaningObj.example}"</small>` : ""}
                        <br><strong>✍️ Pekiştirmek için lütfen yukarıdaki kutuya <code>${q.correctAnswer}</code> yazıp Kontrol Et'e basın!</strong>
                    </div>`;
            });

            const checkTypedAnswer = async () => {
                if (answered) return;
                const val = inputEl.value.trim().toLowerCase().replace(/\s+/g, " ");
                const expected = q.correctAnswer.trim().toLowerCase().replace(/\s+/g, " ");
                if (!val) {
                    this.showToast("⚠️ Lütfen İngilizce karşılığını yazın.");
                    return;
                }

                if (val === expected) {
                    answered = true;
                    if (cooldownTimer) clearInterval(cooldownTimer);
                    inputEl.disabled = true;
                    inputEl.style.borderColor = "var(--accent-primary)";
                    checkBtn.disabled = true;
                    hintBtn.disabled = true;
                    revealBtn.style.display = "none";
                    fbEl.innerHTML = `
                        <div class="feedback-banner" style="background:rgba(16,185,129,0.18);color:#34d399;">
                            ✅ <strong>${answerWasRevealed ? "Harika, tekrar yazarak pekiştirdin!" : "Doğru Yazdın!"}</strong> <code>${q.correctAnswer}</code> = <strong>${q.testedMeaningObj.tr}</strong>
                            ${q.testedMeaningObj.example ? `<br><small style="opacity:0.9;">Örnek: "${q.testedMeaningObj.example}"</small>` : ""}
                        </div>`;
                    await onSuccess(wrongTries === 0 && !answerWasRevealed, answerWasRevealed);
                } else {
                    wrongTries++;
                    await onMistake();
                    if (wrongTries >= 2 && !answerWasRevealed) revealBtn.style.display = "inline-flex";
                    fbEl.innerHTML = `
                        <div class="feedback-banner" style="background:rgba(239,68,68,0.18);color:#f87171;">
                            ❌ Eşleşmedi! ${answerWasRevealed ? `Lütfen doğru cevabı (<code>${q.correctAnswer}</code>) birebir yazın.` : "Tekrar deneyin veya 7 saniyede bir <strong>Harf Al</strong> butonunu kullanın."}
                        </div>`;
                }
            };

            checkBtn.addEventListener("click", checkTypedAnswer);
            inputEl.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    checkTypedAnswer();
                }
            });
            return;
        }

        // Çoktan Seçmeli (EN_TO_TR veya TR_TO_EN)
        quizBoxEl.innerHTML = `
            <small class="text-muted">
                ${q.type === "EN_TO_TR"
                ? `Bu İngilizce ifadenin <strong>"${q.testedMeaningObj.context || "verilen"}"</strong> bağlamındaki Türkçe anlamını seçin:`
                : `Verilen Türkçe anlamın (<strong>${q.testedMeaningObj.context || "Genel"}</strong>) doğru İngilizce karşılığını seçin:`}
            </small>
            <h2 style="font-size:1.65rem;margin:0.45rem 0;color:var(--accent-primary);">${q.promptTitle}</h2>
            <p class="text-muted">${q.promptSub}</p>

            <div class="quiz-options-grid">
                ${q.options.map((opt, idx) => `
                    <button type="button" class="quiz-option-btn" data-opt="${idx}">
                        <span style="opacity:0.6;margin-right:0.4rem;">${["A)", "B)", "C)", "D)"][idx]}</span> ${opt}
                    </button>
                `).join("")}
            </div>
            <div id="quiz-step-feedback" style="margin-top:1rem;"></div>
        `;

        const fbEl = document.getElementById("quiz-step-feedback");
        quizBoxEl.querySelectorAll(".quiz-option-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (answered) return;
                const chosenIdx = parseInt(btn.getAttribute("data-opt"), 10);
                const chosenVal = q.options[chosenIdx];

                if (chosenVal === q.correctAnswer) {
                    answered = true;
                    btn.classList.add("correct");
                    fbEl.innerHTML = `
                        <div class="feedback-banner" style="background:rgba(16,185,129,0.18);color:#34d399;">
                            ✅ <strong>Doğru!</strong> "${q.termObj.term}" (${q.testedMeaningIndex + 1}. Anlam - ${q.testedMeaningObj.context || "Genel"}): <strong>${q.testedMeaningObj.tr}</strong>
                        </div>`;
                    await onSuccess(wrongTries === 0);
                } else {
                    wrongTries++;
                    btn.classList.add("wrong");
                    btn.disabled = true;
                    await onMistake();
                    fbEl.innerHTML = `<div class="feedback-banner" style="background:rgba(239,68,68,0.18);color:#f87171;">❌ Yanlış şık! Bağlam ipucuna dikkat ederek doğru seçeneği bulun.</div>`;
                }
            });
        });
    }

    // AŞAMA 1 & 2 İÇİN HAVUZDAN KARIŞIK, TEKİL YAN ANLAM ODAKLI TEST (ŞIKLI + YAZMALI)
    async renderMultipleChoiceQuiz(dayNumber, stageNum, stageItems, currentDecisions, questionTypeMode = "mixed") {
        const overlay = document.getElementById("stage-modal-overlay");
        const body = document.getElementById("stage-modal-body");
        const allVocab = await window.dbManager.getAll("vocabulary");
        const profile = await window.dbManager.get("settings", "profile");
        const userCefr = profile?.cefrLevel || "B1";

        const isWordsStage = stageNum === 1;
        const targetCategory = isWordsStage ? "word" : "phrase";
        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

        const waitingPool = allVocab.filter(v =>
            v.category === targetCategory &&
            v.status !== "mastered" &&
            !stageItems.some(si => si.id === v.id)
        );

        const cefrMatchedPool = shuffle(waitingPool.filter(v => v.cefr === userCefr));
        const otherWaitingPool = shuffle(waitingPool.filter(v => v.cefr !== userCefr));
        const extraPoolItems = [...cefrMatchedPool, ...otherWaitingPool].slice(0, 5);

        const quizPool = shuffle([...stageItems, ...extraPoolItems]);
        const questions = quizPool.map((item, idx) =>
            this.buildVocabQuizQuestion(item, idx, allVocab, targetCategory, questionTypeMode)
        );

        let qIndex = 0;
        let answeredCorrectly = false;

        const renderQuizStep = () => {
            const q = questions[qIndex];
            answeredCorrectly = false;

            body.innerHTML = `
                <div class="arena-progress-header">
                    <div>
                        <span class="tag-badge tag-cefr">${q.badge}</span>
                        <strong style="margin-left:0.5rem;">Soru ${qIndex + 1} / ${questions.length}</strong>
                    </div>
                    <div class="scenario-pills">
                        <button type="button" class="scenario-pill ${questionTypeMode === "mixed" ? "active" : ""}" data-qmode="mixed">🔀 Karışık</button>
                        <button type="button" class="scenario-pill ${questionTypeMode === "write_only" ? "active" : ""}" data-qmode="write_only">⌨️ Sadece Yazmalı</button>
                        <button type="button" class="scenario-pill ${questionTypeMode === "mc_only" ? "active" : ""}" data-qmode="mc_only">🔘 Sadece Şıklı</button>
                    </div>
                </div>

                <div class="quiz-container-box" id="stage-quiz-box"></div>

                <div class="form-actions" style="justify-content:flex-end;">
                    ${qIndex < questions.length - 1
                    ? `<button class="btn btn-primary" id="btn-next-quiz-q" disabled>Sonraki Soru (${qIndex + 2}/${questions.length}) ➔</button>`
                    : `<button class="btn btn-accent" id="btn-finish-quiz-stage" disabled>✅ Testi Bitir ve Sonraki Aşamayı Aç (+30 XP)</button>`}
                </div>
            `;

            body.querySelectorAll("[data-qmode]").forEach(mBtn => {
                mBtn.addEventListener("click", () => {
                    const nextMode = mBtn.getAttribute("data-qmode");
                    this.renderMultipleChoiceQuiz(dayNumber, stageNum, stageItems, currentDecisions, nextMode);
                });
            });

            this.mountVocabQuestionBox(document.getElementById("stage-quiz-box"), q, {
                onSuccess: async (_firstTryOk = true, wasRevealed = false) => {
                    answeredCorrectly = true;
                    if (!wasRevealed) {
                        await window.dbManager.recordQuizAttempt(q.termObj.id, q.testedMeaningIndex, true);
                    }
                    const nextB = document.getElementById("btn-next-quiz-q");
                    const finB = document.getElementById("btn-finish-quiz-stage");
                    if (nextB) nextB.disabled = false;
                    if (finB) finB.disabled = false;
                },
                onMistake: async () => {
                    await window.dbManager.recordQuizAttempt(q.termObj.id, q.testedMeaningIndex, false);
                }
            });

            const nextBtn = document.getElementById("btn-next-quiz-q");
            if (nextBtn) {
                nextBtn.addEventListener("click", () => {
                    if (!answeredCorrectly) return;
                    qIndex++;
                    renderQuizStep();
                });
            }

            const finBtn = document.getElementById("btn-finish-quiz-stage");
            if (finBtn) {
                finBtn.addEventListener("click", async () => {
                    if (!answeredCorrectly) return;
                    await window.gameEngine.completeVocabStage(dayNumber, stageNum, currentDecisions);
                    overlay.style.display = "none";
                    this.showToast(`🎉 Aşama ${stageNum} Testi tamamlandı! Sonraki aşamanın kilidi açıldı.`);
                    await this.refreshAllViews();
                });
            }
        };

        renderQuizStep();
    }

    // AŞAMA 3: AKTİF ÇEVİRİ ARENASI (10 TÜRKÇE -> İNGİLİZCE CÜMLE + İPUÇLARI + DOĞRU YAZMADAN GEÇMEME KURALI)
    async renderStage3Arena(dayNumber, words, phrases) {
        const title = document.getElementById("stage-modal-title");
        const body = document.getElementById("stage-modal-body");
        const profile = await window.dbManager.get("settings", "profile");
        const userCefr = profile?.cefrLevel || "B1";

        title.textContent = `⚔️ Aktif Çeviri Arenası (10 Cümle • Seviye: ${userCefr})`;

        const shownSentencesHistory = new Set();

        const loadScenarioSentences = async (scenario) => {
            this.activeScenario = scenario;
            body.innerHTML = `<div style="padding:2rem;text-align:center;">⏳ Yapay Zeka "${scenario}" senaryosuna ve <strong>${userCefr}</strong> seviyesine uygun, günün 3 kelimesi ve 3 kalıbını içeren 10 cümleyi hazırlıyor...</div>`;
            const gen = await window.geminiService.generateArenaSentences(words, phrases, scenario, userCefr, Array.from(shownSentencesHistory));
            this.arenaSentences = gen.sentences;
            this.arenaSentences.forEach(s => shownSentencesHistory.add(s.turkish));
            this.arenaIndex = 0;
            renderCurrentQuestion();
        };

        const renderCurrentQuestion = () => {
            const currentQ = this.arenaSentences[this.arenaIndex];
            const totalQ = this.arenaSentences.length;
            let passedCurrentSentence = false;

            const starterWordsHint = currentQ.starterWords || ((currentQ.referenceEnglish || "").split(/\s+/).slice(0, 3).join(" ") + "...");
            const grammarTipHint = currentQ.grammarTip || `Bu cümlede "${(currentQ.targetTerms || []).join(", ")}" ifadesini doğal bağlamda kullanın.`;

            body.innerHTML = `
                <div class="arena-progress-header">
                    <div>
                        <span class="tag-badge tag-cefr">Seviye ${userCefr}</span>
                        <strong style="margin-left:0.4rem;">Soru ${this.arenaIndex + 1} / ${totalQ}</strong>
                        <span class="text-muted" style="margin-left:0.5rem;">Hedef İfadeler: </span>
                        ${(currentQ.targetTerms || []).map(t => `<span class="tag-badge tag-cefr">${t}</span>`).join(" ")}
                    </div>
                    <div class="scenario-pills">
                        ${["Günlük Hayat", "İş/Profesyonel", "Teknik/Yazılım"].map(sc => `
                            <button class="scenario-pill ${this.activeScenario === sc ? "active" : ""}" data-sc="${sc}">
                                ${sc}
                            </button>
                        `).join("")}
                    </div>
                </div>

                <div class="sentence-prompt-box">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                        <small class="text-muted">Aşağıdaki Türkçe cümleyi İngilizceye çevirin (Doğru çeviriyi tamamlayana kadar sonraki cümleye geçilemez):</small>
                        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                            <button type="button" class="btn btn-warning btn-sm" id="btn-simplify-sentence" title="Bu cümleyi 4-5 kelimelik çok basit A1 seviyesine indir">
                                🐣 Basitleştir (Kolay Cümle)
                            </button>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-suggest-another-sentence" title="Bu cümle yerine farklı bir cümle getir">
                                🔄 Başka Cümle Öner
                            </button>
                        </div>
                    </div>
                    <div class="sentence-tr-text">"${currentQ.turkish}"</div>
                    <small class="text-muted">💡 Anahtar İpucu: ${currentQ.hint || "Günün kelimelerini kullanmaya özen gösterin."}</small>

                    <div class="hints-toolbar">
                        <span class="text-muted" style="font-size:0.78rem;">Yardımcı İpuçları:</span>
                        <button type="button" class="hint-chip-btn" id="btn-hint-starter">🔤 İlk Kelimeler İpucu</button>
                        <button type="button" class="hint-chip-btn" id="btn-hint-grammar">📐 Gramer & Yapı İpucu</button>
                        <button type="button" class="hint-chip-btn" id="btn-hint-target">🎯 Hedef Kelime Anlamı</button>
                    </div>
                    <div id="hint-reveal-area" class="hint-reveal-box" style="display:none;"></div>
                </div>

                <div class="form-group">
                    <textarea id="arena-user-input" class="form-textarea" rows="3" placeholder="İngilizce çevirinizi buraya yazın..."></textarea>
                </div>

                <div class="form-actions" style="justify-content:space-between;">
                    <button class="btn btn-primary" id="btn-evaluate-sentence">🚀 Çevirimi Kontrol Et (3 Katmanlı AI)</button>
                    <div style="display:flex;gap:0.5rem;">
                        ${this.arenaIndex < totalQ - 1
                    ? `<button class="btn btn-secondary" id="btn-next-sentence" disabled title="Önce bu cümleyi doğru şekilde çevirmelisiniz">🔒 Sonraki Cümle (${this.arenaIndex + 2}/${totalQ}) ➔</button>`
                    : `<button class="btn btn-accent" id="btn-finish-arena" disabled title="Önce son cümleyi doğru şekilde çevirmelisiniz">🔒 10 Cümleyi Bitir & Boss Battle'ı Aç</button>`}
                    </div>
                </div>

                <div id="arena-feedback-container"></div>
            `;

            // 🐣 Basitleştir (Kolay Cümle) butonu
            document.getElementById("btn-simplify-sentence").addEventListener("click", async () => {
                const btnSimp = document.getElementById("btn-simplify-sentence");
                btnSimp.disabled = true;
                btnSimp.textContent = "⏳ Basitleştiriliyor...";
                try {
                    const simpRes = await window.geminiService.simplifySentence(currentQ, words, phrases);
                    if (simpRes?.sentence) {
                        shownSentencesHistory.add(simpRes.sentence.turkish);
                        this.arenaSentences[this.arenaIndex] = {
                            index: this.arenaIndex + 1,
                            ...simpRes.sentence
                        };
                        renderCurrentQuestion();
                        this.showToast("🐣 Cümle daha kolay A1 seviyesine indirildi!");
                    }
                } catch (err) {
                    this.showToast("❌ Basitleştirme hatası: " + err.message);
                    btnSimp.disabled = false;
                    btnSimp.textContent = "🐣 Basitleştir (Kolay Cümle)";
                }
            });

            // 🔄 Başka Cümle Öner butonu
            document.getElementById("btn-suggest-another-sentence").addEventListener("click", async () => {
                const btnSuggest = document.getElementById("btn-suggest-another-sentence");
                btnSuggest.disabled = true;
                btnSuggest.textContent = "⏳ Yeni Cümle Getiriliyor...";
                try {
                    shownSentencesHistory.add(currentQ.turkish);
                    const altRes = await window.geminiService.generateSingleAlternativeSentence(
                        words,
                        phrases,
                        this.activeScenario,
                        userCefr,
                        Array.from(shownSentencesHistory)
                    );
                    if (altRes?.sentence) {
                        shownSentencesHistory.add(altRes.sentence.turkish);
                        this.arenaSentences[this.arenaIndex] = {
                            index: this.arenaIndex + 1,
                            ...altRes.sentence
                        };
                        renderCurrentQuestion();
                        this.showToast("🔄 Yeni bir cümle önerildi!");
                    }
                } catch (err) {
                    this.showToast("❌ Yeni cümle önerilemedi: " + err.message);
                    btnSuggest.disabled = false;
                    btnSuggest.textContent = "🔄 Başka Cümle Öner";
                }
            });

            // İpucu butonları
            const hintBox = document.getElementById("hint-reveal-area");
            document.getElementById("btn-hint-starter").addEventListener("click", () => {
                hintBox.style.display = "block";
                hintBox.innerHTML = `🔤 <strong>Cümle Başlangıcı İpucu:</strong> <code>${starterWordsHint}</code>`;
            });
            document.getElementById("btn-hint-grammar").addEventListener("click", () => {
                hintBox.style.display = "block";
                hintBox.innerHTML = `📐 <strong>Gramer & Kurulum İpucu:</strong> ${grammarTipHint}`;
            });
            document.getElementById("btn-hint-target").addEventListener("click", () => {
                const allDayItems = [...words, ...phrases, ...(typeof DEFAULT_WORDS !== "undefined" ? DEFAULT_WORDS : [])];
                const details = (currentQ.targetTerms || []).map(tName => {
                    const found = allDayItems.find(x => x.term.toLowerCase() === tName.toLowerCase());
                    return found ? `<strong>${found.term}</strong> (${found.meanings[0].tr})` : `<strong>${tName}</strong>`;
                }).join(" • ");
                hintBox.style.display = "block";
                hintBox.innerHTML = `🎯 <strong>Kullanılacak Hedef İfadeler:</strong> ${details}`;
            });

            body.querySelectorAll(".scenario-pill").forEach(pill => {
                pill.addEventListener("click", () => loadScenarioSentences(pill.getAttribute("data-sc")));
            });

            document.getElementById("btn-evaluate-sentence").addEventListener("click", async () => {
                const userVal = document.getElementById("arena-user-input").value.trim();
                if (!userVal) {
                    this.showToast("⚠️ Lütfen önce İngilizce çevirinizi yazın.");
                    return;
                }
                const fbBox = document.getElementById("arena-feedback-container");
                fbBox.innerHTML = `<div class="feedback-banner">🤖 Çeviriniz 3 katmanlı olarak inceleniyor...</div>`;

                const evalRes = await window.geminiService.evaluateTranslation(
                    currentQ.turkish,
                    userVal,
                    currentQ.targetTerms || [],
                    currentQ.referenceEnglish || "",
                    this.activeScenario,
                    userCefr
                );

                await window.gameEngine.saveArenaResult(dayNumber, this.arenaIndex, {
                    ...evalRes,
                    userEnglish: userVal,
                    targetTerms: currentQ.targetTerms || []
                });
                await this.updateHUD();

                const missedList = Array.isArray(evalRes.missedTargets) ? evalRes.missedTargets : [];
                const isAccurateEnough = evalRes.score >= 75 && missedList.length === 0;

                if (isAccurateEnough) {
                    passedCurrentSentence = true;
                    const nextB = document.getElementById("btn-next-sentence");
                    const finB = document.getElementById("btn-finish-arena");
                    if (nextB) {
                        nextB.disabled = false;
                        nextB.className = "btn btn-primary";
                        nextB.innerHTML = `✅ Sonraki Cümle (${this.arenaIndex + 2}/${totalQ}) ➔`;
                    }
                    if (finB) {
                        finB.disabled = false;
                        finB.innerHTML = `🏁 10 Cümleyi Bitir & Boss Battle'ı Aç`;
                    }
                    this.showToast("🎯 Harika! Cümleyi doğru çevirdin, sonraki cümleye geçebilirsin.");
                } else {
                    passedCurrentSentence = false;
                    this.showToast("⚠️ Çeviride eksik veya hatalı kısım var! Lütfen düzeltip tekrar kontrol edin.");
                }

                const statusBanner = isAccurateEnough
                    ? `<div class="feedback-banner" style="background:rgba(16,185,129,0.2);color:#34d399;margin-bottom:0.75rem;">✅ <strong>Geçer Not Alındı (${evalRes.score}/100)!</strong> Sonraki cümleye geçebilirsiniz.</div>`
                    : `<div class="feedback-banner" style="background:rgba(239,68,68,0.2);color:#f87171;margin-bottom:0.75rem;">
                        🔒 <strong>Sonraki Cümle Kilitli (Puan: ${evalRes.score}/100):</strong> Doğru çeviriyi tam yazmadan diğer cümleye geçemezsiniz. Lütfen aşağıdaki düzeltmeyi inceleyip kutudaki cümlenizi güncelleyin ve tekrar <strong>"Çevirimi Kontrol Et"</strong> butonuna basın.
                       </div>`;

                fbBox.innerHTML = `
                    ${statusBanner}
                    <div class="three-layer-feedback">
                        <div class="feedback-layer">
                            <h4>1️⃣ Doğruluk Puanı (${evalRes.score}/100) & Gramer Düzeltmesi</h4>
                            <p>${evalRes.grammarFeedback}</p>
                            <p style="margin-top:0.35rem;"><strong>Doğru / İdeal Cümle:</strong> <code>${evalRes.correctedSentence}</code></p>
                        </div>
                        <div class="feedback-layer layer-native">
                            <h4>2️⃣ Native Touch (Doğal Kullanım Önerisi)</h4>
                            <p>${evalRes.nativeTouch}</p>
                        </div>
                        <div class="feedback-layer layer-alt">
                            <h4>3️⃣ Alternatif Versiyon (Resmi / Günlük Ton)</h4>
                            <p>${evalRes.alternativeVersion}</p>
                        </div>
                    </div>
                `;
            });

            const nextBtn = document.getElementById("btn-next-sentence");
            if (nextBtn) {
                nextBtn.addEventListener("click", () => {
                    if (!passedCurrentSentence) {
                        this.showToast("🔒 Lütfen önce mevcut cümleyi doğru şekilde çevirin!");
                        return;
                    }
                    this.arenaIndex++;
                    renderCurrentQuestion();
                });
            }

            const finishBtn = document.getElementById("btn-finish-arena");
            if (finishBtn) {
                finishBtn.addEventListener("click", async () => {
                    if (!passedCurrentSentence) {
                        this.showToast("🔒 Lütfen önce son cümleyi doğru şekilde çevirin!");
                        return;
                    }
                    await window.gameEngine.completeArenaStage(dayNumber);
                    document.getElementById("stage-modal-overlay").style.display = "none";
                    this.showToast("⚔️ Aktif Çeviri Arenası tamamlandı! Aşama 4 (Boss Battle) kilidi açıldı!");
                    await this.refreshAllViews();
                });
            }
        };

        await loadScenarioSentences(this.activeScenario);
    }

    // AŞAMA 4: GÜN SONU HİKAYESİ (BOSS BATTLE) + KONFETİ & SEVİYE ATLAMA
    async renderStage4BossBattle(dayNumber, words, phrases) {
        const title = document.getElementById("stage-modal-title");
        const body = document.getElementById("stage-modal-body");
        const profile = await window.dbManager.get("settings", "profile");
        const userCefr = profile?.cefrLevel || "B1";
        title.textContent = `🐉 Gün Sonu Hikayesi (Boss Battle • Seviye: ${userCefr})`;

        body.innerHTML = `<div style="padding:2rem;text-align:center;">⏳ Günün 3 kelimesi ve 3 kalıbını (${userCefr} seviyesinde) tek bir hikayede birleştiren Boss Battle paragrafı hazırlanıyor...</div>`;
        const storyObj = await window.geminiService.generateBossStory(words, phrases, userCefr);

        const allTargets = [...words, ...phrases].map(t => t.term);

        body.innerHTML = `
            <div class="sentence-prompt-box">
                <span class="tag-badge tag-cefr">Bölüm Sonu Görevi • ${storyObj.title || "Daily Story"}</span>
                <p class="text-muted" style="margin-top:0.4rem;">Bu paragrafta bugün öğrendiğin tüm ifadeler (${allTargets.join(", ")}) yer alıyor. Paragrafın tamamını Türkçeye çevir:</p>
                <div class="sentence-tr-text" style="margin-top:0.75rem;line-height:1.65;">
                    "${storyObj.englishStory}"
                </div>
            </div>

            <div class="form-group">
                <label>Türkçe Çeviriniz:</label>
                <textarea id="boss-user-tr" class="form-textarea" rows="4" placeholder="Hikayenin Türkçe çevirisini buraya yazın..."></textarea>
            </div>

            <div class="form-actions">
                <button class="btn btn-primary" id="btn-submit-boss">⚔️ Hikaye Çevirisini Gönder & Günü Tamamla</button>
            </div>

            <div id="boss-feedback-area"></div>
        `;

        document.getElementById("btn-submit-boss").addEventListener("click", async () => {
            const userTr = document.getElementById("boss-user-tr").value.trim();
            if (!userTr) {
                this.showToast("⚠️ Lütfen hikayenin Türkçe çevirisini yazın.");
                return;
            }

            const fbArea = document.getElementById("boss-feedback-area");
            fbArea.innerHTML = `<div class="feedback-banner">🤖 Boss Battle çeviriniz değerlendiriliyor...</div>`;

            const evalRes = await window.geminiService.evaluateBossStory(
                storyObj.englishStory,
                storyObj.referenceTurkish,
                userTr
            );

            await window.gameEngine.completeBossStage(dayNumber, storyObj, evalRes);

            fbArea.innerHTML = `
                <div class="three-layer-feedback">
                    <div class="feedback-layer">
                        <h4>🏆 GÜN ${dayNumber} TAMAMLANDI! (Puan: ${evalRes.score}/100 • +100 XP)</h4>
                        <p>${evalRes.feedback}</p>
                        <p style="margin-top:0.5rem;"><strong>Referans Türkçe Çeviri:</strong> "${evalRes.idealTranslation}"</p>
                    </div>
                </div>
                <div class="form-actions" style="justify-content:flex-end;">
                    <button class="btn btn-accent" id="btn-celebrate-next-day">🎉 Haritaya Dön ve Gün ${dayNumber + 1}'e İlerle!</button>
                </div>
            `;

            this.launchConfetti();

            document.getElementById("btn-celebrate-next-day").addEventListener("click", async () => {
                document.getElementById("stage-modal-overlay").style.display = "none";
                this.selectedDayNumber = dayNumber + 1;
                await this.refreshAllViews();
                this.showToast(`🚀 Karakterin Gün ${dayNumber + 1} durağına ilerledi!`);
            });
        });
    }

    // =========================================================================
    // 3. GÜNLÜK SRS ISINMA TURU (3-7-21 GÜN + ÇOKLU ANLAM TESTİ) & HATA TELAFİ SINAVI
    // =========================================================================
    async openSRSWarmupModal() {
        const dueWords = await window.dbManager.getDueSRSWords();
        const allVocab = await window.dbManager.getAll("vocabulary");
        const pool = dueWords.length > 0 ? dueWords : allVocab.slice(0, 5);

        const overlay = document.getElementById("stage-modal-overlay");
        const badge = document.getElementById("stage-modal-badge");
        const title = document.getElementById("stage-modal-title");
        const body = document.getElementById("stage-modal-body");

        overlay.style.display = "flex";
        badge.textContent = "Aralıklı Tekrar (3 - 7 - 21 Gün SRS)";
        title.textContent = "🧠 Çoklu Anlam Isınma Turu";

        let idx = 0;
        const renderSRSCard = () => {
            if (idx >= pool.length) {
                body.innerHTML = `
                    <div style="text-align:center;padding:2rem;">
                        <h3>🎉 Günlük SRS Tekrar Turu Tamamlandı!</h3>
                        <p class="text-muted">Kelimelerin aralıklı tekrar tarihleri (3-7-21 gün) güncellendi.</p>
                        <button class="btn btn-primary" style="margin-top:1rem;" id="btn-close-srs-done">Haritaya Dön</button>
                    </div>
                `;
                document.getElementById("btn-close-srs-done").addEventListener("click", async () => {
                    overlay.style.display = "none";
                    await this.refreshAllViews();
                });
                return;
            }

            const item = pool[idx];
            // Çoklu anlam testi: 1. anlam bilindiyse 2. veya 3. yan anlam sorulur
            const mIdx = (item.currentMeaningIndex || 0) % item.meanings.length;
            const targetMeaning = item.meanings[mIdx];

            body.innerHTML = `
                <div class="sentence-prompt-box">
                    <div style="display:flex;justify-content:space-between;">
                        <span class="tag-badge tag-cefr">${mIdx + 1}. Anlam Testi (${targetMeaning.context || "Genel"})</span>
                        <span>Kart ${idx + 1} / ${pool.length}</span>
                    </div>
                    <h2 style="font-size:1.8rem;margin:0.6rem 0;color:var(--accent-primary);">${item.term}</h2>
                    <p class="text-muted">Örnek Bağlam: "${targetMeaning.example}"</p>
                </div>

                <div id="srs-answer-box" style="display:none;margin-bottom:1rem;" class="feedback-layer">
                    <h4>🎯 ${mIdx + 1}. Anlamı (${targetMeaning.context}): ${targetMeaning.tr}</h4>
                    <p class="text-muted">${targetMeaning.exampleTr || ""}</p>
                </div>

                <div class="form-actions">
                    <button class="btn btn-secondary" id="btn-srs-reveal">👁️ Anlamı Göster</button>
                    <button class="btn btn-primary" id="btn-srs-knew">✅ Doğru Hatırladım (Sonraki Yan Anlama & SRS İlerlet)</button>
                    <button class="btn btn-danger" id="btn-srs-forgot">❌ Hatırlayamadım (3 Gün Sonraya Sıfırla)</button>
                </div>
            `;

            document.getElementById("btn-srs-reveal").addEventListener("click", () => {
                document.getElementById("srs-answer-box").style.display = "block";
            });

            document.getElementById("btn-srs-knew").addEventListener("click", async () => {
                await window.dbManager.recordQuizAttempt(item.id, mIdx, true);
                await window.dbManager.updateWordSRS(item.id, "srs_success");
                await window.dbManager.logDailyActivity(10, 0, null);
                idx++;
                renderSRSCard();
            });

            document.getElementById("btn-srs-forgot").addEventListener("click", async () => {
                await window.dbManager.recordQuizAttempt(item.id, mIdx, false);
                await window.dbManager.updateWordSRS(item.id, "srs_fail");
                idx++;
                renderSRSCard();
            });
        };

        renderSRSCard();
    }

    async openMistakeRecoveryExam() {
        const mistakes = await window.dbManager.getAll("mistakes");
        if (mistakes.length === 0) {
            this.showToast("🎉 Hata Kumbaranız boş! Henüz telafi gerektiren bir hata kaydınız yok.");
            return;
        }

        const overlay = document.getElementById("stage-modal-overlay");
        const badge = document.getElementById("stage-modal-badge");
        const title = document.getElementById("stage-modal-title");
        const body = document.getElementById("stage-modal-body");

        overlay.style.display = "flex";
        badge.textContent = "Hata Kumbarası Telafi Modu";
        title.textContent = "⚔️ Hata Telafi Sınavı";

        let idx = 0;
        const renderMistakeQ = () => {
            if (idx >= mistakes.length) {
                body.innerHTML = `
                    <div style="text-align:center;padding:2rem;">
                        <h3>🏆 Hata Telafi Sınavı Tamamlandı!</h3>
                        <p class="text-muted">Zayıf noktalarını başarıyla tekrar ettin.</p>
                        <button class="btn btn-primary" style="margin-top:1rem;" id="btn-close-mistake-exam">İstatistiklere Dön</button>
                    </div>
                `;
                document.getElementById("btn-close-mistake-exam").addEventListener("click", async () => {
                    overlay.style.display = "none";
                    await this.renderStatsDashboard();
                });
                return;
            }

            const m = mistakes[idx];
            body.innerHTML = `
                <div class="sentence-prompt-box">
                    <span class="tag-badge tag-status-review">Hata Sayısı: ${m.errorCount}</span>
                    <h3 style="margin-top:0.5rem;">Hedef İfade: <span style="color:var(--accent-primary)">${m.term}</span> (${m.primaryMeaning})</h3>
                    <p class="text-muted" style="margin-top:0.35rem;">Önceki Hatalı Cümlen: "${m.lastMistakeExample || "-"}"</p>
                    <p class="text-muted">Koç Notu: ${m.lastFeedback || ""}</p>
                </div>
                <div class="form-group">
                    <label>"${m.term}" ifadesini doğru kullanarak yeni bir İngilizce cümle kur:</label>
                    <input type="text" id="mistake-retry-input" class="form-input" placeholder="Yeni İngilizce cümleniz..." />
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" id="btn-check-mistake-retry">✅ Kontrol Et & Kumbaradan Temizle</button>
                </div>
            `;

            document.getElementById("btn-check-mistake-retry").addEventListener("click", async () => {
                const val = document.getElementById("mistake-retry-input").value.trim();
                if (!val.toLowerCase().includes(m.term.toLowerCase().split(" ")[0])) {
                    this.showToast(`⚠️ Cümlenizde "${m.term}" ifadesini kullandığınızdan emin olun.`);
                    return;
                }
                await window.dbManager.delete("mistakes", m.termId);
                await window.dbManager.updateWordSRS(m.termId, "srs_success");
                await window.dbManager.logDailyActivity(20, 1, 95);
                this.showToast(`✨ "${m.term}" başarıyla telafi edildi ve Hata Kumbarasından çıkarıldı!`);
                idx++;
                renderMistakeQ();
            });
        };

        renderMistakeQ();
    }

    // =========================================================================
    // 4. KELİME HAVUZU LİSTESİ (SADE SATIR LİSTESİ + TIKLAYINCA ANLAM & İSTATİSTİK DETAYI)
    // =========================================================================
    async repairPlaceholderMeaningsIfNeeded(vocabList) {
        const hasPlaceholder = (item) =>
            (item.meanings || []).some(m =>
                (m.tr || "").includes("Birincil / Temel Anlam") ||
                (m.tr || "").includes("İş & Profesyonel Yan Anlamı") ||
                (m.tr || "").includes("(Birincil/Temel Anlam - Demo)")
            );

        for (const item of vocabList) {
            if (hasPlaceholder(item)) {
                try {
                    const realMeanings = await window.geminiService.enrichItemWithExtraMeanings(item);
                    if (realMeanings && realMeanings.length > 0) {
                        item.meanings = realMeanings;
                        await window.dbManager.updateWordMeanings(item.id, realMeanings);
                    }
                } catch (_) { }
            }
        }
    }

    // Öğenin Türünü Ayırt Et: 'word' (Kelime), 'phrasal' (Phrasal Verb), 'connector' (Bağlaç & Kalıp)
    classifyVocabItemType(item) {
        if (item.category === "word") return "word";
        const pos = (item.partOfSpeech || "").toLowerCase();
        if (pos.includes("phrasal")) return "phrasal";
        return "connector";
    }

    async renderVocabLibrary() {
        const all = await window.dbManager.getAll("vocabulary");
        await this.repairPlaceholderMeaningsIfNeeded(all);

        const query = (document.getElementById("vocab-search")?.value || "").toLowerCase().trim();
        const statusFilter = document.getElementById("vocab-filter-status")?.value || "all";
        const cefrFilter = document.getElementById("vocab-filter-cefr")?.value || "all";
        const sortOrder = document.getElementById("vocab-sort-order")?.value || "default";

        // 1. KURAL: Tüm Sekmelerde ve Filtrelerde Kaç Adet Olduğunu Dinamik Hesapla ve Göster
        const wordsAll = all.filter(v => this.classifyVocabItemType(v) === "word");
        const phrasalsAll = all.filter(v => this.classifyVocabItemType(v) === "phrasal");
        const connectorsAll = all.filter(v => this.classifyVocabItemType(v) === "connector");
        const mistakesAll = all.filter(v => (v.mistakeCount || 0) > 0);

        const setCnt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setCnt("cnt-tab-word", wordsAll.length);
        setCnt("cnt-tab-phrasal", phrasalsAll.length);
        setCnt("cnt-tab-connector", connectorsAll.length);
        setCnt("cnt-tab-mistakes", mistakesAll.length);
        setCnt("cnt-tab-all", all.length);

        // Aktif alt sekmeye göre baz havuz
        let subtabPool = all;
        if (this.activeVocabSubtab === "word") subtabPool = wordsAll;
        else if (this.activeVocabSubtab === "phrasal") subtabPool = phrasalsAll;
        else if (this.activeVocabSubtab === "connector") subtabPool = connectorsAll;
        else if (this.activeVocabSubtab === "mistakes") subtabPool = mistakesAll;

        // Statü ve CEFR açılır menülerinin içindeki sayıları da aktif sekmeye göre güncelle
        const statusSelect = document.getElementById("vocab-filter-status");
        if (statusSelect) {
            const stCounts = {
                all: subtabPool.length,
                new: subtabPool.filter(i => i.status === "new").length,
                learning: subtabPool.filter(i => i.status === "learning").length,
                review: subtabPool.filter(i => i.status === "review").length,
                mastered: subtabPool.filter(i => i.status === "mastered").length
            };
            const stTitles = {
                all: `Tüm SRS Statüleri (${stCounts.all})`,
                new: `🆕 Yeni (${stCounts.new})`,
                learning: `🌱 Öğreniliyor (${stCounts.learning})`,
                review: `🔄 Tekrar Bekleyen (${stCounts.review})`,
                mastered: `👑 Ustalaşıldı (${stCounts.mastered})`
            };
            Array.from(statusSelect.options).forEach(opt => {
                if (stTitles[opt.value]) opt.textContent = stTitles[opt.value];
            });
        }

        const cefrSelect = document.getElementById("vocab-filter-cefr");
        if (cefrSelect) {
            const cCounts = {
                all: subtabPool.length,
                A1: subtabPool.filter(i => i.cefr === "A1").length,
                A2: subtabPool.filter(i => i.cefr === "A2").length,
                B1: subtabPool.filter(i => i.cefr === "B1").length,
                B2: subtabPool.filter(i => i.cefr === "B2").length,
                C1: subtabPool.filter(i => i.cefr === "C1").length
            };
            Array.from(cefrSelect.options).forEach(opt => {
                if (opt.value === "all") opt.textContent = `Tüm Seviyeler (${cCounts.all})`;
                else if (cCounts[opt.value] !== undefined) opt.textContent = `${opt.value} (${cCounts[opt.value]})`;
            });
        }

        // Arama, Statü ve Seviye filtrelerini uygula
        let filtered = subtabPool.filter(item => {
            if (statusFilter !== "all" && item.status !== statusFilter) return false;
            if (cefrFilter !== "all" && item.cefr !== cefrFilter) return false;
            if (query) {
                const inTerm = item.term.toLowerCase().includes(query);
                const inMeanings = (item.meanings || []).some(m => (m.tr || "").toLowerCase().includes(query));
                return inTerm || inMeanings;
            }
            return true;
        });

        // 2. KURAL: Sıralama (En Çok Yanlış Yapılanlar, En Çok Sorulanlar, Alfabetik)
        if (sortOrder === "most_wrong" || this.activeVocabSubtab === "mistakes") {
            filtered = [...filtered].sort((a, b) => (b.mistakeCount || 0) - (a.mistakeCount || 0));
        } else if (sortOrder === "most_asked") {
            filtered = [...filtered].sort((a, b) =>
                ((b.correctCount || 0) + (b.mistakeCount || 0)) - ((a.correctCount || 0) + (a.mistakeCount || 0))
            );
        } else if (sortOrder === "az") {
            filtered = [...filtered].sort((a, b) => a.term.localeCompare(b.term));
        }

        // Filtre Özeti Çubuğu
        const summaryEl = document.getElementById("vocab-filter-summary");
        if (summaryEl) {
            const tabNames = {
                word: "📘 Kelimeler",
                phrasal: "🚀 Phrasal Verbler",
                connector: "🔗 Bağlaçlar & Kalıplar",
                mistakes: "⚠️ En Çok Yanlış Yapılanlar",
                all: "📚 Tüm Havuz"
            };
            summaryEl.innerHTML = `
                <span>Gösterilen Kategori: <strong>${tabNames[this.activeVocabSubtab] || "Liste"}</strong> — Filtreye uyan <strong>${filtered.length}</strong> kayıt listeleniyor (Toplam Havuz: <strong>${all.length}</strong>)</span>
                <span>📘 ${wordsAll.length} Kelime • 🚀 ${phrasalsAll.length} Phrasal Verb • 🔗 ${connectorsAll.length} Bağlaç/Kalıp • ⚠️ ${mistakesAll.length} Hatalı</span>
            `;
        }

        const statusLabels = {
            new: "Yeni",
            learning: "Öğreniliyor",
            review: "Tekrar",
            mastered: "Ustalaşıldı"
        };

        const typeBadges = {
            word: "📘 Kelime",
            phrasal: "🚀 Phrasal Verb",
            connector: "🔗 Bağlaç / Kalıp"
        };

        const container = document.getElementById("vocab-list-container");
        container.className = "vocab-simple-list";

        if (filtered.length === 0) {
            container.innerHTML = `<div class="glass-panel" style="text-align:center;padding:2rem;"><p class="text-muted">Bu filtrede henüz kayıt bulunmuyor.</p></div>`;
            return;
        }

        const visibleItems = filtered.slice(0, this.vocabRenderLimit);
        const hasMore = filtered.length > visibleItems.length;

        container.innerHTML = visibleItems.map(item => {
            const totalCorrect = item.correctCount || 0;
            const totalWrong = item.mistakeCount || 0;
            const totalAsked = totalCorrect + totalWrong;
            const meaningsList = item.meanings || [];
            const itemTypeKey = this.classifyVocabItemType(item);

            return `
                <div class="vocab-list-item" data-id="${item.id}">
                    <div class="vocab-row-summary">
                        <div class="vocab-row-left">
                            <span class="vocab-row-chevron">▸</span>
                            <strong class="vocab-row-term">${item.term}</strong>
                            <span class="tag-badge tag-cefr">${item.cefr || "B1"}</span>
                            <span class="tag-badge">${typeBadges[itemTypeKey]}</span>
                        </div>
                        <div class="vocab-row-right">
                            <span class="stat-mini-pill" title="Toplam Sorulma / Doğru / Yanlış">
                                📊 ${totalAsked} Test • <span class="txt-ok">✓${totalCorrect}</span> / <span class="txt-err">✗${totalWrong}</span>
                            </span>
                            <span class="tag-badge tag-status-${item.status}">${statusLabels[item.status] || item.status}</span>
                        </div>
                    </div>

                    <div class="vocab-row-details" style="display:none;">
                        <div class="meanings-list">
                            ${meaningsList.map((m, idx) => {
                const mAsked = m.askedCount || 0;
                const mCorrect = m.correctCount || 0;
                const mWrong = m.wrongCount || 0;
                return `
                                    <div class="meaning-item">
                                        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                                            <span class="meaning-ctx">${idx + 1}. Anlam (${m.context || "Genel"})</span>
                                            <span class="meaning-stat-badge">
                                                Bu anlamla <strong>${mAsked}</strong> kez çıktı • Doğru: <strong class="txt-ok">${mCorrect}</strong> | Yanlış: <strong class="txt-err">${mWrong}</strong>
                                            </span>
                                        </div>
                                        <div style="margin-top:0.2rem;"><strong>${m.tr}</strong></div>
                                        ${m.example ? `<div class="meaning-ex">"${m.example}" ${m.exampleTr ? `— (${m.exampleTr})` : ""}</div>` : ""}
                                    </div>
                                `;
            }).join("")}
                        </div>

                        <div class="vocab-row-actions">
                            <span class="text-muted" style="font-size:0.78rem;">
                                SRS Kademe: ${item.srsStage || 0}/4 ${item.nextReviewDate ? `• Sonraki Tekrar: ${item.nextReviewDate}` : ""}
                            </span>
                            <div style="display:flex;gap:0.4rem;">
                                <button class="btn btn-accent btn-sm btn-ai-enrich-single" data-id="${item.id}" title="Bu kelimenin Türkçe anlamlarını ve 3-4 yan anlamını yapay zeka / sözlük ile yenile">
                                    ✨ Anlamları AI ile Yenile / Tamamla
                                </button>
                                <button class="btn btn-secondary btn-sm btn-quick-status" data-id="${item.id}">
                                    ${item.status === "mastered" ? "🔄 Tekrara Al" : "👑 Ustalaşıldı İşaretle"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("") + (hasMore ? `
            <div style="text-align:center;padding:1rem;">
                <button type="button" class="btn btn-secondary" id="btn-vocab-load-more">
                    ➕ Daha Fazla Göster (${visibleItems.length} / ${filtered.length} gösteriliyor, +150 daha yükle)
                </button>
            </div>
        ` : "");

        const btnLoadMore = document.getElementById("btn-vocab-load-more");
        if (btnLoadMore) {
            btnLoadMore.addEventListener("click", () => {
                this.vocabRenderLimit += 150;
                this.renderVocabLibrary();
            });
        }

        // Satıra tıklayınca anlamları ve anlam bazlı test istatistiklerini aç/kapat
        container.querySelectorAll(".vocab-row-summary").forEach(row => {
            row.addEventListener("click", () => {
                const parent = row.closest(".vocab-list-item");
                const details = parent.querySelector(".vocab-row-details");
                const chevron = parent.querySelector(".vocab-row-chevron");
                const isOpen = details.style.display === "block";
                details.style.display = isOpen ? "none" : "block";
                chevron.textContent = isOpen ? "▸" : "▾";
                parent.classList.toggle("expanded", !isOpen);
            });
        });

        container.querySelectorAll(".btn-quick-status").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                const w = await window.dbManager.get("vocabulary", id);
                const nextAct = w.status === "mastered" ? "review_list" : "mastered";
                await window.dbManager.updateWordSRS(id, nextAct);
                await this.renderVocabLibrary();
                await this.updateHUD();
            });
        });

        container.querySelectorAll(".btn-ai-enrich-single").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                await this.enrichSingleWordWithAI(id, btn);
            });
        });
    }

    async enrichSingleWordWithAI(wordId, buttonEl = null) {
        const item = await window.dbManager.get("vocabulary", wordId);
        if (!item) return;

        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.textContent = "⏳ Ekleniyor...";
        }

        try {
            const newMeanings = await window.geminiService.enrichItemWithExtraMeanings(item);
            await window.dbManager.updateWordMeanings(wordId, newMeanings);
            this.showToast(`✨ "${item.term}" için toplam ${newMeanings.length} yan anlam ve örnek cümle eklendi!`);
            await this.renderVocabLibrary();
        } catch (err) {
            this.showToast("❌ Yan anlam ekleme hatası: " + err.message);
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.textContent = "✨ +Yan Anlamlar (AI)";
            }
        }
    }

    async handleBulkAIEnrichMeanings() {
        const all = await window.dbManager.getAll("vocabulary");
        const targets = all.filter(item => !item.meanings || item.meanings.length < 3);

        if (targets.length === 0) {
            this.showToast("✅ Havuzdaki tüm kelime ve bağlaçların zaten 3-4 yan anlamı mevcut!");
            return;
        }

        const btn = document.getElementById("btn-bulk-ai-enrich");
        if (btn) {
            btn.disabled = true;
            btn.textContent = `⏳ Yan Anlamlar Tamamlanıyor (0/${targets.length})...`;
        }

        let count = 0;
        // Canlı API kotasını aşmamak için ilk 8 tanesini canlı/hızlı tamamla, geri kalanları da zenginleştir
        const batch = targets.slice(0, 10);
        for (const item of batch) {
            const enriched = await window.geminiService.enrichItemWithExtraMeanings(item);
            await window.dbManager.updateWordMeanings(item.id, enriched);
            count++;
            if (btn) btn.textContent = `⏳ Yan Anlamlar Tamamlanıyor (${count}/${batch.length})...`;
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = "✨ Eksik Yan Anlamları AI ile Tamamla (3-4 Anlam)";
        }

        this.showToast(`🎉 ${count} kelime/bağlaç için 3-4 farklı bağlamda yan anlamlar otomatik eklendi!`);
        await this.renderVocabLibrary();
    }

    openAddWordModal(preset = "word") {
        document.getElementById("new-word-term").value = "";
        document.querySelectorAll("#new-word-meanings-list input").forEach(i => { i.value = ""; });
        this.applyAddModalPreset(preset);
        document.getElementById("add-word-modal-overlay").style.display = "flex";
    }

    applyAddModalPreset(preset) {
        document.querySelectorAll("#add-type-preset-pills .scenario-pill").forEach(p => {
            p.classList.toggle("active", p.getAttribute("data-preset") === preset);
        });

        const catEl = document.getElementById("new-word-category");
        const posEl = document.getElementById("new-word-pos");
        const termEl = document.getElementById("new-word-term");
        const titleEl = document.getElementById("add-modal-title");

        if (preset === "phrasal") {
            catEl.value = "phrase";
            posEl.value = "phrasal verb";
            termEl.placeholder = "Örn: figure out, put off, come up with, carry out, turn out...";
            if (titleEl) titleEl.textContent = "🚀 Yeni Phrasal Verb Ekle (Aşama 2 & Havuz)";
        } else if (preset === "connector") {
            catEl.value = "phrase";
            posEl.value = "connector / idiom";
            termEl.placeholder = "Örn: on the other hand, as long as, in terms of, regardless of...";
            if (titleEl) titleEl.textContent = "🔗 Yeni Bağlaç / Kalıp Ekle (Aşama 2 Atölyesi)";
        } else {
            catEl.value = "word";
            posEl.value = "verb / noun";
            termEl.placeholder = "Örn: run, address, scale, resilient, maintain...";
            if (titleEl) titleEl.textContent = "📘 Yeni Kelime Ekle (3-4 Yan Anlamlı)";
        }
    }

    async handleAIAutofillWord() {
        const term = document.getElementById("new-word-term").value.trim();
        if (!term) {
            this.showToast("⚠️ Lütfen önce İngilizce kelimeyi, phrasal verb'ü veya bağlacı yazın.");
            return;
        }
        const btn = document.getElementById("btn-ai-autofill-word");
        btn.disabled = true;
        btn.textContent = "⏳ AI 3-4 Anlam Dolduruyor...";

        try {
            const data = await window.geminiService.autofillWordDetails(term);
            document.getElementById("new-word-category").value = data.category === "phrase" ? "phrase" : "word";
            document.getElementById("new-word-pos").value = data.partOfSpeech || (term.includes(" ") ? "phrasal verb / connector" : "verb / noun");
            if (data.cefr) document.getElementById("new-word-cefr").value = data.cefr;

            const groups = document.querySelectorAll("#new-word-meanings-list .meaning-input-group");
            (data.meanings || []).slice(0, 4).forEach((m, idx) => {
                if (groups[idx]) {
                    groups[idx].querySelector(".m-tr").value = m.tr || "";
                    groups[idx].querySelector(".m-ctx").value = m.context || "Genel";
                    groups[idx].querySelector(".m-ex").value = m.example || "";
                    groups[idx].querySelector(".m-extr").value = m.exampleTr || "";
                }
            });
            this.showToast("✨ İfadenin 3-4 farklı bağlamdaki anlamları ve örnek cümleleri AI tarafından dolduruldu!");
        } catch (err) {
            this.showToast("❌ AI doldurma hatası: " + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "✨ AI ile 3-4 Anlam Doldur";
        }
    }

    async handleSaveCustomWord() {
        const term = document.getElementById("new-word-term").value.trim();
        if (!term) {
            this.showToast("⚠️ İngilizce kelime alanı boş bırakılamaz.");
            return;
        }

        const category = document.getElementById("new-word-category").value;
        const pos = document.getElementById("new-word-pos").value.trim() || category;
        const cefr = document.getElementById("new-word-cefr").value;

        const meanings = [];
        document.querySelectorAll("#new-word-meanings-list .meaning-input-group").forEach(grp => {
            const tr = grp.querySelector(".m-tr").value.trim();
            const context = grp.querySelector(".m-ctx").value.trim() || "Genel";
            const example = grp.querySelector(".m-ex").value.trim() || `Example sentence with ${term}.`;
            const exampleTr = grp.querySelector(".m-extr").value.trim() || "";
            if (tr) {
                meanings.push({ tr, context, example, exampleTr });
            }
        });

        if (meanings.length === 0) {
            this.showToast("⚠️ En az 1 Türkçe anlam girmelisiniz.");
            return;
        }

        await window.dbManager.importBulkVocabulary([
            { term, category, partOfSpeech: pos, cefr, meanings }
        ]);

        document.getElementById("add-word-modal-overlay").style.display = "none";
        this.showToast(`✅ "${term}" kelime havuzuna eklendi!`);
        await this.renderVocabLibrary();
        await this.updateHUD();
    }

    // 🤖 Mevcut Havuzda Olmayan Kelimeleri / Phrasal Verbleri / Bağlaçları AI ile Bul ve Ekle
    async handleFindMissingWordsWithAI(buttonEl = null) {
        const profile = await window.dbManager.get("settings", "profile");
        const cefrLevel = document.getElementById("vocab-filter-cefr")?.value !== "all"
            ? document.getElementById("vocab-filter-cefr").value
            : (profile?.cefrLevel || "B1");

        const catType = this.activeVocabSubtab === "phrasal"
            ? "phrasal"
            : (this.activeVocabSubtab === "connector" ? "connector" : "word");
        const catLabel = catType === "phrasal" ? "Phrasal Verb" : (catType === "connector" ? "Bağlaç/Kalıp" : "Kelime");

        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.textContent = `⏳ AI Olmayan ${cefrLevel} ${catLabel} Arıyor...`;
        }

        try {
            const isLive = await window.geminiService.isLiveMode();
            if (!isLive) {
                const fallbackCat = catType === "word" ? "word" : "phrase";
                const addedPack = await window.dbManager.loadExtendedOxfordPack(cefrLevel, fallbackCat);
                if (addedPack > 0) {
                    this.showToast(`📦 Demo Modu: Hazır havuzda bulunmayan ${addedPack} adet ${cefrLevel} ${catLabel} eklendi! Sınırsız AI kelime üretimi için Gemini API Key girebilirsiniz.`);
                    await this.renderVocabLibrary();
                    await this.updateHUD();
                    return;
                }
                throw new Error("Sınırsız yeni kelime bulup eklemek için lütfen sağ üstten Gemini API Key girin.");
            }

            const existing = await window.dbManager.getAll("vocabulary");
            const existingTerms = existing.map(x => x.term);
            const items = await window.geminiService.generateBulkVocabularyPack(
                cefrLevel,
                catType,
                "Günlük Hayat, İş & İletişim",
                existingTerms,
                15
            );
            const added = await window.dbManager.importBulkVocabulary(items);
            this.showToast(`🤖 Yapay zeka havuzunda olmayan ${added} yeni ${cefrLevel} ${catLabel} buldu ve ekledi!`);
            await this.renderVocabLibrary();
            await this.updateHUD();
        } catch (err) {
            this.showToast("❌ " + err.message);
        } finally {
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.textContent = "🤖 Olmayan Kelimeleri AI ile Bul & Ekle";
            }
        }
    }

    async handleBulkVocabUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        let items = [];

        try {
            if (file.name.toLowerCase().endsWith(".json")) {
                items = JSON.parse(text);
            } else {
                // CSV satır ayrıştırıcı (term,pos,cefr,tr,example)
                const lines = text.split(/\r?\n/).filter(Boolean);
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(",");
                    if (cols[0]) {
                        items.push({
                            term: cols[0].trim(),
                            partOfSpeech: (cols[1] || "word").trim(),
                            cefr: (cols[2] || "B1").trim(),
                            tr: (cols[3] || "Anlam").trim(),
                            example: (cols[4] || "").trim()
                        });
                    }
                }
            }

            const added = await window.dbManager.importBulkVocabulary(items);
            this.showToast(added > 0
                ? `📥 Toplu yükleme tamamlandı: ${added} yeni kelime havuza eklendi!`
                : "ℹ️ Seçilen dosyadaki kelimeler zaten havuzunuzda mevcut veya okunabilir kayıt bulunamadı.");
            await this.renderVocabLibrary();
            await this.updateHUD();
        } catch (err) {
            this.showToast("❌ Dosya okuma hatası: " + err.message);
        } finally {
            event.target.value = "";
        }
    }

    // =========================================================================
    // 5. DETAYLI İSTATİSTİK & KARAKTER DASHBOARD + AKTİVİTE ISI HARİTASI
    // =========================================================================
    async renderStatsDashboard() {
        const profile = await window.dbManager.get("settings", "profile");
        const vocab = await window.dbManager.getAll("vocabulary");
        const activities = await window.dbManager.getAll("activity");
        const mistakes = await window.dbManager.getAll("mistakes");

        // Karakter Bilgileri
        const lvl = profile?.level || 1;
        const xp = profile?.xp || 0;
        const xpInLevel = xp % 250;
        const pct = Math.min(100, Math.round((xpInLevel / 250) * 100));

        const rankTitles = ["Çırak Dilgezgin", "Kelime Avcısı", "Bağlaç Ustası", "Cümle Mimarı", "Akıcı Hitabet Şövalyesi", "Dil Büyücüsü"];
        document.getElementById("stats-avatar").textContent = profile?.avatar || "🧙‍♂️";
        document.getElementById("stats-level-badge").textContent = `Seviye ${lvl}`;
        document.getElementById("stats-char-title").textContent = rankTitles[Math.min(lvl - 1, rankTitles.length - 1)];
        document.getElementById("stats-xp-bar").style.width = `${pct}%`;
        document.getElementById("stats-xp-text").textContent = `${xpInLevel} / 250 XP sonraki seviyeye (Toplam: ${xp} XP)`;

        // Üretim Metrikleri
        const totalSent = profile?.totalSentencesTranslated || 0;
        const avgAcc = totalSent > 0 ? Math.round((profile.accuracySum || 0) / totalSent) : 0;
        document.getElementById("stat-total-sentences").textContent = totalSent;
        document.getElementById("stat-avg-accuracy").textContent = `%${avgAcc}`;
        document.getElementById("stat-completed-days").textContent = profile?.completedDaysCount || 0;
        document.getElementById("stat-active-streak").textContent = `${profile?.streak || 0} Gün`;

        // Kelime Havuzu Dağılım Grafiği
        const totalV = vocab.length || 1;
        const counts = {
            new: vocab.filter(v => v.status === "new").length,
            learning: vocab.filter(v => v.status === "learning").length,
            review: vocab.filter(v => v.status === "review").length,
            mastered: vocab.filter(v => v.status === "mastered").length
        };

        const distChart = document.getElementById("vocab-distribution-chart");
        const rows = [
            { label: "🆕 Yeni (New)", count: counts.new, color: "#06b6d4" },
            { label: "🌱 Öğreniliyor (3-7-21 Gün SRS)", count: counts.learning, color: "#f59e0b" },
            { label: "🔄 Tekrar Bekleyen (Review)", count: counts.review, color: "#ef4444" },
            { label: "👑 Ustalaşılan (Mastered)", count: counts.mastered, color: "#10b981" }
        ];

        distChart.innerHTML = `
            <p class="text-muted" style="margin-bottom:0.85rem;">Toplam Havuz: <strong>${vocab.length}</strong> Kelime & Kalıp</p>
            ${rows.map(r => {
            const wPct = Math.round((r.count / totalV) * 100);
            return `
                    <div class="dist-bar-row">
                        <div class="dist-bar-label">
                            <span>${r.label}</span>
                            <span>${r.count} (%${wPct})</span>
                        </div>
                        <div class="dist-bar-track">
                            <div class="dist-bar-fill" style="width:${wPct}%;background:${r.color};"></div>
                        </div>
                    </div>
                `;
        }).join("")}
        `;

        // GitHub Tarzı Son 12 Haftalık (84 Gün) Aktivite Isı Haritası
        const actMap = new Map(activities.map(a => [a.date, a]));
        const heatmapEl = document.getElementById("activity-heatmap");
        const today = new Date();
        let colsHtml = "";

        for (let col = 11; col >= 0; col--) {
            let boxesHtml = "";
            for (let row = 6; row >= 0; row--) {
                const d = new Date(today);
                d.setDate(today.getDate() - (col * 7 + row));
                const iso = d.toISOString().split("T")[0];
                const rec = actMap.get(iso);
                const xpVal = rec?.xpEarned || 0;
                const lvlClass = xpVal === 0 ? "lvl-0" : (xpVal < 40 ? "lvl-1" : (xpVal < 90 ? "lvl-2" : (xpVal < 160 ? "lvl-3" : "lvl-4")));
                boxesHtml += `<div class="heat-box ${lvlClass}" title="${iso}: ${xpVal} XP, ${rec?.sentencesCount || 0} cümle"></div>`;
            }
            colsHtml += `<div class="heatmap-col">${boxesHtml}</div>`;
        }
        heatmapEl.innerHTML = colsHtml;

        // Zayıf Noktalar (Hata Kumbarası)
        const mistakeContainer = document.getElementById("mistake-list-container");
        if (mistakes.length === 0) {
            mistakeContainer.innerHTML = `<p class="text-muted">Harika! Şu anda Hata Kumbaranızda bekleyen zayıf kelime veya kalıp bulunmuyor.</p>`;
        } else {
            mistakeContainer.innerHTML = mistakes
                .sort((a, b) => b.errorCount - a.errorCount)
                .map(m => `
                    <div class="mistake-item">
                        <div style="display:flex;justify-content:space-between;">
                            <strong>${m.term}</strong>
                            <span class="tag-badge tag-status-review">${m.errorCount} Hata</span>
                        </div>
                        <p class="text-muted" style="font-size:0.82rem;margin-top:0.25rem;">Anlamı: ${m.primaryMeaning}</p>
                        <p class="text-muted" style="font-size:0.8rem;margin-top:0.25rem;">Son Hata: "${m.lastMistakeExample || "-"}"</p>
                    </div>
                `).join("");
        }
    }

    // =========================================================================
    // 6. AYARLAR, GEMINI API KEY, TÜM MODELLERİ TARAMA VE JSON BACKUP / RESTORE
    // =========================================================================
    async checkFirstRunApiPrompt() {
        const isLive = await window.geminiService.isLiveMode();
        if (!isLive) {
            await this.openOnboardingModal();
        }
    }

    async openOnboardingModal() {
        const aiConfig = await window.geminiService.getConfig();
        document.getElementById("onboard-api-key").value = aiConfig.apiKey || "";
        this.populateModelSelectElement("onboard-ai-model", aiConfig.availableModels || [], aiConfig.model);
        document.getElementById("api-onboarding-modal").style.display = "flex";
    }

    populateModelSelectElement(selectId, modelsList, selectedModel) {
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;

        const defaultModels = [
            { id: "gemini-2.5-flash", displayName: "gemini-2.5-flash (Önerilen - Hızlı & Akıllı)" },
            { id: "gemini-2.5-pro", displayName: "gemini-2.5-pro (Derin Dil Analizi)" },
            { id: "gemini-2.0-flash", displayName: "gemini-2.0-flash" }
        ];

        const listToRender = (Array.isArray(modelsList) && modelsList.length > 0) ? modelsList : defaultModels;
        selectEl.innerHTML = listToRender.map(m => {
            const label = m.displayName && m.displayName !== m.id ? `${m.id} — ${m.displayName}` : m.id;
            return `<option value="${m.id}">${label}</option>`;
        }).join("");

        // Seçili model listede yoksa manuel ekle ki kaybolmasın
        if (selectedModel && !listToRender.some(m => m.id === selectedModel)) {
            const opt = document.createElement("option");
            opt.value = selectedModel;
            opt.textContent = selectedModel;
            selectEl.prepend(opt);
        }

        if (selectedModel) {
            selectEl.value = selectedModel;
        }
    }

    async scanAndPopulateModels(apiKeyInput, selectElementId, infoElementId) {
        const infoEl = document.getElementById(infoElementId);
        if (!apiKeyInput) {
            this.showToast("⚠️ Modelleri taramak için lütfen önce Gemini API Key kutusunu doldurun.");
            if (infoEl) infoEl.textContent = "⚠️ Lütfen önce yukarıdaki kutuya Google Gemini API Key girin.";
            return;
        }

        if (infoEl) infoEl.textContent = "⏳ Google sunucularındaki güncel Gemini modelleri taranıyor...";

        try {
            const models = await window.geminiService.fetchAvailableModels(apiKeyInput);
            if (models.length === 0) {
                throw new Error("Uygun içerik üretim modeli bulunamadı.");
            }

            const aiConfig = await window.geminiService.getConfig();
            const currentSelected = document.getElementById(selectElementId)?.value || aiConfig.model || models[0].id;

            // Hem Ayarlar hem Onboarding select kutularını güncelle ve IndexedDB'ye kaydet
            this.populateModelSelectElement("setting-ai-model", models, currentSelected);
            this.populateModelSelectElement("onboard-ai-model", models, currentSelected);

            await window.dbManager.put("settings", {
                ...aiConfig,
                key: "aiConfig",
                apiKey: apiKeyInput,
                availableModels: models,
                model: document.getElementById(selectElementId).value
            });

            if (infoEl) {
                infoEl.innerHTML = `<span style="color:var(--accent-primary);font-weight:700;">✅ Toplam ${models.length} güncel Gemini modeli bulundu ve listeye eklendi! İstediğiniz modeli seçebilirsiniz.</span>`;
            }
            this.showToast(`🔄 ${models.length} güncel Gemini modeli başarıyla tarandı!`);
        } catch (err) {
            if (infoEl) {
                infoEl.innerHTML = `<span style="color:var(--accent-danger);font-weight:700;">❌ ${err.message}</span>`;
            }
            this.showToast("❌ " + err.message);
        }
    }

    async loadSettingsForm() {
        const aiConfig = await window.geminiService.getConfig();
        const profile = await window.dbManager.get("settings", "profile");

        document.getElementById("setting-api-key").value = aiConfig.apiKey || "";
        this.populateModelSelectElement("setting-ai-model", aiConfig.availableModels || [], aiConfig.model || "gemini-2.5-flash");
        if (profile?.avatar) {
            document.getElementById("setting-avatar").value = profile.avatar;
        }
        const cefrSelect = document.getElementById("setting-cefr-level");
        if (cefrSelect && profile?.cefrLevel) {
            cefrSelect.value = profile.cefrLevel;
        }
    }

    async saveSettingsForm() {
        const apiKey = document.getElementById("setting-api-key").value.trim();
        const model = document.getElementById("setting-ai-model").value;
        const avatar = document.getElementById("setting-avatar").value;
        const cefrLevel = document.getElementById("setting-cefr-level")?.value || "B1";
        const existingCfg = await window.geminiService.getConfig();

        await window.dbManager.put("settings", {
            ...existingCfg,
            key: "aiConfig",
            apiKey,
            model,
            preferredScenario: this.activeScenario
        });

        const profile = await window.dbManager.get("settings", "profile");
        if (profile) {
            profile.avatar = avatar;
            profile.cefrLevel = cefrLevel;
            await window.dbManager.put("settings", profile);
        }

        await window.gameEngine.updateTargetCefrLevel(cefrLevel);
        await this.updateHUD();
        await this.renderMapAndQuest();
        this.showToast(`💾 Ayarlar, Gemini modeli ve ${cefrLevel} seviyeniz kaydedildi!`);
    }

    async testGeminiConnection() {
        await this.saveSettingsForm();
        const banner = document.getElementById("api-test-feedback");
        banner.style.display = "block";
        banner.style.background = "var(--bg-elevated)";
        banner.textContent = "⏳ Gemini REST API bağlantısı test ediliyor...";

        try {
            const isLive = await window.geminiService.isLiveMode();
            if (!isLive) {
                banner.textContent = "ℹ️ API anahtarı girilmediği için uygulama şu an Akıllı Demo Modunda çalışıyor.";
                return;
            }
            const res = await window.geminiService.callGeminiJSON(
                "Return a JSON object with status ok.",
                "Respond with: {\"status\": \"OK\", \"message\": \"Gemini API bağlantısı başarılı!\"}"
            );
            banner.style.background = "rgba(16, 185, 129, 0.2)";
            banner.textContent = `✅ Bağlantı Başarılı: ${res.message || "Gemini modeli yanıt verdi!"}`;
        } catch (err) {
            banner.style.background = "rgba(239, 68, 68, 0.2)";
            banner.textContent = `❌ Bağlantı Hatası: ${err.message}`;
        }
    }

    async exportBackupFile() {
        const jsonStr = await window.dbManager.exportFullBackupJSON();
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateTag = new Date().toISOString().split("T")[0];
        a.href = url;
        a.download = `LinguaQuest_Tam_Yedek_${dateTag}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("📤 İlerleme ve kelime yedeğiniz (.json) başarıyla indirildi!");
    }

    async exportWordsOnlyFile() {
        const jsonStr = await window.dbManager.exportWordsOnlyJSON();
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateTag = new Date().toISOString().split("T")[0];
        a.href = url;
        a.download = `LinguaQuest_Kelime_Havuzu_${dateTag}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("🎁 Sadece kelime havuzunuz indirildi (İlerleme ve API Key dahil edilmedi)!");
    }

    async handleResetProgressKeepWords() {
        const ok = confirm("Tüm kelimeleriniz, phrasal verb'leriniz ve yan anlamlarınız KORUNACAK; ancak Gün ilerlemeniz, XP'niz, hata kumbaranız ve test istatistikleriniz sıfırlanacak. Emin misiniz?");
        if (!ok) return;

        const keptCount = await window.dbManager.resetProgressKeepWords();
        const overview = await window.gameEngine.init();
        this.selectedDayNumber = overview.currentDayNumber;
        await this.refreshAllViews();
        await this.renderStatsDashboard();
        this.showToast(`🧹 İlerleme sıfırlandı! ${keptCount} kelime ve yan anlamları sıfırdan başlamanız için korundu.`);
    }

    async importBackupFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const content = await file.text();
            await window.dbManager.importFullBackupJSON(content);
            const overview = await window.gameEngine.init();
            this.selectedDayNumber = overview.currentDayNumber;
            await this.refreshAllViews();
            await this.loadSettingsForm();
            this.showToast("📥 Yedek / Kelime paketi başarıyla yüklendi!");
        } catch (err) {
            this.showToast("❌ Yedek yükleme hatası: " + err.message);
        } finally {
            event.target.value = "";
        }
    }

    // =========================================================================
    // 6.A SERBEST CÜMLE PRATİĞİ (ÖN SEÇİM EKRANI + 3 KATMANLI AI ARENASI)
    // =========================================================================
    async renderSentencePracticeSetup() {
        const container = document.getElementById("sentence-practice-container");
        const allVocab = await window.dbManager.getAll("vocabulary");
        const profile = await window.dbManager.get("settings", "profile");

        const learningItems = allVocab.filter(v => v.status === "learning" || v.status === "review");
        const mistakeItems = allVocab.filter(v => (v.mistakeCount || 0) > 0);
        const masteredItems = allVocab.filter(v => v.status === "mastered");

        const setupState = {
            sourcePool: "learning", // 'random_all' | 'learning' | 'mistakes' | 'mastered'
            cefrLevel: profile?.cefrLevel || "B1", // 'MIXED' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
            topic: "Günlük Hayat", // 'Karışık' | 'Günlük Hayat' | 'İş/Profesyonel' | 'Teknik/Yazılım' | 'Seyahat & Sosyal' | 'Akademik & Tartışma'
            count: 5 // 5 | 10
        };

        const drawSetup = () => {
            container.innerHTML = `
                <div class="glass-panel practice-setup-card">
                    <span class="quest-day-tag">ÖZEL ANTRENMAN MODU</span>
                    <h2>✍️ Cümle Çeviri Pratiği — Çalışma Alanını Seç</h2>
                    <p class="text-muted">Pratiğe başlamadan önce cümlelerin hangi kelimelerden, hangi seviyede ve hangi konuda üretileceğini belirleyin:</p>

                    <div class="setup-section-block">
                        <h4>1. Cümlelerde Hangi Kelimeler / Kalıplar Yer Alsın?</h4>
                        <div class="setup-choice-grid" data-group="sourcePool">
                            <button type="button" class="setup-choice-tile ${setupState.sourcePool === "learning" ? "active" : ""}" data-val="learning">
                                <strong><span>🌱 Öğrenilen Kelimeler</span> <span class="tag-badge">${learningItems.length}</span></strong>
                                <small>Şu an öğrenmekte olduğun ve tekrar bekleyen kelimeleri içeren cümleler</small>
                            </button>
                            <button type="button" class="setup-choice-tile ${setupState.sourcePool === "random_all" ? "active" : ""}" data-val="random_all">
                                <strong><span>🎲 Karışık (Tüm Havuz)</span> <span class="tag-badge">${allVocab.length}</span></strong>
                                <small>Havuzdaki tüm kelime, phrasal verb ve bağlaçlardan rastgele seçilir</small>
                            </button>
                            <button type="button" class="setup-choice-tile ${setupState.sourcePool === "mistakes" ? "active" : ""}" data-val="mistakes">
                                <strong><span>⚠️ En Çok Hata Yapılanlar</span> <span class="tag-badge tag-status-review">${mistakeItems.length}</span></strong>
                                <small>Testlerde ve çevirilerde yanlış yaptığın zayıf kelimelere odaklanır</small>
                            </button>
                            <button type="button" class="setup-choice-tile ${setupState.sourcePool === "mastered" ? "active" : ""}" data-val="mastered">
                                <strong><span>👑 Ustalaşılanlar</span> <span class="tag-badge tag-status-mastered">${masteredItems.length}</span></strong>
                                <small>Bildiğin kelimeleri unutmamak için aktif cümle içinde kullan</small>
                            </button>
                        </div>
                    </div>

                    <div class="setup-section-block">
                        <h4>2. İngilizce Zorluk Seviyesi (CEFR)</h4>
                        <div class="scenario-pills" data-group="cefrLevel">
                            ${[
                    { id: "MIXED", label: "🔀 Karışık Seviye" },
                    { id: "A1", label: "A1 (Başlangıç)" },
                    { id: "A2", label: "A2 (Temel)" },
                    { id: "B1", label: "B1 (Orta)" },
                    { id: "B2", label: "B2 (İyi Orta)" },
                    { id: "C1", label: "C1 (İleri)" }
                ].map(lvl => `
                                <button type="button" class="scenario-pill ${setupState.cefrLevel === lvl.id ? "active" : ""}" data-val="${lvl.id}">
                                    ${lvl.label}
                                </button>
                            `).join("")}
                        </div>
                    </div>

                    <div class="setup-section-block">
                        <h4>3. Konu & Senaryo Seçimi</h4>
                        <div class="scenario-pills" data-group="topic">
                            ${[
                    "Karışık Konular",
                    "Günlük Hayat",
                    "İş/Profesyonel",
                    "Teknik/Yazılım",
                    "Seyahat & Kültür",
                    "Akademik & Tartışma"
                ].map(tp => `
                                <button type="button" class="scenario-pill ${setupState.topic === tp ? "active" : ""}" data-val="${tp}">
                                    ${tp}
                                </button>
                            `).join("")}
                        </div>
                    </div>

                    <div class="setup-section-block">
                        <h4>4. Cümle Sayısı</h4>
                        <div class="scenario-pills" data-group="count">
                            <button type="button" class="scenario-pill ${setupState.count === 5 ? "active" : ""}" data-val="5">5 Cümle (Hızlı Pratik)</button>
                            <button type="button" class="scenario-pill ${setupState.count === 10 ? "active" : ""}" data-val="10">10 Cümle (Tam Arena)</button>
                        </div>
                    </div>

                    <div class="form-actions" style="justify-content:flex-end;margin-top:1.75rem;">
                        <button type="button" class="btn btn-primary" id="btn-launch-custom-sentence-practice">
                            🚀 Seçili Ayarlarla Cümle Pratiğini Başlat ➔
                        </button>
                    </div>
                </div>
            `;

            container.querySelectorAll("[data-group] [data-val]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const grp = btn.closest("[data-group]").getAttribute("data-group");
                    let val = btn.getAttribute("data-val");
                    if (grp === "count") val = parseInt(val, 10);
                    setupState[grp] = val;
                    drawSetup();
                });
            });

            document.getElementById("btn-launch-custom-sentence-practice").addEventListener("click", () => {
                this.startCustomSentencePracticeSession(setupState);
            });
        };

        drawSetup();
    }

    async startCustomSentencePracticeSession(setupState) {
        const container = document.getElementById("sentence-practice-container");
        const allVocab = await window.dbManager.getAll("vocabulary");
        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

        let pool = allVocab;
        if (setupState.sourcePool === "learning") {
            const l = allVocab.filter(v => v.status === "learning" || v.status === "review");
            pool = l.length > 0 ? l : allVocab;
        } else if (setupState.sourcePool === "mistakes") {
            const m = allVocab.filter(v => (v.mistakeCount || 0) > 0).sort((a, b) => (b.mistakeCount || 0) - (a.mistakeCount || 0));
            pool = m.length > 0 ? m : allVocab;
        } else if (setupState.sourcePool === "mastered") {
            const ms = allVocab.filter(v => v.status === "mastered");
            pool = ms.length > 0 ? ms : allVocab;
        }

        if (setupState.cefrLevel !== "MIXED") {
            const byLvl = pool.filter(v => v.cefr === setupState.cefrLevel);
            if (byLvl.length >= 3) pool = byLvl;
        }

        const picked = shuffle(pool);
        const pickedWords = picked.filter(v => v.category === "word").slice(0, 3);
        const pickedPhrases = picked.filter(v => v.category === "phrase").slice(0, 3);

        const finalWords = pickedWords.length >= 3 ? pickedWords : shuffle(allVocab.filter(v => v.category === "word")).slice(0, 3);
        const finalPhrases = pickedPhrases.length >= 3 ? pickedPhrases : shuffle(allVocab.filter(v => v.category === "phrase")).slice(0, 3);
        const targetCefr = setupState.cefrLevel === "MIXED" ? "B1-B2 Karışık" : setupState.cefrLevel;

        container.innerHTML = `
            <div class="glass-panel practice-setup-card" style="text-align:center;padding:2.5rem;">
                ⏳ Yapay Zeka <strong>${setupState.topic}</strong> konusunda, <strong>${targetCefr}</strong> seviyesinde ve seçtiğiniz kelime grubundan (${[...finalWords, ...finalPhrases].map(x => x.term).join(", ")}) <strong>${setupState.count} cümle</strong> üretiyor...
            </div>
        `;

        const shownCustomHistory = new Set();
        const gen = await window.geminiService.generateArenaSentences(finalWords, finalPhrases, setupState.topic, targetCefr, []);
        const sentences = (gen.sentences || []).slice(0, setupState.count);
        sentences.forEach(s => shownCustomHistory.add(s.turkish));
        let sIdx = 0;

        const renderStep = () => {
            const currentQ = sentences[sIdx];
            let passedCurrent = false;
            const starterHint = currentQ.starterWords || ((currentQ.referenceEnglish || "").split(/\s+/).slice(0, 3).join(" ") + "...");
            const grammarHint = currentQ.grammarTip || `Bu cümlede "${(currentQ.targetTerms || []).join(", ")}" ifadesini doğal bağlamda kullanın.`;

            container.innerHTML = `
                <div class="glass-panel practice-setup-card">
                    <div class="arena-progress-header">
                        <div>
                            <span class="tag-badge tag-cefr">${targetCefr} • ${setupState.topic}</span>
                            <strong style="margin-left:0.5rem;">Cümle ${sIdx + 1} / ${sentences.length}</strong>
                            <span class="text-muted" style="margin-left:0.5rem;">Hedef:</span>
                            ${(currentQ.targetTerms || []).map(t => `<span class="tag-badge">${t}</span>`).join(" ")}
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-back-sentence-setup">⚙️ Seçim Ekranına Dön</button>
                    </div>

                    <div class="sentence-prompt-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                            <small class="text-muted">Türkçe cümleyi İngilizceye çevirin (Doğru çeviriyi tamamlayana kadar sonraki cümleye geçilemez):</small>
                            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                                <button type="button" class="btn btn-warning btn-sm" id="btn-sp-simplify" title="Bu cümleyi 4-5 kelimelik çok basit A1 seviyesine indir">
                                    🐣 Basitleştir (Kolay Cümle)
                                </button>
                                <button type="button" class="btn btn-secondary btn-sm" id="btn-sp-suggest-another" title="Mevcut cümle yerine havuzdan farklı bir cümle öner">
                                    🔄 Başka Cümle Öner
                                </button>
                            </div>
                        </div>
                        <div class="sentence-tr-text">"${currentQ.turkish}"</div>
                        <small class="text-muted">💡 İpucu: ${currentQ.hint || ""}</small>

                        <div class="hints-toolbar">
                            <span class="text-muted" style="font-size:0.78rem;">Yardımcı İpuçları:</span>
                            <button type="button" class="hint-chip-btn" id="btn-sp-hint-starter">🔤 İlk Kelimeler</button>
                            <button type="button" class="hint-chip-btn" id="btn-sp-hint-grammar">📐 Gramer Yapısı</button>
                            <button type="button" class="hint-chip-btn" id="btn-sp-hint-target">🎯 Hedef Kelime Anlamı</button>
                        </div>
                        <div id="sp-hint-reveal" class="hint-reveal-box" style="display:none;"></div>
                    </div>

                    <div class="form-group">
                        <textarea id="sp-user-input" class="form-textarea" rows="3" placeholder="İngilizce çevirinizi buraya yazın..."></textarea>
                    </div>

                    <div class="form-actions" style="justify-content:space-between;">
                        <button class="btn btn-primary" id="btn-sp-evaluate">🚀 Çevirimi Kontrol Et (3 Katmanlı AI)</button>
                        <div>
                            ${sIdx < sentences.length - 1
                    ? `<button class="btn btn-secondary" id="btn-sp-next" disabled>🔒 Sonraki Cümle (${sIdx + 2}/${sentences.length}) ➔</button>`
                    : `<button class="btn btn-accent" id="btn-sp-finish" disabled>🔒 Pratiği Tamamla</button>`}
                        </div>
                    </div>

                    <div id="sp-feedback-box"></div>
                </div>
            `;

            document.getElementById("btn-back-sentence-setup").addEventListener("click", () => this.renderSentencePracticeSetup());

            // 🐣 Basitleştir (Kolay Cümle) butonu
            document.getElementById("btn-sp-simplify").addEventListener("click", async () => {
                const btnSimp = document.getElementById("btn-sp-simplify");
                btnSimp.disabled = true;
                btnSimp.textContent = "⏳ Basitleştiriliyor...";
                try {
                    const simpRes = await window.geminiService.simplifySentence(currentQ, finalWords, finalPhrases);
                    if (simpRes?.sentence) {
                        shownCustomHistory.add(simpRes.sentence.turkish);
                        sentences[sIdx] = {
                            index: sIdx + 1,
                            ...simpRes.sentence
                        };
                        renderStep();
                        this.showToast("🐣 Cümle çok daha basit A1 seviyesine indirildi!");
                    }
                } catch (err) {
                    this.showToast("❌ Basitleştirme hatası: " + err.message);
                    btnSimp.disabled = false;
                    btnSimp.textContent = "🐣 Basitleştir (Kolay Cümle)";
                }
            });

            // 🔄 Başka Cümle Öner butonu (Seçili havuzdan yeni kelime/anlamlarla farklı cümle getirir)
            document.getElementById("btn-sp-suggest-another").addEventListener("click", async () => {
                const btnSuggest = document.getElementById("btn-sp-suggest-another");
                btnSuggest.disabled = true;
                btnSuggest.textContent = "⏳ Yeni Cümle Getiriliyor...";
                try {
                    shownCustomHistory.add(currentQ.turkish);
                    const repicked = shuffle(pool);
                    const altWords = repicked.filter(v => v.category === "word").slice(0, 3);
                    const altPhrases = repicked.filter(v => v.category === "phrase").slice(0, 3);
                    const useWords = altWords.length > 0 ? altWords : finalWords;
                    const usePhrases = altPhrases.length > 0 ? altPhrases : finalPhrases;

                    const altRes = await window.geminiService.generateSingleAlternativeSentence(
                        useWords,
                        usePhrases,
                        setupState.topic,
                        targetCefr,
                        Array.from(shownCustomHistory)
                    );
                    if (altRes?.sentence) {
                        shownCustomHistory.add(altRes.sentence.turkish);
                        sentences[sIdx] = {
                            index: sIdx + 1,
                            ...altRes.sentence
                        };
                        renderStep();
                        this.showToast("🔄 Yeni bir cümle önerildi!");
                    }
                } catch (err) {
                    this.showToast("❌ Yeni cümle önerilemedi: " + err.message);
                    btnSuggest.disabled = false;
                    btnSuggest.textContent = "🔄 Başka Cümle Öner";
                }
            });

            const hintBox = document.getElementById("sp-hint-reveal");
            document.getElementById("btn-sp-hint-starter").addEventListener("click", () => {
                hintBox.style.display = "block";
                hintBox.innerHTML = `🔤 <strong>Cümle Başlangıcı:</strong> <code>${starterHint}</code>`;
            });
            document.getElementById("btn-sp-hint-grammar").addEventListener("click", () => {
                hintBox.style.display = "block";
                hintBox.innerHTML = `📐 <strong>Gramer İpucu:</strong> ${grammarHint}`;
            });
            document.getElementById("btn-sp-hint-target").addEventListener("click", () => {
                const details = (currentQ.targetTerms || []).map(tName => {
                    const found = allVocab.find(x => x.term.toLowerCase() === tName.toLowerCase());
                    return found ? `<strong>${found.term}</strong> (${found.meanings[0].tr})` : `<strong>${tName}</strong>`;
                }).join(" • ");
                hintBox.style.display = "block";
                hintBox.innerHTML = `🎯 <strong>Hedef İfadeler:</strong> ${details}`;
            });

            document.getElementById("btn-sp-evaluate").addEventListener("click", async () => {
                const userVal = document.getElementById("sp-user-input").value.trim();
                if (!userVal) {
                    this.showToast("⚠️ Lütfen önce İngilizce çevirinizi yazın.");
                    return;
                }
                const fbBox = document.getElementById("sp-feedback-box");
                fbBox.innerHTML = `<div class="feedback-banner">🤖 Çeviriniz analiz ediliyor...</div>`;

                const evalRes = await window.geminiService.evaluateTranslation(
                    currentQ.turkish,
                    userVal,
                    currentQ.targetTerms || [],
                    currentQ.referenceEnglish || "",
                    setupState.topic,
                    targetCefr
                );

                await window.dbManager.logDailyActivity(15, 1, evalRes.score);
                await this.updateHUD();

                const missedList = Array.isArray(evalRes.missedTargets) ? evalRes.missedTargets : [];
                const isOk = evalRes.score >= 75 && missedList.length === 0;

                if (isOk) {
                    passedCurrent = true;
                    const nextB = document.getElementById("btn-sp-next");
                    const finB = document.getElementById("btn-sp-finish");
                    if (nextB) {
                        nextB.disabled = false;
                        nextB.className = "btn btn-primary";
                        nextB.innerHTML = `✅ Sonraki Cümle (${sIdx + 2}/${sentences.length}) ➔`;
                    }
                    if (finB) {
                        finB.disabled = false;
                        finB.innerHTML = `🏁 Cümle Pratiğini Tamamla (+50 XP)`;
                    }
                } else {
                    passedCurrent = false;
                    // Hata yapılan kelimeleri kaydet
                    for (const mName of missedList) {
                        const matched = allVocab.find(t => t.term.toLowerCase() === mName.toLowerCase());
                        if (matched) {
                            await window.dbManager.recordMistake(matched, userVal, evalRes.grammarFeedback);
                        }
                    }
                }

                fbBox.innerHTML = `
                    <div class="feedback-banner" style="background:${isOk ? "rgba(16,185,129,0.2);color:#34d399" : "rgba(239,68,68,0.2);color:#f87171"};margin-bottom:0.75rem;">
                        ${isOk ? `✅ Harika (${evalRes.score}/100)! Sonraki cümleye geçebilirsiniz.` : `🔒 Puan: ${evalRes.score}/100 — Doğru çeviriyi tam yazmadan sonraki cümleye geçemezsiniz. Lütfen düzeltip tekrar kontrol edin.`}
                    </div>
                    <div class="three-layer-feedback">
                        <div class="feedback-layer">
                            <h4>1️⃣ Doğruluk Puanı (${evalRes.score}/100) & Gramer Düzeltmesi</h4>
                            <p>${evalRes.grammarFeedback}</p>
                            <p style="margin-top:0.35rem;"><strong>İdeal Cümle:</strong> <code>${evalRes.correctedSentence}</code></p>
                        </div>
                        <div class="feedback-layer layer-native">
                            <h4>2️⃣ Native Touch (Doğal Kullanım)</h4>
                            <p>${evalRes.nativeTouch}</p>
                        </div>
                        <div class="feedback-layer layer-alt">
                            <h4>3️⃣ Alternatif Versiyon</h4>
                            <p>${evalRes.alternativeVersion}</p>
                        </div>
                    </div>
                `;
            });

            const nextBtn = document.getElementById("btn-sp-next");
            if (nextBtn) {
                nextBtn.addEventListener("click", () => {
                    if (!passedCurrent) return;
                    sIdx++;
                    renderStep();
                });
            }

            const finBtn = document.getElementById("btn-sp-finish");
            if (finBtn) {
                finBtn.addEventListener("click", async () => {
                    if (!passedCurrent) return;
                    await window.dbManager.logDailyActivity(50, 0, null);
                    await this.updateHUD();
                    this.launchConfetti();
                    this.showToast("🎉 Serbest Cümle Pratiği başarıyla tamamlandı! (+50 XP)");
                    this.renderSentencePracticeSetup();
                });
            }
        };

        renderStep();
    }

    // =========================================================================
    // 6.B KELİME & KALIP HAVUZUNDAN TEST (ÖN SEÇİM EKRANI + ÇOKTAN SEÇMELİ ARENA)
    // =========================================================================
    async renderVocabTestSetup() {
        const container = document.getElementById("vocab-test-container");
        const allVocab = await window.dbManager.getAll("vocabulary");

        const counts = {
            all: allVocab.length,
            learning: allVocab.filter(v => v.status === "learning" || v.status === "review").length,
            mistakes: allVocab.filter(v => (v.mistakeCount || 0) > 0).length,
            new: allVocab.filter(v => v.status === "new").length,
            mastered: allVocab.filter(v => v.status === "mastered").length,
            word: allVocab.filter(v => this.classifyVocabItemType(v) === "word").length,
            phrasal: allVocab.filter(v => this.classifyVocabItemType(v) === "phrasal").length,
            connector: allVocab.filter(v => this.classifyVocabItemType(v) === "connector").length
        };

        const testConfig = {
            poolMode: "random_all", // 'random_all' | 'learning' | 'mistakes' | 'new' | 'mastered'
            categoryMode: "all", // 'all' | 'word' | 'phrasal' | 'connector'
            cefrMode: "ALL", // 'ALL' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
            questionTypeMode: "mixed", // 'mixed' | 'write_only' | 'mc_only'
            questionCount: 10 // 10 | 20 | 30
        };

        const drawTestSetup = () => {
            container.innerHTML = `
                <div class="glass-panel practice-setup-card">
                    <span class="quest-day-tag">ÖZEL KELİME & KALIP TESTİ</span>
                    <h2>🎯 Kelime & Kalıp Havuzundan Test — Hangi Alanda Çalışmak İstersin?</h2>
                    <p class="text-muted">Teste başlamadan önce hangi statüdeki kelimelerden, hangi kategoriden ve nasıl (şıklı / yazmalı) soru çözmek istediğinizi seçin:</p>

                    <div class="setup-section-block">
                        <h4>1. Çalışmak İstediğiniz Havuz / Durum</h4>
                        <div class="setup-choice-grid" data-tgroup="poolMode">
                            <button type="button" class="setup-choice-tile ${testConfig.poolMode === "random_all" ? "active" : ""}" data-val="random_all">
                                <strong><span>🎲 Hepsinden Rastgele</span> <span class="tag-badge">${counts.all}</span></strong>
                                <small>Tüm kelime, phrasal verb ve bağlaç havuzundan karışık sorar</small>
                            </button>
                            <button type="button" class="setup-choice-tile ${testConfig.poolMode === "learning" ? "active" : ""}" data-val="learning">
                                <strong><span>🌱 Öğreniliyor & Tekrar</span> <span class="tag-badge tag-status-learning">${counts.learning}</span></strong>
                                <small>Şu an aktif olarak çalıştığın ve SRS tekrarı gelenler</small>
                            </button>
                            <button type="button" class="setup-choice-tile ${testConfig.poolMode === "mistakes" ? "active" : ""}" data-val="mistakes">
                                <strong><span>⚠️ En Çok Hata Yapılanlar</span> <span class="tag-badge tag-status-review">${counts.mistakes}</span></strong>
                                <small>Daha önce testlerde veya cümlelerde yanlış yaptığın kelimeler</small>
                            </button>
                            <button type="button" class="setup-choice-tile ${testConfig.poolMode === "new" ? "active" : ""}" data-val="new">
                                <strong><span>🆕 Hiç Sorulmamış (Yeni)</span> <span class="tag-badge tag-status-new">${counts.new}</span></strong>
                                <small>Henüz öğrenmeye başlamadığın yeni kelimeleri keşfet</small>
                            </button>
                            <button type="button" class="setup-choice-tile ${testConfig.poolMode === "mastered" ? "active" : ""}" data-val="mastered">
                                <strong><span>👑 Ustalaşılanlar</span> <span class="tag-badge tag-status-mastered">${counts.mastered}</span></strong>
                                <small>Ustalaştığın kelimelerin yan anlamlarını yokla</small>
                            </button>
                        </div>
                    </div>

                    <div class="setup-section-block">
                        <h4>2. Tür Seçimi (Kelime / Phrasal Verb / Bağlaç)</h4>
                        <div class="scenario-pills" data-tgroup="categoryMode">
                            <button type="button" class="scenario-pill ${testConfig.categoryMode === "all" ? "active" : ""}" data-val="all">📚 Tümü (${counts.all})</button>
                            <button type="button" class="scenario-pill ${testConfig.categoryMode === "word" ? "active" : ""}" data-val="word">📘 Sadece Kelimeler (${counts.word})</button>
                            <button type="button" class="scenario-pill ${testConfig.categoryMode === "phrasal" ? "active" : ""}" data-val="phrasal">🚀 Sadece Phrasal Verbler (${counts.phrasal})</button>
                            <button type="button" class="scenario-pill ${testConfig.categoryMode === "connector" ? "active" : ""}" data-val="connector">🔗 Sadece Bağlaçlar & Kalıplar (${counts.connector})</button>
                        </div>
                    </div>

                    <div class="setup-section-block">
                        <h4>3. Seviye Filtresi (CEFR)</h4>
                        <div class="scenario-pills" data-tgroup="cefrMode">
                            ${["ALL", "A1", "A2", "B1", "B2", "C1"].map(lvl => `
                                <button type="button" class="scenario-pill ${testConfig.cefrMode === lvl ? "active" : ""}" data-val="${lvl}">
                                    ${lvl === "ALL" ? "🔀 Tüm Seviyeler" : lvl}
                                </button>
                            `).join("")}
                        </div>
                    </div>

                    <div class="setup-section-block">
                        <h4>4. Soru Formatı (Türkçesini Verip İngilizcesini Yazma / Çoktan Seçmeli)</h4>
                        <div class="scenario-pills" data-tgroup="questionTypeMode">
                            <button type="button" class="scenario-pill ${testConfig.questionTypeMode === "mixed" ? "active" : ""}" data-val="mixed">🔀 Karışık (Şıklı + Yazmalı)</button>
                            <button type="button" class="scenario-pill ${testConfig.questionTypeMode === "write_only" ? "active" : ""}" data-val="write_only">⌨️ Sadece Yazmalı (Türkçe ➔ İngilizce Yaz)</button>
                            <button type="button" class="scenario-pill ${testConfig.questionTypeMode === "mc_only" ? "active" : ""}" data-val="mc_only">🔘 Sadece Çoktan Seçmeli</button>
                        </div>
                    </div>

                    <div class="setup-section-block">
                        <h4>5. Soru Sayısı</h4>
                        <div class="scenario-pills" data-tgroup="questionCount">
                            <button type="button" class="scenario-pill ${testConfig.questionCount === 10 ? "active" : ""}" data-val="10">10 Soru</button>
                            <button type="button" class="scenario-pill ${testConfig.questionCount === 20 ? "active" : ""}" data-val="20">20 Soru</button>
                            <button type="button" class="scenario-pill ${testConfig.questionCount === 30 ? "active" : ""}" data-val="30">30 Soru</button>
                        </div>
                    </div>

                    <div class="form-actions" style="justify-content:flex-end;margin-top:1.75rem;">
                        <button type="button" class="btn btn-primary" id="btn-launch-custom-vocab-test">
                            🎯 Seçili Havuzdan Testi Başlat ➔
                        </button>
                    </div>
                </div>
            `;

            container.querySelectorAll("[data-tgroup] [data-val]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const grp = btn.closest("[data-tgroup]").getAttribute("data-tgroup");
                    let val = btn.getAttribute("data-val");
                    if (grp === "questionCount") val = parseInt(val, 10);
                    testConfig[grp] = val;
                    drawTestSetup();
                });
            });

            document.getElementById("btn-launch-custom-vocab-test").addEventListener("click", () => {
                this.startCustomVocabTestSession(testConfig);
            });
        };

        drawTestSetup();
    }

    async startCustomVocabTestSession(testConfig) {
        const container = document.getElementById("vocab-test-container");
        const allVocab = await window.dbManager.getAll("vocabulary");
        const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

        let pool = [...allVocab];

        if (testConfig.categoryMode !== "all") {
            pool = pool.filter(v => this.classifyVocabItemType(v) === testConfig.categoryMode);
        }

        if (testConfig.cefrMode !== "ALL") {
            pool = pool.filter(v => v.cefr === testConfig.cefrMode);
        }

        if (testConfig.poolMode === "learning") {
            pool = pool.filter(v => v.status === "learning" || v.status === "review");
        } else if (testConfig.poolMode === "mistakes") {
            pool = pool.filter(v => (v.mistakeCount || 0) > 0).sort((a, b) => (b.mistakeCount || 0) - (a.mistakeCount || 0));
        } else if (testConfig.poolMode === "new") {
            pool = pool.filter(v => v.status === "new");
        } else if (testConfig.poolMode === "mastered") {
            pool = pool.filter(v => v.status === "mastered");
        }

        if (pool.length === 0) {
            this.showToast("⚠️ Seçtiğiniz filtre kombinasyonunda henüz kelime bulunmuyor. Lütfen başka bir alan seçin.");
            return;
        }

        const selectedItems = (testConfig.poolMode === "mistakes" ? pool : shuffle(pool)).slice(0, testConfig.questionCount);
        const catFilter = testConfig.categoryMode === "word" ? "word" : (testConfig.categoryMode === "all" ? "all" : "phrase");
        const questions = selectedItems.map((item, idx) =>
            this.buildVocabQuizQuestion(item, idx, allVocab, catFilter, testConfig.questionTypeMode || "mixed")
        );

        let qIdx = 0;
        let correctTotal = 0;
        let answered = false;

        const renderQ = () => {
            const q = questions[qIdx];
            answered = false;

            container.innerHTML = `
                <div class="glass-panel practice-setup-card">
                    <div class="arena-progress-header">
                        <div>
                            <span class="tag-badge tag-cefr">${q.badge}</span>
                            <strong style="margin-left:0.5rem;">Soru ${qIdx + 1} / ${questions.length}</strong>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-back-vocab-test-setup">⚙️ Test Seçimine Dön</button>
                    </div>

                    <div class="quiz-container-box" id="custom-quiz-box"></div>

                    <div class="form-actions" style="justify-content:flex-end;">
                        ${qIdx < questions.length - 1
                    ? `<button class="btn btn-primary" id="btn-custom-quiz-next" disabled>Sonraki Soru (${qIdx + 2}/${questions.length}) ➔</button>`
                    : `<button class="btn btn-accent" id="btn-custom-quiz-finish" disabled>🏁 Testi Bitir</button>`}
                    </div>
                </div>
            `;

            document.getElementById("btn-back-vocab-test-setup").addEventListener("click", () => this.renderVocabTestSetup());

            this.mountVocabQuestionBox(document.getElementById("custom-quiz-box"), q, {
                onSuccess: async (firstTryOk = true, wasRevealed = false) => {
                    answered = true;
                    if (firstTryOk) correctTotal++;
                    if (!wasRevealed) {
                        await window.dbManager.recordQuizAttempt(q.termObj.id, q.testedMeaningIndex, true);
                        await window.dbManager.updateWordSRS(q.termObj.id, firstTryOk ? "srs_success" : "srs_fail");
                    }
                    const nextB = document.getElementById("btn-custom-quiz-next");
                    const finB = document.getElementById("btn-custom-quiz-finish");
                    if (nextB) nextB.disabled = false;
                    if (finB) finB.disabled = false;
                },
                onMistake: async () => {
                    await window.dbManager.recordQuizAttempt(q.termObj.id, q.testedMeaningIndex, false);
                    await window.dbManager.updateWordSRS(q.termObj.id, "srs_fail");
                }
            });

            const nextBtn = document.getElementById("btn-custom-quiz-next");
            if (nextBtn) {
                nextBtn.addEventListener("click", () => {
                    if (!answered) return;
                    qIdx++;
                    renderQ();
                });
            }

            const finBtn = document.getElementById("btn-custom-quiz-finish");
            if (finBtn) {
                finBtn.addEventListener("click", async () => {
                    if (!answered) return;
                    await window.dbManager.logDailyActivity(35, 0, null);
                    await this.updateHUD();
                    this.launchConfetti();
                    this.showToast(`🎉 Test tamamlandı! (${correctTotal}/${questions.length} ilk denemede doğru • +35 XP)`);
                    this.renderVocabTestSetup();
                });
            }
        };

        renderQ();
    }

    // =========================================================================
    // 7. KONFETİ KUTLAMA ANİMASYONU & TOAST BİLDİRİMİ
    // =========================================================================
    launchConfetti() {
        const canvas = document.getElementById("confetti-canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const pieces = Array.from({ length: 110 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            size: Math.random() * 8 + 5,
            speedY: Math.random() * 4 + 2.5,
            speedX: (Math.random() - 0.5) * 3,
            color: ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#06b6d4"][Math.floor(Math.random() * 5)]
        }));

        let frames = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.y += p.speedY;
                p.x += p.speedX;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            frames++;
            if (frames < 160) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        animate();
    }

    showToast(message) {
        const container = document.getElementById("toast-container");
        const el = document.createElement("div");
        el.className = "toast-msg";
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.remove();
        }, 3800);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    window.uiController = new UIController();
    window.uiController.init();
});
