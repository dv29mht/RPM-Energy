You are an expert Full-Stack Developer. We are building the RPM.ENERGY MVP based on the following Product Specification. Follow the tech stack: React, Vite, Tailwind CSS, Lucide React, and Recharts. Use the Dummy Data seeding logic for the initial build.

1. Product Overview

1.1 The Problem
Personal trainers with 5+ clients are operationally blind. Their entire client relationship is about pain points of why clients don't lose weight, how can they be more regular, and what time to show up.

There is no structured view of how clients are doing, no way to identify who is falling behind, and no command center to run a professional training practice.

Core Insight
Trainers don't need another logging tool — they need a command center that turns the chaos of WhatsApp conversations into structured, actionable client intelligence.

1.2 The Solution
RPM.ENERGY is a trainer-side admin console that gives personal trainers a structured view of all their clients' progress, engagement, and status — in one place. In V1, data is seeded with dummy content to validate the experience with real trainers before the WhatsApp bot integration is built.

1.3 Who This Is For
This product is FOR	This product is NOT for (V1)
✓  Independent & gym-based personal trainers	✗  Gym owners managing entire facilities
✓  Trainers with 5 or more active clients	✗  Trainers who already use structured software
✓  Trainers who currently manage clients via WhatsApp	✗  Enterprise or chain gym management
✓  Trainers operating in India (UPI-native market)	✗  Client-facing apps or member portals (V2)

 
2. Core User Flows

Every screen and interaction in RPM.ENERGY maps back to one of these primary flows. These flows are the source of truth for the build — when in doubt about a feature decision, refer back to which flow it belongs to.

Flow A — Trainer Onboarding & Setup

The trainer's first experience. Gets them from zero to a populated dashboard as quickly as possible.

A1	Land on Sign-Up Page
Trainer arrives via link or ad. Sees clean value prop: 'Your client command center. Stop managing using memory.'

A2	Create Account
Email + password signup. No complex onboarding wizard. Name, email, password — done. OAuth (Google) optional for V2.

A3	Profile Setup
Trainer fills in: Display name, gym affiliation (optional), operating type (independent / gym-based / both). Takes under 60 seconds.

A4	Add First Client
Prompted immediately after profile setup. Trainer adds client name, phone number, start date, and goal. This creates the client record.

A5	Dashboard Loaded with Dummy Data
First-time trainers see a pre-populated dashboard with realistic dummy client data. Shown with a banner: 'This is sample data — your real clients will appear here.' Allows trainer to explore before committing.


Why Dummy Data?
V1's purpose is trainer validation, not production use. Dummy data lets trainers experience the full value of the dashboard immediately, without needing to onboard real clients first. This dramatically reduces time-to-wow.

Flow B — Dashboard (The Command Center)

The most important screen in the product. The trainer opens RPM.ENERGY every morning and this is what they see. It must answer the question: 'How are my clients doing this week?' in under 10 seconds.

B1	Weekly Snapshot Cards
4 stat cards at the top: (1) Total active clients, (2) Avg meals logged this week across all clients, (3) Avg check-in logs this week, (4) Star Client of the Week — the client with the highest engagement score.

B2	Client Engagement Graph
A bar or line chart showing each client's logging frequency over the past 4 weeks. Allows the trainer to visually spot drop-offs and spikes.

B3	Weight Progress Overview
A multi-line graph showing weight trend for each active client over time. Trainer can toggle individual clients on/off.

B4	Client Classification Panel
A segmented list showing clients grouped as: Serious (logging 5+ times/week), Active (3-4 times/week), Casual (1-2 times/week), Inactive (0 logs this week). Auto-calculated but trainer can manually override any tag.

B5	Quick Action Bar
From the dashboard, trainer can: tap a client to view their full profile, send a nudge (WhatsApp deep link in V1), or mark a session as completed.


Flow C — Client Profile & Progress View

The deep-dive view for a single client. The trainer can access this by clicking any client card from the dashboard or client list.

C1	Client Header
Photo (optional), name, phone number, start date, current goal, and their classification badge (Serious / Active / Casual / Inactive).

C2	Weight Chart
Line graph of the client's weight over their entire history with the trainer. Shows start weight, current weight, and % change.

C3	Workout Completion Tracker
A weekly calendar view showing which days the client logged a workout. Color-coded: green = logged, gray = no log, yellow = partial.

