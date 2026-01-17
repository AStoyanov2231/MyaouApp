import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				dark: '#4f46e5',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			// New color tokens for design polish
  			warm: {
  				DEFAULT: 'hsl(var(--warm))',
  				foreground: 'hsl(var(--warm-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			'cat-pink': {
  				DEFAULT: 'hsl(var(--cat-pink))',
  				foreground: 'hsl(var(--cat-pink-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			// Colored shadows with primary tint
  			'primary-sm': '0 1px 2px 0 hsl(var(--primary) / 0.05)',
  			'primary-md': '0 4px 6px -1px hsl(var(--primary) / 0.1), 0 2px 4px -2px hsl(var(--primary) / 0.1)',
  			'primary-lg': '0 10px 15px -3px hsl(var(--primary) / 0.1), 0 4px 6px -4px hsl(var(--primary) / 0.1)',
  			'primary-xl': '0 20px 25px -5px hsl(var(--primary) / 0.1), 0 8px 10px -6px hsl(var(--primary) / 0.1)',
  			// Glow effects
  			'glow-primary': '0 0 20px hsl(var(--primary) / 0.3)',
  			'glow-accent': '0 0 20px hsl(var(--accent) / 0.3)',
  			'glow-success': '0 0 20px hsl(var(--success) / 0.3)',
  			'glow-warm': '0 0 20px hsl(var(--warm) / 0.3)',
  			// Card hover lift effect
  			'lift': '0 20px 25px -5px hsl(var(--primary) / 0.08), 0 8px 10px -6px hsl(var(--primary) / 0.04)',
  		},
  		animation: {
  			'shimmer': 'shimmer 2s linear infinite',
  			'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
  			'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
  			'slide-indicator': 'slide-indicator 0.3s ease-out',
  			'typing-dot': 'typing-dot 1.4s ease-in-out infinite',
  			'confetti': 'confetti 0.8s ease-out forwards',
  			'spin-slow': 'spin 3s linear infinite',
  		},
  		keyframes: {
  			shimmer: {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(100%)' },
  			},
  			'pulse-soft': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.5' },
  			},
  			'bounce-soft': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-25%)' },
  			},
  			'slide-indicator': {
  				'0%': { transform: 'scaleX(0.8)', opacity: '0.5' },
  				'100%': { transform: 'scaleX(1)', opacity: '1' },
  			},
  			'typing-dot': {
  				'0%, 60%, 100%': { transform: 'translateY(0)' },
  				'30%': { transform: 'translateY(-4px)' },
  			},
  			'confetti': {
  				'0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
  				'100%': { transform: 'translateY(-200px) rotate(720deg)', opacity: '0' },
  			},
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
