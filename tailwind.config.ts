import type { Config } from "tailwindcss";

/**
 * EFPT brand tokens.
 *
 * These are PLACEHOLDER values. The real EFPT palette (rich-black monochrome)
 * and type scale live as CSS custom properties in `app/globals.css` so they
 * can be swapped in one place. The Tailwind utilities below simply reference
 * those variables, so changing a token in globals.css updates the whole app.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome / clinical palette — all driven by CSS variables.
        ink: "var(--efpt-ink)",
        "ink-soft": "var(--efpt-ink-soft)",
        "ink-mute": "var(--efpt-ink-mute)",
        line: "var(--efpt-line)",
        surface: "var(--efpt-surface)",
        "surface-raised": "var(--efpt-surface-raised)",
        canvas: "var(--efpt-canvas)",
        accent: "var(--efpt-accent)",
        // Conventional aliases used by base elements.
        background: "var(--efpt-canvas)",
        foreground: "var(--efpt-ink)",
      },
      fontFamily: {
        // Georgia serif for headings; system sans for body/UI.
        heading: "var(--efpt-font-heading)",
        sans: "var(--efpt-font-body)",
      },
      borderRadius: {
        token: "var(--efpt-radius)",
      },
      maxWidth: {
        shell: "var(--efpt-shell-max)",
      },
    },
  },
  plugins: [],
};
export default config;
