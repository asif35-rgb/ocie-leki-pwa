// app.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const medForm = document.getElementById('med-form');
    const medList = document.getElementById('med-list');
    const alertBox = document.getElementById('alert-box');
    const closeAlertBtn = document.getElementById('close-alert');
    const notificationRequest = document.getElementById('notification-request');
    const enableNotificationsBtn = document.getElementById('enable-notifications');
    const catIllustration = document.getElementById('cat-illustration');

    let currentAlertMedId = null;

    // State & Netlify User Identity
    let medications = JSON.parse(localStorage.getItem('kocieLekiData')) || [];
    let userId = localStorage.getItem('kocieLekiUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('kocieLekiUserId', userId);
    }

    // Netlify Config
    const PUBLIC_VAPID_KEY = 'BJl4IxIY4isYplUfX83YNfyPPzQBom0lVxgcW_bIg2q58Gry5ZHQaCRfl3DW8g7VADl3ivJxwmy8u8fyz2P4v3c'; // Replace with key from Netlify Env if needed on frontend?
    // Actually, usually we fetch public key from backend to avoid hardcoding.
    // But for this simple flow, hardcoding or pasting is fine.

    // Endpoint for syncing
    const SYNC_URL = '/.netlify/functions/sync';

    // --- INITIALIZATION ---
    renderMedications();
    checkNotificationPermission();
    registerServiceWorkerAndSubscribe();

    // Start Time Picker Timer (Check every 10 seconds for smoothness)
    setInterval(checkTime, 10000);

    // --- EVENT LISTENERS ---

    // Form Submit
    medForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('med-name').value;
        const totalQuantity = parseFloat(document.getElementById('med-quantity').value);
        const dose = parseFloat(document.getElementById('med-dose').value);
        const time = document.getElementById('med-time').value;

        if (name && totalQuantity && dose && time) {
            const newMed = {
                id: Date.now(),
                name,
                totalQuantity, // Current stock
                dose,          // How many to take
                time
            };

            medications.push(newMed);
            saveMeds();
            renderMedications();
            medForm.reset();

            // Simple visual feedback
            alert('Dodano lek! Miau! 🐾');
        }
    });

    // Close Alert (Take Medicine)
    closeAlertBtn.addEventListener('click', () => {
        alertBox.classList.add('hidden');

        if (currentAlertMedId) {
            takeMedicine(currentAlertMedId);
            currentAlertMedId = null;
        }

        // Restore Sleeping Cat
        catIllustration.innerHTML = `
            <svg width="150" height="150" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="110" r="70" fill="#FFF2CC" />
                <circle cx="100" cy="110" r="60" fill="#FFE0B2" opacity="0.5" />
                <path d="M60 70 L50 40 L90 60 Z" fill="#FFF2CC" />
                <path d="M140 70 L150 40 L110 60 Z" fill="#FFF2CC" />
                <ellipse cx="85" cy="100" rx="5" ry="2" fill="#555" />
                <ellipse cx="115" cy="100" rx="5" ry="2" fill="#555" />
                <circle cx="100" cy="110" r="3" fill="#FFAB91" />
                <path d="M90 120 Q100 130 110 120" stroke="#555" fill="none" stroke-width="2" />
                <path d="M40 100 Q60 110 70 100" stroke="#888" fill="none" stroke-width="1" />
                <path d="M160 100 Q140 110 130 100" stroke="#888" fill="none" stroke-width="1" />
                <text x="140" y="50" font-family="Arial" font-size="20">Zzz...</text>
            </svg>
        `;
    });

    // Notification Permission
    enableNotificationsBtn.addEventListener('click', () => {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationRequest.classList.add('hidden');
                new Notification('Kocie Leki', { body: 'Powiadomienia włączone! Miau!' });
                registerServiceWorkerAndSubscribe(); // Retry subscription
            }
        });
    });

    // --- FUNCTIONS ---

    function saveMeds() {
        localStorage.setItem('kocieLekiData', JSON.stringify(medications));
        syncDataToNetlify();
    }

    function renderMedications() {
        medList.innerHTML = '';

        if (medications.length === 0) {
            medList.innerHTML = '<li class="empty-list-msg">Brak leków na liście. Dodaj coś! 😸</li>';
            return;
        }

        // Sort by time
        medications.sort((a, b) => a.time.localeCompare(b.time));

        medications.forEach(med => {
            const li = document.createElement('li');
            li.className = 'med-item';

            // Warning for low stock
            let stockWarning = '';
            if (med.totalQuantity <= 3) {
                stockWarning = '<span style="color:red; font-weight:bold;">(Mało!)</span>';
            }

            li.innerHTML = `
                <div class="med-info">
                    <h3>${med.name}</h3>
                    <p>🕒 ${med.time} • 💊 ${med.dose} szt.</p>
                    <p style="font-size: 0.8rem; color: #888;">Zapas: <b>${med.totalQuantity}</b> ${stockWarning}</p>
                </div>
                <div>
                     <button class="btn-taken" onclick="takeMedicine(${med.id})" title="Weź teraz">✓</button>
                     <button class="btn-delete" onclick="deleteMed(${med.id})">🗑️</button>
                </div>
            `;
            medList.appendChild(li);
        });
    }

    // Expose delete function to global scope so HTML onclick can see it
    window.deleteMed = function (id) {
        if (confirm('Usunąć ten lek?')) {
            medications = medications.filter(med => med.id !== id);
            saveMeds();
            renderMedications();
        }
    };

    // Expose take function
    window.takeMedicine = function (id) {
        const medIndex = medications.findIndex(m => m.id === id);
        if (medIndex > -1) {
            const med = medications[medIndex];
            if (med.totalQuantity >= med.dose) {
                med.totalQuantity -= med.dose;
                // Round to avoid floating point errors
                med.totalQuantity = Math.round(med.totalQuantity * 100) / 100;

                saveMeds();
                renderMedications();
                console.log(`Taken ${med.name}. Remaining: ${med.totalQuantity}`);
            } else {
                alert('O nie! Skończyły się tabletki! 😿');
                med.totalQuantity = 0;
                saveMeds();
                renderMedications();
            }
        }
    };

    function checkNotificationPermission() {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            notificationRequest.classList.remove('hidden');
        }
    }

    function checkTime() {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;
        const currentSeconds = now.getSeconds();

        medications.forEach(med => {
            if (med.time === currentTime && currentSeconds < 12) {
                triggerAlarm(med);
            }
        });
    }

    function triggerAlarm(med) {
        if (!alertBox.classList.contains('hidden')) return;

        currentAlertMedId = med.id;

        // UI Alert
        alertBox.classList.remove('hidden');
        alertBox.querySelector('strong').textContent = `Czas na: ${med.name}! (${med.dose} szt.)`;

        // Change Illustration to "Alert Cat"
        catIllustration.innerHTML = `
             <svg width="150" height="150" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="110" r="70" fill="#FFCCBC" />
                <path d="M60 70 L50 40 L90 60 Z" fill="#FFCCBC" />
                <path d="M140 70 L150 40 L110 60 Z" fill="#FFCCBC" />
                <path d="M40 70 Q20 50 40 30" stroke="black" fill="none" stroke-width="2"/>
                <path d="M160 70 Q180 50 160 30" stroke="black" fill="none" stroke-width="2"/>
                <circle cx="85" cy="100" r="8" fill="#333" />
                <circle cx="115" cy="100" r="8" fill="#333" />
                <circle cx="100" cy="115" r="3" fill="#FFAB91" />
                <ellipse cx="100" cy="130" rx="10" ry="15" fill="#D32F2F" />
                <text x="140" y="50" font-family="Arial" font-size="20" fill="#D32F2F">MIAU!</text>
            </svg>
        `;

        // System Notification
        if (Notification.permission === 'granted') {
            new Notification('Kocie Leki 🐾', {
                body: `Czas na lek: ${med.name}! Zjedz ${med.dose} szt.`,
                icon: './icon-192.png'
            });
        }
    }

    // --- PUSH NOTIFICATIONS HELPERS ---

    async function registerServiceWorkerAndSubscribe() {
        if ('serviceWorker' in navigator) {
            try {
                const register = await navigator.serviceWorker.register('./service-worker.js');
                console.log('Service Worker Registered');

                if (PUBLIC_VAPID_KEY && PUBLIC_VAPID_KEY !== 'BJl4IxIY4isYplUfX83YNfyPPzQBom0lVxgcW_bIg2q58Gry5ZHQaCRfl3DW8g7VADl3ivJxwmy8u8fyz2P4v3c') {
                    subscribeUserToPush(register);
                }
            } catch (err) {
                console.error('Service Worker Error', err);
            }
        }
    }

    async function subscribeUserToPush(registration) {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
            });

            console.log('Push Registered...');

            // Initial sync on startup to ensure we have sub
            syncDataToNetlify(subscription);

        } catch (err) {
            console.error('Push Subscription Error (Czy wygenerowałeś klucze?)', err);
        }
    }

    async function syncDataToNetlify(newSubscription = null) {
        // Get current subscription if not provided new
        let sub = newSubscription;
        if (!sub) {
            const storedSub = localStorage.getItem('kocieLekiSubscription');
            if (storedSub) sub = JSON.parse(storedSub);
        }

        if (newSubscription) {
            localStorage.setItem('kocieLekiSubscription', JSON.stringify(newSubscription));
        }

        const payload = {
            userId,
            medications,
            subscription: sub
        };

        try {
            await fetch(SYNC_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('Data synced to Netlify Cloud');
        } catch (err) {
            console.error('Sync failed', err);
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
});
