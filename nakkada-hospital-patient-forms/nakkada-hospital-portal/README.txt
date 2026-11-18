# Nakkada Mission Hospital – Patient Registry UI

## Files
- `index.html` – existing dashboard with two added bilingual pages: OP Patient Registration and Initial Assessment.

## Run
Open `index.html` in a modern browser. No build step is required.

## What was added
- OP registration fields transcribed from the supplied outpatient registration sheet.
- Medical file-cover details included in the registration workflow.
- Initial assessment fields transcribed from the supplied assessment booklet.
- English labels with Malayalam translations.
- Dashboard and existing colour palette, backgrounds, gradients and typography retained.
- Forms currently save only to the browser's local storage as a front-end prototype. They are not connected to a hospital database or backend.

## Important
This is a UI prototype, not a production medical-record system. Before entering real patient data, connect a secure backend/database and implement authentication, authorization, audit logging, backups and privacy safeguards.

## Latest changes
- records.html: full patient report (registration, file cover, OP ticket history, initial assessment, admission/bed history). Sidebar "Records" opens it.
- bed-allocation.html: 20 animated beds (Male 6, Female 6, Observation 4, De-addiction 4) - allocate, reserve, transfer, discharge, cleaning, maintenance block, admissions log.
- OP ticket is generated when a patient registration is saved; shown on the dashboard with a changeable status.
- The OP registration form was removed from the dashboard (the Register Patient buttons still open op-registration.html).
- Shared files: nakkada-data.js, nakkada-extra.css (keep them in the same folder).
- medical-files.html: file cover + full initial assessment for each patient (sidebar "Medical Files").
- Registration: Booking Number appears only when "booked earlier" = Yes; all fields required in both sections.
- Initial Assessment: Patient & Informant section fully required; each section has its own Save, plus "Save All Sections".

## Latest changes (v4)
- Dashboard: the form cards (Initial Assessment, MSE, Bed Allocation, Medical File Cover, Diagnosis & Treatment) were removed; each is now a statistics card computed from saved records.
- Edit button on Records (patient details, file cover, each assessment) and Medical Files (file cover, each assessment); also "Edit" links in the dashboard tables.
- Every edit asks "Edited by" (remembered, defaults to Dr. Thomas Mathew) and stores the time automatically. "Last edited <time> by <user>" plus a change history (old -> new values) is shown on the edited section.
- Renaming a patient keeps their tickets, admissions, assessments and file cover linked.
- Note: there is no login yet, so "Edited by" is typed in. Replace with the authenticated user when a backend is added.


## Latest changes (v5)
- Dark mode: sun/moon button in the header of every page. Remembers your choice; until you choose, it follows the device setting. Files: nakkada-theme.js, nakkada-theme.css (keep with the pages).
- Removed the "6" badge beside Initial Assessment in the sidebar.
- Mental Status Exam and Diagnosis & Treatment are no longer sections inside Initial Assessment. They are separate pages (mental-status-exam.html, diagnosis-treatment.html): pick a saved assessment, fill the form, save. Data is stored on the same assessment record, so Records, Medical Files and the dashboard statistics keep working.
- Dashboard quick actions, module cards, workflow buttons and the sidebar now open the right pages.

## v6
- Mental Status Exam and Diagnosis & Treatment pages now use the original MSE and Examination & Treatment Plan forms. Saving updates the dashboard statistics.

## v7
- Mental Status Exam and Diagnosis & Treatment pages always show their own form (MSE / Examination & Treatment Plan) with a 'Save this section' button; only a Patient selector sits above it. Saving updates the dashboard.
