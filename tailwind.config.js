/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "#004D61", // Deep Apollo Teal
          base: "#007A99", // Official Apollo Teal
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          gold: "#F5A623", // Apollo Gold Flame
          amber: "#F5A623",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Official Apollo University Brand Palette
        brand: {
          teal: {
            50: "#F0F9FB",
            100: "#E0F3F7",
            200: "#B8E4ED",
            300: "#70C2D5",
            400: "#2B9EBC",
            500: "#007A99", // Primary Logo Teal
            600: "#006883",
            700: "#00536A",
            800: "#004153",
            900: "#002F3D",
          },
          gold: {
            50: "#FEF9EE",
            100: "#FDF0D5",
            200: "#FBE0AA",
            300: "#F8CA74",
            400: "#F6B43E",
            500: "#F5A623", // Flame Gold
            600: "#DB8C12",
            700: "#B36B0B",
            800: "#8E510E",
            900: "#74420F",
          },
          indigo: {
            50: "#F0F9FB",
            100: "#E0F3F7",
            200: "#B8E4ED",
            500: "#007A99",
            600: "#007A99",
            700: "#006883",
            800: "#00536A",
            900: "#004153",
          },
          amber: {
            50: "#FEF9EE",
            100: "#FDF0D5",
            200: "#FBE0AA",
            300: "#F8CA74",
            400: "#F6B43E",
            500: "#F5A623",
            600: "#DB8C12",
            700: "#B36B0B",
            800: "#8E510E",
            900: "#74420F",
          },
          slate: {
            50: "#F8FAFC",
            100: "#F1F5F9",
            200: "#E2E8F0",
            300: "#CBD5E1",
            400: "#94A3B8",
            500: "#64748B",
            600: "#475569",
            700: "#334155",
            800: "#1E293B",
            900: "#0F172A",
          },
          emerald: {
            50: "#ECFDF5",
            500: "#10B981",
            600: "#059669",
            700: "#047857",
          },
          rose: {
            50: "#FFF1F2",
            500: "#F43F5E",
            600: "#E11D48",
            700: "#BE123C",
          },
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
