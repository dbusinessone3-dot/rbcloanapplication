# RBC Loan Next.js — V9 Private Balance Update

## Completed update

### User dashboard available balance
- Removed the directly visible available balance from the dashboard home page.
- The wallet card now displays a masked balance placeholder.
- Added a clear **Show Balance** button.

### Balance popup
- Clicking **Show Balance** opens the existing bottom popup/drawer.
- The popup displays the user's available balance and account summary.
- Added a **Cash Out** button inside the popup.
- Added a separate **Close** button.

### Responsive behavior
- Desktop: Cash Out and Close buttons appear side by side.
- Mobile: buttons stack vertically for easier tapping.

## Changed files
- `components/dashboard-view.tsx`
- `app/globals.css`

## Validation
- `npm ci` passed
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run build` passed
