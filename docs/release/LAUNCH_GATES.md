# Gates before a market launch

The current candidate supports an investor demonstration and invited playtests. Automated completion proves that paths are reachable; it does not establish fun, retention, accessibility, console-level quality or production reliability. There is no honest fixed completion date for those outcomes without measuring the following work.

| Priority | Work | Evidence required to close |
| --- | --- | --- |
| P0 | Resolve remaining runtime dependency advisories and review the authentication/session threat model | Clean production dependency scan or documented, reviewed mitigation for each finding; registration/login abuse controls, session expiry/recovery and secret handling verified |
| P0 | Verify production operations before inviting public accounts | Reproducible staging deployment, TLS/config validation, database backup **and restore** exercise, error monitoring, rollback and ownership assigned |
| P0 | Verify game controls on target hardware | Actual Mac Safari, Chrome, iPhone and Android runs; physical controller if advertised; recover from focus changes, graphics loss and refresh without losing account data |
| P0 | Evaluate core football feel with players | Recorded sessions showing ordinary users can dribble, pass, tackle and score without coaching; address input latency, camera visibility, keeper balance and movement issues found |
| P1 | Choose the primary commercial game and audience | Invited-player interviews and repeated sessions demonstrate which loop users understand and want to return to; avoid committing to console-quality scope without a team/budget |
| P1 | Expand content and presentation of the selected game | Multiple sessions of varied content, readable animations and feedback, tutorial, difficulty progression, audio and art with documented rights |
| P1 | Complete accessibility/performance checks | Keyboard and touch paths, readable targets/contrast, reduced motion and screen-reader review; measured frame times/memory on low-end target devices, with budgets and acceptance thresholds agreed |
| P1 | Define account/data and support operations | Clear privacy/terms appropriate to the actual launch markets and audience, account deletion/recovery, support contact and issue response workflow |
| Later | Online rooms, social systems and purchases | Separate server-authoritative design, abuse/fraud/load testing, operational cost model and explicit product approval |

No public deployment or main-branch merge is included in this candidate. Review the branch and evidence first. Production credentials and real customer data are not required for local playtesting.
