import { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { AboutScreen } from './screens/AboutScreen';

export type Screen = 'home' | 'about';

export function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <main className="app">
      {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
      {screen === 'about' && <AboutScreen onBack={() => setScreen('home')} />}
    </main>
  );
}
