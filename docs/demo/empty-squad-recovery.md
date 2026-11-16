# Empty squad recovery

Opening a football game view repairs an entirely empty club only when no fixture has been played. It creates the standard 18-player roster, selects a valid XI for the saved formation, and synchronizes starter flags. Existing club identity, budget, market and fixtures are preserved. Existing rosters and played seasons are never regenerated. The team row lock prevents duplicate rosters from concurrent requests; existing season revisions advance once to reject stale writes.

No database migration or reset is required. Update feature/ludo-local, restart npm run dev, and refresh Overview or Starting XI using the existing account.

Regression coverage: legacy accounts with and without game state, concurrent requests, repeated reloads, starter flags, playing after recovery, preserving a nonempty roster and refusing recovery for a played season.
