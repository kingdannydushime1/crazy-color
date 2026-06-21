import { useEffect, useState } from 'react';
import Phaser from 'phaser';
import MainScene from './game/MainScene';

export default function App() {
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobile = window.innerWidth < 1024;
      setIsMobileLandscape(isLandscape && isMobile);
      setIsDesktop(window.innerWidth >= 800);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    let game: Phaser.Game | null = null;

    const init = async () => {
      const gameWidth = isDesktop ? 600 : 400;
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'phaser-container',
        scale: {
          mode: isMobileLandscape ? Phaser.Scale.WIDTH_CONTROLS_HEIGHT : Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: gameWidth,
          height: 800
        },
        physics: {
          default: 'arcade',
          arcade: {
            debug: false,
            gravity: { y: 1500, x: 0 }
          }
        },
        scene: MainScene,
        backgroundColor: '#0a0a0f'
      };

      try {
        if (typeof (window as any).CrazyGames !== 'undefined') {
          await (window as any).CrazyGames.SDK.init();
        }
      } catch (e) {
        // SDK not available or init failed
      }

      const parentContainer = document.getElementById('phaser-container');
      if (parentContainer) {
        parentContainer.innerHTML = '';
      }

      game = new Phaser.Game(config);
    };

    init();

    return () => {
      if (game) {
        game.destroy(true);
      }
      const parentContainer = document.getElementById('phaser-container');
      if (parentContainer) {
        parentContainer.innerHTML = '';
      }
    };
  }, [isMobileLandscape, isDesktop]);

  return (
    <div
      className={`w-screen h-dvh bg-[#0a0a0f] touch-none select-none overflow-hidden flex items-center justify-center`}
    >
      <div id="phaser-container" className="w-full h-full max-h-[900px]" />
    </div>
  );
}
