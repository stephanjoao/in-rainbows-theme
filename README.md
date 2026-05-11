# In Rainbows Theme

Visual Studio Code themes inspired by the colors of Radiohead's *In Rainbows*.

The accent palette comes from the album artwork: maize, tufts blue, flame, mantis, amber, off red, and non-photo blue. The neutral palette is built around Eigengrau, the perceived color of a closed eye, so the dark theme keeps a soft almost-black base instead of pure black.

I'm still in search for an inspiration for the light theme main color. What would be the opposite of the color of eyes closed?

## Development

- Theme file: `themes/dark.json`
- Light theme file: `themes/light.json`
- Palette reference: `colors.json`
- Local validation: `npm run validate`

Theme colors should use bases documented in `colors.json`. The dark theme uses Eigengrau as the neutral base and relies on alpha variants of Eigengrau, pure white, or pure black for contrast instead of adding extra Eigengrau tones. Non-neutral colors should use only the Radiohead base colors, adding alpha to the hex for variations.

## Testing Locally

Open this repository in VS Code and press `F5` to launch an Extension Development Host. The debug workspace selects `In Rainbows Light` automatically.
