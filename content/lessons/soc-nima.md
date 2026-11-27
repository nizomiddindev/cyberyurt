---
id: soc-nima
title: SOC nima?
pathId: kiberxavfsizlik-asoslari
pathTitle: Kiberxavfsizlik asoslari
pathOrder: 2
moduleId: mudofaa-asoslari
moduleTitle: Mudofaa asoslari
moduleOrder: 1
lessonOrder: 1
prerequisites:
  - fayl-nima
  - terminal-bilan-tanishuv
hasTerminal: false
---

## Senariy

Tungi soat 03:00 da katta bank tizimiga 1 daqiqa ichida 10 000 marta noto‘g‘ri parol bilan kirishga urinish bo‘ldi. Foydalanuvchilar uxlab yotibdi, lekin bankning xavfsizlik ekrani darhol ogohlantirish chiqardi va mutaxassislar hujumni 5 daqiqada to‘xtatdi. Buni kim amalga oshirdi?

## Vazifa 1: SOC jamoasi tuzilishi

Katta kompaniyalar va banklarda tizimlarni tunu kun kuzatadigan markaz [[soc]] (Security Operations Center) deb ataladi. Uning tepasida butun xavfsizlik strategiyasini belgilaydigan [[ciso]] turadi.

Quyidagi tuzilmadagi har bir kartani bosib, vazifasini o‘qing:

::diagram tree
id: ciso
title: CISO
description: Kompaniya rahbariyatida axborot xavfsizligi strategiyasi, byudjeti va umumiy siyosatiga javobgar bosh rahbar.
children:
  - id: soc-menejeri
    title: SOC menejeri
    description: SOC jamoasining kundalik ishini boshqaradi, navbatchilikni rejalashtiradi va CISOga hisobot beradi.
    children:
      - id: tier-1
        title: 1-daraja tahlilchi
        description: Yangi ogohlantirishlarni (alert) birinchi bo‘lib ko‘radi va yolg‘on signalni haqiqiy tahdiddan ajratadi.
      - id: tier-2
        title: 2-daraja tahlilchi
        description: Murakkab hujumlarni chuqur tekshiradi, loglarni tahlil qiladi va zararlanish ko‘lamini aniqlaydi.
      - id: ir
        title: Insident javobgari
        description: Hujumni to‘xtatadi, zararlangan kompyuterni tarmoqdan ajratadi va tizimni tiklaydi.
::end

:::simpler
SOC — bu kompaniyaning raqamli qo‘riqchilar markazi. CISO — bosh rahbar, SOC menejeri — jamoa boshlig‘i, tahlilchilar esa ekrandagi xavfli belgilarni tekshiradigan mutaxassislar.
:::

:::question
prompt: SOC jamoasida yangi kelgan ogohlantirishlarni birinchi bo‘lib saralab, yolg‘on signallarni ajratadigan mutaxassis kim?
options:
  - CISO
  - 1-daraja tahlilchi
  - Sayt dizayneri
answer: 1-daraja tahlilchi
explanation: CISO umumiy strategiyani boshqaradi, sayt dizayneri esa SOC tarkibiga kirmaydi. Birinchi navbatda barcha signallarni ko‘rib saralaydigan mutaxassis — 1-daraja tahlilchi (Tier 1).
:::

## Vazifa 2: SOC qanday qilib hujumni to‘xtatadi?

SOC mutaxassislari tizimdagi har bir [[log|logni]] kuzatib borishadi. Agar [[fishing]] xati orqali kimningdir paroli o‘g‘irlansa, tizimda g‘alati kirish qayd etiladi va bu [[insident]] sifatida tekshiriladi.

::steps
- title: 1. Aniqlash (Detection)
  body: Tizim loglarida g‘alati harakat (masalan, tungi soat 03:00 da minglab xato parol) paydo bo‘ladi va signal chiqadi.
- title: 2. Tahlil (Triage)
  body: 1-daraja tahlilchi bu signal oddiy xato emas, balki haqiqiy hujum ekanini tasdiqlaydi.
- title: 3. Cheklash (Containment)
  body: Hujumchi boshqa kompyuterlarga o‘tmasligi uchun shubhali akkaunt yoki qurilma darhol bloklanadi.
- title: 4. Tiklash va saboq (Recovery)
  body: Parollar yangilanadi, tizim tekshiriladi va keyingi safar bunday hujum o‘tmasligi uchun himoya kuchaytiriladi.
::end

:::simpler
SOC ishi 4 bosqichdan iborat: avval xavfni payqaydi, keyin rostligini tekshiradi, so‘ng hujumni to‘xtatadi va oxirida tizimni avvalgi xavfsiz holatiga qaytaradi.
:::

:::question
prompt: Nima uchun "Cheklash (Containment)" bosqichi tizimni tiklashdan oldin bajariladi?
options:
  - Hujumchi boshqa kompyuterlarga tarqalishini darhol to‘xtatish uchun
  - Loglarni o‘chirib yuborish uchun
  - Internet tezligini oshirish uchun
answer: Hujumchi boshqa kompyuterlarga tarqalishini darhol to‘xtatish uchun
explanation: Loglarni o‘chirish dalillarni yo‘qotadi, internet tezligi esa xavfsizlik chorasi emas. Avval zararlangan qismni ajratib (cheklab) qo‘yilmasa, hujumchi tizim tiklanayotgan paytda yana zarar yetkazaveradi.
:::
