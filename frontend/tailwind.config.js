/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // User provided combos
                charcoal: '#233D4C',
                pumpkin: '#FD802E',
                deepOlive: '#1A2517',
                softSage: '#ACC8A2',
                ultraViolet: '#5F4A8B',
                lemonChiffon: '#FEFACD',
                oceanBlue: '#2872A1',
                cloudySky: '#CBDDE9',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
