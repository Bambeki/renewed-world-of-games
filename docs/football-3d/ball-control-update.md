# Ball control and locomotion update

Dribbling previously snapped the ball to a fixed offset every frame. It now uses timed foot-contact impulses and independently integrated rolling motion between touches. Sprint touches reach farther, shielding keeps touches short, and a heavy touch can release possession. Reception resets the foot-contact timer. Turning is rate-limited, analog stick magnitude scales movement pace, and the running cycle advances with distance travelled instead of match time. Computer carriers steer away from nearby defenders.

Controls are unchanged: movement aims travel, Shift sprints, F shields for tighter touches, Q feints, P/L/O pass, J tackles, C switches and Space charges/releases shots. Compare slow movement, sprinting and shielding on open grass, then approach a defender diagonally. These are mechanics changes within the existing stylized prototype; they are not console-quality motion capture or a complete new football engine. Character art and advanced tactical behavior remain limited.

Reference: EA's official FC24 gameplay notes describe controlled sprint, dribble touch and first-touch distinctions: https://www.ea.com/games/ea-sports-fc/pitch-notes/news/fc-24-gameplay-deepdive . No proprietary code or assets were copied.

Regression tests add variable player-to-ball separation, analog pace and smooth facing, plus stationary gait checks. Existing simulation and browser journeys remain required in CI. Physical controller feel and Safari performance require device testing.
