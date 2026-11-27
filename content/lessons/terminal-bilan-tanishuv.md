---
id: terminal-bilan-tanishuv
title: Terminal bilan tanishuv
pathId: 0-daraja
pathTitle: 0-daraja
pathOrder: 1
moduleId: kompyuter-asoslari
moduleTitle: Kompyuter asoslari
moduleOrder: 1
lessonOrder: 2
prerequisites:
  - fayl-nima
hasTerminal: true
---

## Senariy

Maktabingiz sayti joylashgan serverga ulanishingiz kerak, lekin u yerda sichqoncha, ish stoli yoki chiroyli tugmalar yo‘q — faqat qora matnli oyna bor. Xavfsizlik mutaxassislari deyarli har kuni serverlar va CTF masalalarida aynan shu oynadan foydalanishadi. Bugun siz ham uni boshqarishni o‘rganasiz.

## Vazifa 1: Terminalda o‘zingizni va joyingizni aniqlang

[[terminal|Terminal]] — bu kompyuterga matn orqali [[buyruq]] beradigan oyna. Har bir buyruqni yozib **Enter** tugmasini bossangiz, tizim uni darhol bajaradi.

::steps
- title: 1. Buyruq yozasiz
  body: Masalan, o‘ng tomondagi terminalga "pwd" deb yozasiz va Enter bosasiz.
- title: 2. Shell uni tushunadi
  body: Terminal qobig‘i (shell) siz yozgan so‘zni mavjud buyruqlar ro‘yxatidan topadi.
- title: 3. Natija qaytadi
  body: Tizim hozir qaysi [[katalog|katalogda]] turganingizni to‘liq [[yol]] ko‘rinishida chiqaradi.
::end

:::simpler
Terminal — kompyuter bilan yozishma oynasi. `whoami` yozsangiz "men kimman?" degan savolga javob beradi. `pwd` yozsangiz "hozir qayerdaman?" degan savolga javob beradi.
:::

O‘ng tomondagi terminalda `whoami` buyrug‘ini ishga tushiring.

:::terminal-task
instruction: Terminalda `whoami` buyrug‘ini yozib Enter bosing.
matchCommand: ^whoami$
:::

## Vazifa 2: Katalog ichini ko‘rish va fayl yaratish

`ls` buyrug‘i joriy katalog ichidagi fayl va papkalarni ko‘rsatadi. `touch` buyrug‘i esa yangi bo‘sh fayl yaratadi (masalan: `touch salom.txt`).

:::simpler
`ls` — papka ichiga qarash. `touch salom.txt` — `salom.txt` degan yangi bo‘sh fayl ochish.
:::

Terminalda `touch salom.txt` buyrug‘ini bajarib yangi fayl yarating.

:::terminal-task
instruction: Joriy uy papkangizda `salom.txt` faylini yarating (`touch salom.txt`).
checkFile: ~/salom.txt
:::

## Vazifa 3: Buyruqlarni mustahkamlash

Terminalda ishlayotganda qaysi papkada turganingizni tez-tez tekshirish foydali, chunki `rm` yoki `touch` kabi buyruqlar aynan joriy katalogda ishlaydi.

:::question
prompt: Joriy katalogning to‘liq manzilini ko‘rsatadigan buyruq qaysi?
options:
  - ls
  - pwd
  - clear
answer: pwd
explanation: "ls papka ichidagi fayllar ro‘yxatini ko‘rsatadi, clear esa ekranni tozalaydi. Hozir turgan katalogning to‘liq yo‘lini (Print Working Directory) ko‘rsatadigan buyruq — pwd."
:::
