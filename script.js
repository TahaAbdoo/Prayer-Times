"use strict";

const TIMEZONE = "Africa/Tripoli";
const API_URL = "https://api.aladhan.com/v1/timings";

const CITIES = [
    { name: "طرابلس", lat: 32.8874, lng: 13.1873 },
    { name: "بنغازي", lat: 32.1167, lng: 20.0667 },
    { name: "مصراتة", lat: 32.377533, lng: 15.092017 },
    { name: "الزاوية", lat: 32.749997, lng: 12.7166638 },
    { name: "سبها", lat: 27.03766, lng: 14.42832 },
];

// مفتاح الـ API -> معرّف العنصر -> الاسم بالعربية (بترتيب اليوم)
const PRAYERS = [
    { key: "Fajr", id: "Fajr", label: "الفجر" },
    { key: "Sunrise", id: "Shoroq", label: "الشروق" },
    { key: "Dhuhr", id: "Dhuhr", label: "الظهر" },
    { key: "Asr", id: "Asr", label: "العصر" },
    { key: "Maghrib", id: "Maghrib", label: "المغرب" },
    { key: "Isha", id: "Isha", label: "العشاء" },
];

const citySelect = document.getElementById("citySelect");
let currentTimings = null;

// ---------- أدوات مساعدة ----------

// "17:45 (EET)" -> { h: 17, m: 45 }
function parseTime(str) {
    const [h, m] = String(str).trim().split(" ")[0].split(":").map(Number);
    return { h, m };
}

// 17:45 -> "05:45 م"
function to12h({ h, m }) {
    const suffix = h >= 12 ? "م" : "ص";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

// تاريخ اليوم بتوقيت ليبيا بصيغة DD-MM-YYYY
function todayInLibya() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return `${get("day")}-${get("month")}-${get("year")}`;
}

// الوقت الحالي بتوقيت ليبيا بالدقائق منذ منتصف الليل
function nowMinutesInLibya() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t) => Number(parts.find((p) => p.type === t).value);
    return get("hour") * 60 + get("minute");
}

// ---------- العرض ----------

function renderTimes(timings) {
    for (const p of PRAYERS) {
        document.getElementById(p.id).innerText = to12h(parseTime(timings[p.key]));
    }
}

function renderDate(date) {
    const weekday = date.hijri.weekday.ar;
    const hijriDate = date.hijri.date;
    const hijriMonth = date.hijri.month.ar;
    const gregorian = date.gregorian.date;
    document.querySelector(".date").innerText =
        `${weekday} , ${hijriDate} | ${gregorian} | ${hijriMonth}`;
}

function renderNextPrayer(timings) {
    const now = nowMinutesInLibya();
    let next = PRAYERS.find((p) => {
        const { h, m } = parseTime(timings[p.key]);
        return h * 60 + m > now;
    });
    if (!next) next = PRAYERS[0]; // بعد العشاء: الفجر التالي

    document.querySelectorAll(".card.active").forEach((c) => c.classList.remove("active"));
    document.getElementById(`${next.id}Pray`).classList.add("active");

    document.getElementById("nextPrayName").innerText = next.label;
    document.getElementById("nextPrayTime").innerText = to12h(parseTime(timings[next.key]));
}

// ---------- جلب البيانات ----------

async function loadCity(city) {
    document.querySelector(".loc h4").innerText = `${city.name} - ليبيا`;
    const url = `${API_URL}/${todayInLibya()}?latitude=${city.lat}&longitude=${city.lng}&timezonestring=${TIMEZONE}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data } = await res.json();
        currentTimings = data.timings;
        renderTimes(currentTimings);
        renderDate(data.date);
        renderNextPrayer(currentTimings);
    } catch (err) {
        console.error(err);
        document.querySelector(".date").innerText = "تعذّر تحميل المواقيت، حاول مرة أخرى.";
    }
}

// ---------- تشغيل ----------

CITIES.forEach((city, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = city.name;
    citySelect.appendChild(option);
});

citySelect.addEventListener("change", () => loadCity(CITIES[citySelect.value]));

// تحديث الصلاة القادمة كل دقيقة
setInterval(() => currentTimings && renderNextPrayer(currentTimings), 60 * 1000);

loadCity(CITIES[0]);