C4	Meal Log Summary
A weekly summary of how many meals the client logged per day. Not the food content itself (that's WhatsApp) — just the count. Trend graph over 4 weeks.

C5	Trainer Notes
A freeform notes section for the trainer to log observations, form cues, or personal context about the client. Private to trainer only.

C6	Assigned Workout Plan
Shows the currently assigned workout plan template. Trainer can reassign or print/export to share via WhatsApp. Creating and managing templates is done in Flow D.


Flow D — Workout Plan Builder

Trainers create reusable workout templates that can be assigned to any client. The plan is designed to be exported and pasted into WhatsApp as a clean, readable message.

D1	Open Plan Library
Trainer navigates to Plans section. Sees all their saved templates in a card grid. Can create new, edit, duplicate, or delete templates.

D2	Create New Plan
Trainer names the plan (e.g. 'Beginner Fat Loss 3-Day'), adds a description, and starts building day-by-day workouts.

D3	Add Exercises to Days
For each day, trainer adds exercises with sets, reps, and optional notes. UI: simple input rows — no complex drag-and-drop needed for V1.

D4	Save Template
Plan saved to library. Can be previewed at any time.

D5	Assign to Client
From the plan or from the client profile, trainer taps 'Assign to Client' and picks from their client list. This links the plan to the client.

D6	Export / Print for WhatsApp
Trainer hits 'Share Plan' — the plan is formatted into a clean, readable text block that can be copied and pasted directly into WhatsApp. No PDF complexity in V1.


Flow E — Schedule & Session Management

The trainer's weekly schedule. Supports both pre-planning sessions and logging them after the fact.

E1	Open Schedule View
Calendar view (week default, can toggle to month). Each day shows sessions scheduled. At a glance: how full is my week?

E2	Book a Session (Plan Ahead)
Trainer taps a time slot and selects a client. Sets session type (in-person / online), date, time, and optional notes. Session appears in calendar.

E3	Log a Session (After the Fact)
Trainer taps 'Log Session' from client profile or from today's schedule. Marks session as: Completed, Client No-Show, or Cancelled. Adds optional notes.

E4	Today's Sessions Strip
The dashboard (Flow B) includes a 'Today' strip at the top showing all sessions scheduled for that day with one-tap access to each client.


Flow F — Payments Module (Coming Soon)

Payments — Coming Soon
The payments module is intentionally excluded from V1. It will be displayed in the navigation as a locked item with a 'Coming Soon' badge. This reserves the real estate in the product without requiring any build effort. The module will include UPI payment tracking, renewal reminders, and payment history logs in a future version.

Flow G — OCR Dashboard Screenshot & Mood Chart

Clients share their fitness dashboard screenshots on WhatsApp daily. This flow lets the trainer upload those screenshots into the client profile, where OCR extracts the logged data and RPM.ENERGY builds a Mood Chart — a visual representation of how engaged and consistent the client felt on each day, based on what they actually logged.

Core Idea
A client's dashboard screenshot is a window into their day. If they logged 4 meals, hit their water goal, and tracked their workout — that's a high-energy day. If only 1 meal was logged and nothing else — that's a low day. The Mood Chart makes this visible to the trainer across the entire week without reading a single chat message.

G1	Trainer Opens Client Profile
Trainer taps a client from the dashboard or client list. Inside the client profile, a new section called 'Mood Chart' is visible below the Workout Completion tracker.

G2	Upload Dashboard Screenshot
Trainer sees a calendar for the current week. Each day has either a screenshot thumbnail (if uploaded) or an empty slot. Trainer taps an empty day slot and uploads the client's dashboard screenshot for that day. Accepts JPG/PNG from camera roll or files.

G3	OCR Processing
On upload, the image is passed through an OCR engine (Tesseract.js for V1, upgradeable to Google Vision API in V2). The OCR reads the screenshot and extracts key signals: number of meals logged, water intake level, workout status, step count, and sleep score — whatever the client's health dashboard app tracks.

G4	Mood Score Calculation
Based on the OCR-extracted values, a Mood Score (0–100) is calculated for that day using a weighted formula (see Section 5.3). The score maps to one of 5 mood states: Thriving (80–100), On Track (60–79), Neutral (40–59), Low Energy (20–39), Struggling (0–19).

G5	Mood Chart Rendered
The 7-day Mood Chart renders as a colour-coded bar strip across the week — one block per day, coloured by mood state. Trainer can tap any day to see the raw OCR-extracted values that produced that score.

G6	No Screenshot Uploaded — Nudge Trigger
If a day has no screenshot uploaded by 8 PM, that slot shows a grey 'No Data' state with a 'Nudge' button. Tapping it opens WhatsApp with a pre-filled message: 'Hey [name]! Don't forget to send your dashboard screenshot for today 📊'

G7	Weekly Mood Summary
A summary line above the chart shows: best day of the week, worst day, and overall mood trend (Improving / Declining / Stable) with a directional arrow. This is the trainer's at-a-glance read on the client's mental and physical consistency.


⚠️  OCR Fallback Handling
If OCR fails (blurry image, unsupported app layout, or low contrast), the system shows a 'Could not read screenshot' warning on that day's slot. The trainer can manually override by entering the values by hand. The screenshot thumbnail is always saved regardless of OCR success.

 
3. Screen-by-Screen Specification

3.1 Screen: Dashboard
Route: /dashboard — Default landing screen after login.

Element	Description	Priority
Today Strip	Horizontal scrollable row of today's sessions with client name, time, and session type	Must Have
Stat Card: Active Clients	Total count of active clients this month	Must Have
Stat Card: Avg Meals Logged	Average number of meal logs per client this week	Must Have
Stat Card: Avg Check-ins	Average number of dashboard logs per client this week	Must Have
Stat Card: Star Client	Client with highest engagement score this week, shown with name + photo	Must Have
Engagement Bar Chart	Per-client weekly logging frequency — 4-week view	Must Have
Weight Trend Graph	Multi-client weight over time — toggle individual clients	Must Have
Client Classification Panel	Clients grouped by engagement tier with override control	Must Have
Quick Action: WhatsApp Nudge	Deep link to open WhatsApp chat with a specific client	Must Have
Dummy Data Banner	Persistent banner on first login explaining the sample data state	Must Have

3.2 Screen: Client List
Route: /clients — Full list of all trainer's clients.

Element	Description	Priority
Client Cards	Photo, name, classification badge, last log date, current weight	Must Have
Search Bar	Filter clients by name	Must Have
Filter by Classification	Filter view by Serious / Active / Casual / Inactive	Must Have
Add New Client Button	Opens modal: name, phone, start date, goal	Must Have
Sort Options	Sort by name, last activity, start date	Must Have

3.3 Screen: Client Profile
Route: /clients/:id — Deep view for a single client.

Element	Description	Priority
Client Header	Name, photo, phone, start date, goal, classification badge	Must Have
Weight Chart	Full weight history line graph with start/current/change	Must Have
Workout Completion	Weekly calendar heatmap showing logged vs missed workouts	Must Have
Meal Log Summary	Daily meal count bar chart — 4-week view	Must Have
Mood Chart Strip	7-day colour-coded bar showing daily mood state derived from OCR screenshot data	Must Have
Mood Weekly Summary	Best day, worst day, and trend direction (Improving/Declining/Stable) above the chart	Must Have
Screenshot Upload Slots	Per-day upload zone in the Mood Chart section — accepts JPG/PNG from camera or files	Must Have
Nudge Button (No Data)	Appears on any day with no screenshot uploaded — opens WhatsApp with pre-filled reminder message	Must Have
OCR Raw Data Popup	Tap any mood day block to see the extracted values: meals, water, workout, steps, sleep	Must Have
Manual Override (OCR fail)	If OCR fails, trainer can manually enter the values for that day	Must Have
Trainer Notes	Rich text notes section — private to trainer	Must Have
Assigned Plan Card	Shows current plan with option to change or share to WhatsApp	Must Have
Session History	List of all past sessions with status and notes	Must Have
Edit Client Details	Update client name, goal, phone, classification override	Must Have

3.4 Screen: Workout Plan Library
Route: /plans — Template library and plan builder.

Element	Description	Priority
Plan Cards Grid	Each card: plan name, description, number of days, assigned client count	Must Have
Create New Plan	Opens plan builder — name, description, day-by-day exercises	Must Have
Exercise Input Rows	Per day: exercise name, sets, reps, optional notes	Must Have
Assign to Client	Dropdown to assign plan to one or more clients	Must Have
Share / Export	Generates clean text block for WhatsApp — copy to clipboard	Must Have
Duplicate Plan	Clone existing template as starting point	Must Have

3.5 Screen: Schedule / Calendar
Route: /schedule — Weekly and monthly session calendar.

Element	Description	Priority
Week Calendar View	Default view — 7-day grid with sessions as blocks	Must Have
Month Calendar View	Toggle to month view — dots per day indicating session count	Must Have
Session Block	Client name, time, session type indicator (in-person/online)	Must Have
Book Session Modal	Client picker, date/time, session type, notes	Must Have
Log Session Modal	Status picker (Completed/No-Show/Cancelled) + notes	Must Have
Session Detail View	Tap session to see full details and quick link to client profile	Must Have

3.6 Screen: Payments (Coming Soon)

COMING SOON
This screen is locked in V1. It will appear in the navigation with a 'Coming Soon' lock icon. No functionality should be built here.

 
4. Data Model

The following entities are required to support all V1 user flows. This is a logical data model — implementation details (SQL vs NoSQL, field types) are left to the developer.

4.1 Trainer
Field	Type	Notes
trainer_id	UUID	Primary key
name	String	Display name
email	String	Login identifier
gym_affiliation	String	Optional — gym name if applicable
operating_type	Enum	independent | gym_based | both
created_at	Timestamp	Account creation date

4.2 Client
Field	Type	Notes
client_id	UUID	Primary key
trainer_id	UUID (FK)	References Trainer
name	String	Client full name
phone	String	Used for WhatsApp deep link
start_date	Date	When training began
goal	String	e.g. Fat loss, muscle gain
classification	Enum	serious | active | casual | inactive
classification_override	Boolean	True if trainer manually set the tag
assigned_plan_id	UUID (FK)	References WorkoutPlan
notes	Text	Trainer-only private notes
is_dummy	Boolean	True for seeded sample data clients

4.3 Log Entry
Represents any client data point logged (weight, meal count, workout). In V1 these are seeded as dummy data. In V2 they will come from the WhatsApp bot.

Field	Type	Notes
log_id	UUID	Primary key
client_id	UUID (FK)	References Client
log_type	Enum	weight | meal | workout
value	Float	Weight in kg, meal count, or 1 (workout done)
logged_at	Timestamp	When the log was recorded
source	Enum	whatsapp_bot | manual | dummy

4.4 Dashboard Screenshot (OCR)
Stores each daily dashboard screenshot uploaded by the trainer, plus the OCR-extracted values and the computed mood score for that day.

Field	Type	Notes
screenshot_id	UUID	Primary key
client_id	UUID (FK)	References Client
image_url	String	Storage path (Supabase Storage or S3)
date	Date	The day this screenshot represents
ocr_raw	JSON	Raw key-value pairs extracted by OCR
meals_logged	Integer	Extracted: number of meals tracked that day
water_ml	Integer	Extracted: water intake in ml (if readable)
workout_done	Boolean	Extracted: was a workout logged
steps	Integer	Extracted: step count (if readable)
sleep_hours	Float	Extracted: sleep duration (if readable)
mood_score	Integer	Computed 0–100 score — see Section 5.3
mood_state	Enum	thriving | on_track | neutral | low_energy | struggling
ocr_success	Boolean	False if OCR failed to parse the image
manually_overridden	Boolean	True if trainer entered values by hand
nudge_sent_at	Timestamp	Timestamp of last WhatsApp nudge sent for this day

 
5. Client Engagement Scoring Logic

The classification system is the intelligence layer of RPM.ENERGY. It tells the trainer, at a glance, which clients need attention and which are crushing it. Here is the exact logic for how it works.

5.1 Scoring Inputs
The engagement score is calculated weekly, based on the rolling 7-day window of log entries for each client. Three signals are used:

Signal	Weight	How it's counted
Workout Logs	50%	1 point per workout logged in the past 7 days (max 7)
Meal Logs	30%	1 point per day at least 1 meal was logged (max 7)
Weight Logs	20%	1 point per weight entry this week (max 1 for the week)

5.2 Classification Thresholds
Classification	Score Range	Trainer Action Suggestion
🏆 Serious	80 – 100	Celebrate them. They are your best marketing.
✅ Active	50 – 79	Keep momentum. Light check-in this week.
⚠️ Casual	20 – 49	Send a nudge. Ask if schedule has changed.
🔴 Inactive	0 – 19	Priority follow-up. Risk of churn.

Override Rule
If the trainer manually overrides a classification, the override persists until the trainer resets it OR until the score crosses a threshold by more than 20 points. This prevents the auto-score from undoing a deliberate trainer decision.

5.3 OCR Mood Score Formula
The Mood Score is calculated per day, per client, based on values extracted from their dashboard screenshot. It is independent of the weekly engagement classification score — it is a daily signal, not a weekly one.

OCR Signal	Weight	Scoring Method
Meals Logged	35%	Full score if 3+ meals. Partial for 2 meals. Low for 1 meal. Zero for none.
Workout Logged	30%	Binary — full score if workout present, zero if absent.
Water Intake	20%	Full score at 2L+. Scaled down proportionally below that.
Steps / Activity	10%	Full score at 8,000+ steps. Partial below. Zero if undetected.
Sleep (prev night)	5%	Full score at 7+ hours. Partial for 5–7 hrs. Zero under 5 hrs.

5.3.1 Mood State Thresholds
	Mood State	Score	Chart Colour
🌟	Thriving	80 – 100	Deep Green  (#16A34A)
✅	On Track	60 – 79	Light Green  (#4ADE80)
😐	Neutral	40 – 59	Amber  (#F59E0B)
😔	Low Energy	20 – 39	Orange  (#F97316)
🔴	Struggling	0 – 19	Red  (#EF4444)

5.3.2 No Screenshot — Nudge Logic
Nudge Trigger Rules
1.  If no screenshot is uploaded for a day by 8 PM — show the Nudge button on that day's slot.
2.  The Nudge button opens WhatsApp with this pre-filled message: 'Hey [name]! Don't forget to send your dashboard screenshot for today 📊'
3.  Once a nudge has been sent, the button changes to 'Nudge Sent ✓' — it can still be tapped again but shows a sent state to avoid double-nudging.
4.  Days with no screenshot and no nudge sent display as grey 'No Data' blocks on the mood chart — never blank, always a visible empty state.

6. V2 Roadmap — Out of Scope for MVP

The following features are intentionally excluded from V1. They are documented here to ensure no accidental scope creep and to give the vibe-coder clarity on what NOT to build yet.

Feature	Notes
WhatsApp Bot Integration	Bot will pipe client logs directly into the CRM. V1 uses dummy data in its place.
Client Portal / Login	Client-facing view of their own progress. Deferred to V2.
Payments Module	UPI tracking, renewal reminders, payment history. Navigation placeholder in V1.
Google OAuth Login	Simpler onboarding via Google. V1 uses email/password only.
Push / SMS Notifications	Reminders for trainers on session time, inactive clients. V1 uses in-app nudge only.
Multi-trainer Support	Gym owners managing a team of trainers. Out of scope for MVP.
AI-Powered Insights	Auto-generated advice like 'Client X plateau detected — consider adjusting macros.' Future feature.

 
7. Developer Build Notes

Specific notes for the vibe-coder to ensure V1 is built to the exact spec without over-engineering.

7.1 Tech Assumptions
•	Frontend: React or Next.js — component-based UI essential for the dashboard charts
•	Charts: Use Recharts or Chart.js for weight trend, engagement graphs, and the Mood Chart strip
•	Auth: Clerk or Supabase Auth — email/password only for V1
•	Database: Supabase (Postgres) — simple schema, real-time capable for V2
•	File Storage: Supabase Storage for dashboard screenshot images
•	OCR Engine: Tesseract.js (client-side, V1) — upgradeable to Google Vision API in V2 for better accuracy
•	Styling: Tailwind CSS — fast, utility-first, works great with the card-heavy UI

7.2 OCR Implementation Notes
Tesseract.js runs entirely in the browser — no server-side processing needed for V1. This keeps costs zero and complexity low. The tradeoff is speed (3–8 seconds per image) and accuracy on non-standard dashboard layouts.

V1 OCR Implementation — Keep It Simple
1.  Use Tesseract.js to extract all readable text from the uploaded image.
2.  Run a set of regex patterns to find numbers next to keywords: 'meals', 'water', 'steps', 'sleep', 'workout'.
3.  Store the raw OCR text alongside the extracted values so the trainer can verify if needed.
4.  If fewer than 2 signals are extracted, flag ocr_success = false and show the manual override UI.
5.  Popular fitness apps in India (HealthifyMe, Google Fit, Samsung Health) should be the primary test targets for OCR accuracy validation.

7.3 Dummy Data Seeding
On first login, the system should seed the trainer's account with 6 dummy clients and 8 weeks of fake log data. Each dummy client should represent a different classification tier so the trainer can see all four tiers populated in their first session.

Dummy Data Spec
Seed: 2 Serious clients, 2 Active clients, 1 Casual client, 1 Inactive client. Each with: 8 weeks of weight logs, 8 weeks of meal logs (varied frequency), 8 weeks of workout logs. All marked with is_dummy: true so they can be purged when real clients are added.

7.4 WhatsApp Deep Link
The 'Send Nudge' action in V1 opens WhatsApp with a pre-filled message using the client's phone number. Use the standard WhatsApp URL scheme:

https://wa.me/{phone}?text=Hey! Just checking in on your progress this week 💪

7.5 Classification Score Recalculation
Run the engagement score calculation every Sunday midnight (or on-demand when the dashboard is loaded). Do not recalculate on every page load — cache the weekly score and invalidate it only when new logs are added or on the weekly cron.

7.6 Navigation Structure
Nav Item	Route	State in V1
Dashboard	/dashboard	Active
My Clients	/clients	Active
Schedule	/schedule	Active
Workout Plans	/plans	Active
Payments	/payments	Locked — Coming Soon badge
Settings	/settings	Active — name, email only
