# Case study — Personal Finance Template

> A personal-finance tool built on top of a Google Sheet. Runs in the browser and
> on the phone, with 50/30/20 budgeting, liquidity tracking, and credit cards
> modeled as real credit.
>
> **Role:** product + design + engineering (solo project). · **Stack:** vanilla
> HTML/CSS/JS, Chart.js, Google Sheets as the database, Google Apps Script.

---

## 1. The problem

I tracked my finances in a Google Sheets template — thorough, but painful to use.
Logging an expense meant opening the sheet, finding the month, locating the row and
typing. On the phone it was worse. The result: **the small expenses — the ones that
slip away most — never got logged**, and without complete data no chart or goal is
worth anything.

The goal was never "a pretty app." It was to **cut the friction of logging until
recording an expense takes seconds**, because the metric that actually matters is
adherence, not features.

## 2. User and context

A single user (me): a young professional in Lima who operates in Peruvian soles but
also handles euros and dollars, pays with Yape, Plin, cash and three credit cards.
He wants to understand his spending pattern and build an emergency fund — without
paying for an app or handing over control of his data.

## 3. Product decisions (and their trade-offs)

**The spreadsheet *is* the database.**
Instead of standing up a new backend, data lives in the user's own Google Sheet
(`Registro` and `Config` tabs). *Why:* zero cost, the user owns the data and can
open it without the app. *Trade-off:* not multi-user and limited at scale —
irrelevant for personal finance.

**Credit cards are modeled as credit, not as expense.**
The most important product call. A card purchase is **not a monthly expense**: it
raises the balance owed and lowers available credit. The expense happens **when the
card is paid**. *Why:* that's how people actually think about their money; counting
the purchase as an expense distorts the month. *Trade-off:* you lose the category of
each individual purchase, in exchange for the month's numbers being faithful.

**Every expense knows where it came from, and undoing it returns the balance.**
When logging an expense you pick the source account (Yape, cash, etc.) and it's
deducted there. Deleting or editing a movement **returns the exact amount** to that
account, even days later. *Why:* trust in a money tool is earned through data
integrity; a balance that doesn't reconcile makes it useless.

**One codebase, two ways to open it.**
The same page runs as an artifact (to iterate fast with AI) and as a Google web app
via Apps Script (to use daily without depending on anyone). *Why:* iteration speed
without sacrificing the final product's independence. *Trade-off:* one extra
abstraction layer in the sync code.

**Ultra-fast logging.**
A floating button, a thumb-first capture screen, and natural-language entry
("lunch 25 yape"). *Why:* every extra second and tap is an expense that won't get
logged.

## 4. How I'd measure success

- **Adherence:** movements logged per week (the north-star metric).
- **Coverage:** % of months with complete data.
- **Accuracy:** how often the app's balance matches the real balance when using
  "Reconcile accounts."
- **Progress:** emergency-fund progress toward a dated goal.

## 5. What I learned

- The data model *is* the product decision, not a technical detail: defining what
  counts as an expense changed the entire experience.
- Removing a step from logging is worth more than adding a new feature.
- Shipping something that lives without the tool it was built with (no login, in the
  user's own account) is part of the product, not an add-on.

## 6. Next steps

- Logging via WhatsApp (needs a service to receive the messages).
- Importing transactions from the bank.
- Carrying card debt from one month into the next.

---

*Personal, independent project. Contains no real financial data: the published
version opens empty, and the data lives in the user's own Google Sheet.*
