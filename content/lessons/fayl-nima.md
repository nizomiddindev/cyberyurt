---
id: fayl-nima
title: Fayl nima?
pathId: 0-daraja
pathTitle: 0-daraja
pathOrder: 1
moduleId: kompyuter-asoslari
moduleTitle: Kompyuter asoslari
moduleOrder: 1
lessonOrder: 1
prerequisites: []
hasTerminal: false
---

## Senariy

Sinfdoshlaringizning Telegram guruhiga notanish akkauntdan `matematika_javoblar.pdf.exe` nomli hujjat keldi. Ko‘pchilik uni oddiy PDF daftar deb o‘ylab ochmoqchi bo‘ldi. Siz to‘xtab, nom oxiridagi `.exe` qismiga e'tibor berdingiz va guruhdagilarni ogohlantirdingiz.

## Vazifa 1: Fayl va papka qanday ishlaydi?

Kompyuterda ko‘radigan har bir rasm, matn, qo‘shiq yoki dastur aslida bitta [[fayl]] hisoblanadi. Fayllar tartibsiz sochilib ketmasligi uchun ular [[papka|papkalar]] ichiga joylashtiriladi.

Har bir faylning kompyuter ichida aniq [[yol|yo‘li]] bo‘ladi. Masalan, `/home/ali/dars.txt` yozuvi `ali` foydalanuvchisining uy papkasidagi `dars.txt` faylini ko‘rsatadi.

::diagram flow
- Foydalanuvchi faylni tanlaydi
- Tizim uning yo‘lini topadi
- Fayl ichidagi baytlar o‘qiladi
- Kerakli dasturda ochiladi
::end

:::simpler
Fayl — bu kompyuter ichidagi bitta hujjat yoki rasm. Papka esa shu hujjatlarni solib qo‘yadigan quti. Yo‘l esa o‘sha quti qayerda turganini ko‘rsatadigan manzil.
:::

:::question
prompt: Kompyuterda faylning aniq manzilini ko‘rsatuvchi yozuv (masalan, /home/ali/dars.txt) nima deb ataladi?
options:
  - Yo‘l (Path)
  - Parol
  - Ekran
answer: Yo‘l (Path)
explanation: Parol hisobga kirish uchun ishlatiladi, ekran esa tasvirni ko‘rsatadi. Fayl qaysi papkalar ichida joylashganini ko‘rsatadigan aniq manzil "Yo‘l (Path)" deb ataladi.
:::

## Vazifa 2: Kengaytma va soxta fayllarni ajratish

Fayl nomining oxirgi nuqtasidan keyingi qismi [[kengaytma]] deyiladi. Hujumchilar ko‘pincha dasturni oddiy hujjatdek ko‘rsatish uchun ikki marta nuqta qo‘yishadi: `vazifa.pdf.exe`.

Operatsion tizim har doim **eng oxirgi** nuqtadan keyingi kengaytmaga qaraydi. Demak, `vazifa.pdf.exe` aslida PDF emas, balki ishga tushadigan dastur (`.exe`).

::compare
leftTitle: Haqiqiy hujjat
rightTitle: Xavfli soxta fayl
rows:
  - label: Fayl nomi
    left: vazifa.pdf
    right: vazifa.pdf.exe
    diff: true
  - label: Oxirgi kengaytma
    left: .pdf (o‘qiladigan hujjat)
    right: .exe (ishga tushadigan dastur)
    diff: true
  - label: Xavfsizlik
    left: Oddiy matn yoki rasm ko‘rsatadi
    right: Kompyuterda noma'lum kodni ishga tushirishi mumkin
    diff: true
::end

:::simpler
Fayl nomining eng oxirgi nuqtasidan keyingi harflarga qarang. Agar `.pdf.exe` yozilgan bo‘lsa, oxiri `.exe` — demak u kitob emas, dastur. Bunday faylni ochmang.
:::

:::question
prompt: '"imtihon.pdf.exe" fayli aslida qanday fayl?'
options:
  - Oddiy PDF hujjat
  - Ishga tushadigan dastur (.exe)
  - Rasm fayli
answer: Ishga tushadigan dastur (.exe)
explanation: Tizim fayl nomidagi birinchi nuqtani (.pdf) emas, faqat eng oxirgi nuqtadan keyingi kengaytmani (.exe) hisobga oladi. Hujumchilar foydalanuvchini chalg‘itish uchun nomga ".pdf" qo‘shib qo‘yishadi.
:::
