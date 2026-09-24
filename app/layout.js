import './globals.css';

export const metadata = {
  title: 'PlanetPulse - Carbon Footprint Tracker',
  description: 'Log daily activities, see your CO2 footprint and stay under a weekly target.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
