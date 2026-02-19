# Jak wdrożyć na Netlify 🚀

Twoja aplikacja "Kocie Leki" jest teraz gotowa do działania w 100% na Netlify (Frontend + Backend + Baza Danych).

## Krok 1: GitHub
1. Wrzuć folder `apka do grafik` jako nowe repozytorium na GitHub (np. `kocie-leki-pwa`).

## Krok 2: Konfiguracja Netlify
1. Zaloguj się do [Netlify](https://app.netlify.com/).
2. Kliknij "Add new site" -> "Import from Git" -> wybierz swoje repozytorium.
3. W ustawieniach Build:
   - **Publish directory**: `.` (kropka, czyli główny folder)
   - **Functions directory**: `netlify/functions` (zazwyczaj wykryje samo z `netlify.toml`)

## Krok 3: Netlify Blobs (Baza Danych)
1. W panelu Netlify Twojej strony wejdź w **Blobs**.
2. Włącz obsługę Blobs (może być wymagane opt-in w wersji beta/labs).
3. Stwórz Store o nazwie `kocie-leki-data`.

## Krok 4: Zmienne Środowiskowe (Generowanie Kluczy)
Musisz wygenerować klucze VAPID (do powiadomień) lokalnie (jeśli masz Node) lub użyć strony online (np. https://vapidkeys.com/).

W panelu Netlify -> **Site configuration** -> **Environment variables**:
Dodaj trzy zmienne:
1. `VAPID_PUBLIC_KEY`: (Twój wygenerowany klucz publiczny)
2. `VAPID_PRIVATE_KEY`: (Twój wygenerowany klucz prywatny)
3. `VAPID_EMAIL`: (jakiś email kontaktowy, np. `mailto:admin@example.com`)

## Krok 5: Aktualizacja kodu na GitHub
1. Weź wygenerowany `VAPID_PUBLIC_KEY`.
2. Otwórz plik `app.js` (linia ok. 25).
3. Wklej go w miejscu: `const PUBLIC_VAPID_KEY = 'TU_WKLEJ_SWOJ_KLUCZ';`.
4. Zatwierdź zmiany (commit & push) na GitHub.

## Krok 6: Gotowe!
Netlify przebuduje stronę.
- Wejdź na adres `https://twoja-strona.netlify.app`.
- Zasubskrybuj powiadomienia.
- Dodaj lek na godzinę np. za 2 minuty.
- Zamknij kartę w telefonie.
- Gdy minie czas, **Netlify Scheduled Function** (uruchamiana co minutę) sprawdzi Twoje dane w chmurze i wyśle powiadomienie Push! ☁️🐱
