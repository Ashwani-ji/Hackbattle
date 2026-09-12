'use client';

import { useEffect, useRef } from 'react';

const palette = {
  wallDark: '#10171e',
  wall: '#2a333c',
  wallLight: '#46515a',
  floor: '#39434b',
  floorDark: '#252d34',
  water: '#0d5661',
  waterLight: '#56e4dc',
  steel: '#9eafb5',
  steelDark: '#26343d',
  red: '#9d2635',
  redDark: '#42151e',
  gold: '#d79b4a',
  bug: '#ff6b6b',
  outline: '#080d12',
  stoneMid: '#56616a',
  tealDark: '#16434d',
  parchment: '#d9c7a0',
};

function drawStoneTile(context, x, y, width, height, offset = 0) {
  context.fillStyle = palette.wall;
  context.fillRect(x, y, width, height);
  context.fillStyle = palette.wallLight;
  context.fillRect(x + 3, y + 3, width - 7, 3);
  context.fillStyle = palette.outline;
  context.fillRect(x, y + height - 4, width, 4);
  context.fillRect(x + width - 4, y, 4, height);
  context.fillStyle = '#1c252d';
  context.fillRect(x + ((offset * 13) % Math.max(8, width - 8)) + 4, y + 15, 8, 3);
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawGlow(context, x, y, radius, color) {
  const glow = context.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawSpark(context, x, y, elapsed, index) {
  const drift = Math.sin(elapsed / 260 + index) * 4;
  context.fillStyle = index % 2 ? '#8dfff1' : '#f4d889';
  context.globalAlpha = 0.5 + (Math.sin(elapsed / 180 + index) + 1) * 0.2;
  context.beginPath();
  context.moveTo(x + drift, y - 5);
  context.lineTo(x + drift + 2, y);
  context.lineTo(x + drift, y + 5);
  context.lineTo(x + drift - 2, y);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
}

function drawStatue(context, x, y) {
  context.fillStyle = palette.outline;
  context.fillRect(x - 11, y + 22, 22, 7);
  context.fillStyle = palette.stoneMid;
  context.fillRect(x - 8, y + 2, 16, 22);
  context.fillRect(x - 12, y + 10, 24, 7);
  context.fillStyle = '#819096';
  context.fillRect(x - 4, y - 3, 8, 9);
  context.fillStyle = '#2b3840';
  context.fillRect(x - 3, y + 1, 2, 3);
  context.fillRect(x + 2, y + 1, 2, 3);
}

function drawAltar(context, x, y) {
  context.fillStyle = 'rgba(0, 0, 0, 0.35)';
  context.fillRect(x - 50, y + 28, 100, 8);
  context.fillStyle = '#26343c';
  context.fillRect(x - 42, y + 4, 84, 28);
  context.fillStyle = '#687981';
  context.fillRect(x - 34, y - 3, 68, 26);
  context.fillStyle = '#a8bbba';
  context.fillRect(x - 24, y + 2, 48, 4);
  context.fillStyle = '#3a4a51';
  context.fillRect(x - 50, y + 29, 100, 7);
  context.fillStyle = '#78fff0';
  context.fillRect(x - 3, y - 12, 6, 8);
  context.fillRect(x - 1, y - 17, 2, 3);
}

function drawChest(context, x, y) {
  context.fillStyle = '#1b252b';
  context.fillRect(x - 15, y - 2, 30, 20);
  context.fillStyle = '#c18b45';
  context.fillRect(x - 11, y + 1, 22, 12);
  context.fillStyle = '#f0bd66';
  context.fillRect(x - 4, y + 5, 8, 4);
  context.fillStyle = '#6b472c';
  context.fillRect(x - 15, y + 12, 30, 5);
}

function drawPixelKnight(context, x, groundY, attacking, charge) {
  const heroX = x + (attacking ? charge : 0);
  const y = groundY - 105;

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.6)';
  context.shadowBlur = 10;
  context.shadowOffsetY = 8;
  context.fillStyle = 'rgba(0, 0, 0, 0.45)';
  context.beginPath();
  context.ellipse(heroX + 23, groundY - 4, 37, 8, 0, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  context.fillStyle = palette.redDark;
  context.beginPath();
  context.moveTo(heroX - 8, y + 36);
  context.lineTo(heroX + 25, y + 42);
  context.lineTo(heroX + 24, y + 104);
  context.lineTo(heroX - 3, y + 96);
  context.closePath();
  context.fill();
  const armor = context.createLinearGradient(heroX + 16, y + 35, heroX + 52, y + 96);
  armor.addColorStop(0, '#b8cbd0');
  armor.addColorStop(0.28, '#62737d');
  armor.addColorStop(1, '#202c36');
  context.fillStyle = armor;
  roundedRect(context, heroX + 16, y + 36, 38, 62, 7);
  context.fill();
  context.fillStyle = '#171f27';
  roundedRect(context, heroX + 20, y + 65, 31, 31, 5);
  context.fill();
  context.fillStyle = '#171f27';
  context.fillStyle = '#76543a';
  context.fillRect(heroX + 21, y + 93, 11, 15);
  context.fillRect(heroX + 39, y + 93, 11, 15);

  const helmet = context.createLinearGradient(heroX + 10, y, heroX + 58, y + 40);
  helmet.addColorStop(0, '#d8e5e5');
  helmet.addColorStop(0.3, '#72858d');
  helmet.addColorStop(1, '#202d37');
  context.fillStyle = helmet;
  roundedRect(context, heroX + 11, y + 3, 45, 39, 6);
  context.fill();
  context.fillStyle = '#131c24';
  context.fillRect(heroX + 19, y + 23, 37, 8);
  context.fillRect(heroX + 48, y + 22, 11, 17);
  context.fillStyle = '#e1454b';
  context.beginPath();
  context.moveTo(heroX + 13, y + 3);
  context.lineTo(heroX + 22, y - 10);
  context.lineTo(heroX + 48, y - 10);
  context.lineTo(heroX + 42, y + 4);
  context.closePath();
  context.fill();
  context.fillStyle = palette.redDark;
  context.fillRect(heroX + 10, y + 1, 36, 4);

  context.fillStyle = palette.steel;
  context.fillRect(heroX - 10, y + 48, 17, 37);
  context.fillStyle = palette.steelDark;
  context.fillRect(heroX - 13, y + 52, 6, 28);

  context.fillStyle = '#e9f4f1';
  context.fillRect(heroX - 22, y + 43, 6, 63);
  context.fillStyle = '#52646b';
  context.fillRect(heroX - 16, y + 43, 5, 63);
  context.fillStyle = palette.gold;
  context.fillRect(heroX - 25, y + 97, 17, 6);

  if (attacking) {
    context.save();
    context.translate(heroX + 45, y + 55);
    context.rotate(-0.35 + charge / 100);
    context.fillStyle = '#f2faf7';
    context.fillRect(0, 0, 62, 7);
    context.fillStyle = '#52646b';
    context.fillRect(0, 7, 62, 3);
    context.fillStyle = palette.gold;
    context.fillRect(-8, -4, 9, 19);
    context.restore();
  }
  context.restore();
}

function drawCrawler(context, x, groundY, enemy, index, defeated) {
  if (defeated) return;
  const size = index % 4 === 3 ? 38 : 32;
  const y = groundY - size - 14;
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.5)';
  context.shadowBlur = 8;
  context.shadowOffsetY = 6;
  context.fillStyle = 'rgba(0, 0, 0, 0.45)';
  context.beginPath();
  context.ellipse(x, groundY - 5, size * 0.7, 7, 0, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  if (index === 0) {
    context.strokeStyle = '#ffdd85';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y + size / 2, size / 2 + 8, 0, Math.PI * 2);
    context.stroke();
  }
  const colors = ['#f36b73', '#a77bea', '#72c98d', '#bd805c'];
  const highlights = ['#ffb4ae', '#d3b8ff', '#c0f1be', '#edba8b'];
  const gradient = context.createRadialGradient(x - 6, y + 5, 2, x, y + size / 2, size);
  gradient.addColorStop(0, highlights[index % highlights.length]);
  gradient.addColorStop(1, colors[index % colors.length]);
  context.fillStyle = gradient;
  context.beginPath();
  if (index % 4 === 1) {
    context.arc(x, y + size / 2, size / 2, 0, Math.PI * 2);
  } else if (index % 4 === 2) {
    context.moveTo(x, y);
    context.lineTo(x + size / 2, y + size);
    context.lineTo(x - size / 2, y + size);
    context.closePath();
  } else {
    roundedRect(context, x - size / 2, y, size, size, 9);
  }
  context.fill();
  context.fillStyle = '#161421';
  context.beginPath();
  context.arc(x - 7, y + 12, 4, 0, Math.PI * 2);
  context.arc(x + 7, y + 12, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff2cc';
  context.fillRect(x - 6, y + 11, 2, 2);
  context.fillRect(x + 8, y + 11, 2, 2);
  context.fillStyle = '#f9f4e8';
  context.font = '10px monospace';
  context.textAlign = 'center';
  context.fillText(enemy.name, x, y + size + 13);
  if (index === 0) {
    context.fillStyle = '#171b20';
    context.fillRect(x - 22, y - 11, 44, 5);
    context.fillStyle = palette.bug;
    context.fillRect(x - 20, y - 9, 40, 2);
  }
  context.restore();
}

function drawScene(context, width, height, enemies, killedEnemies, attacking, targetIndex, elapsed) {
  const groundY = height - 29;
  context.fillStyle = palette.floor;
  context.fillRect(0, 0, width, height);

  context.fillStyle = palette.outline;
  context.fillRect(0, 0, width, height);
  context.fillStyle = palette.floorDark;
  context.fillRect(19, 18, width - 38, height - 48);

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < Math.ceil(width / 48); column += 1) {
      drawStoneTile(context, column * 48 - 8, row * 18, 50, 19, row + column);
    }
  }

  const sideWall = Math.max(92, Math.floor(width * 0.14));
  context.fillStyle = palette.wallDark;
  context.fillRect(0, 0, width, 82);
  context.fillRect(0, 0, 21, height);
  context.fillRect(width - 21, 0, 21, height);
  context.fillStyle = palette.wall;
  for (let y = 5; y < 82; y += 17) {
    context.fillRect(0, y, width, 7);
    context.fillStyle = '#171f27';
    context.fillRect(0, y + 7, width, 4);
    context.fillStyle = palette.wall;
  }
  for (let y = 14; y < height; y += 22) {
    context.fillStyle = '#202a32';
    context.fillRect(3, y, sideWall - 8, 10);
    context.fillRect(width - sideWall + 5, y, sideWall - 8, 10);
    context.fillStyle = palette.wallLight;
    context.fillRect(5, y, sideWall - 14, 3);
    context.fillRect(width - sideWall + 9, y, sideWall - 14, 3);
  }

  const roomLeft = sideWall;
  const roomWidth = width - sideWall * 2;
  context.fillStyle = '#424d53';
  context.fillRect(roomLeft, 100, roomWidth, groundY - 118);
  for (let y = 102; y < groundY - 18; y += 28) {
    for (let x = roomLeft - 20; x < width - sideWall; x += 42) {
      context.fillStyle = (Math.floor(y / 28) + Math.floor(x / 42)) % 2 ? '#3b474e' : '#465258';
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 24, y);
      context.lineTo(x + 42, y + 28);
      context.lineTo(x + 18, y + 28);
      context.closePath();
      context.fill();
      context.strokeStyle = 'rgba(20, 29, 34, 0.28)';
      context.stroke();
    }
  }

  for (const channelY of [82, groundY - 18]) {
    context.fillStyle = palette.water;
    context.fillRect(sideWall, channelY, width - sideWall * 2, 18);
    context.fillStyle = '#072831';
    context.fillRect(sideWall, channelY, width - sideWall * 2, 3);
    context.fillRect(sideWall, channelY + 15, width - sideWall * 2, 3);
    context.fillStyle = palette.waterLight;
    for (let x = sideWall + 5; x < width - sideWall; x += 17) {
      context.fillRect(x, channelY + 4, 7, 5);
    }
  }

  drawAltar(context, width / 2, 132);
  drawStatue(context, width * 0.22, 151);
  drawStatue(context, width * 0.78, 151);
  drawChest(context, width * 0.29, 183);
  drawChest(context, width * 0.71, 183);

  context.fillStyle = '#1b252c';
  context.fillRect(width * 0.18, 116, 16, 75);
  context.fillRect(width * 0.82 - 16, 116, 16, 75);
  context.fillStyle = '#9ba9a9';
  context.fillRect(width * 0.185, 122, 6, 61);
  context.fillRect(width * 0.82 - 11, 122, 6, 61);
  context.fillStyle = '#303d44';
  context.fillRect(width * 0.18 - 4, 116, 24, 7);
  context.fillRect(width * 0.82 - 20, 116, 24, 7);

  context.fillStyle = palette.steelDark;
  context.fillRect(width / 2 - 34, 20, 68, 52);
  context.fillStyle = palette.steel;
  context.fillRect(width / 2 - 24, 28, 48, 31);
  context.fillStyle = '#202a31';
  context.fillRect(width / 2 - 40, 70, 80, 7);
  context.fillStyle = '#68fff1';
  context.fillRect(width / 2 - 3, 11, 6, 6);

  const flicker = Math.sin(elapsed / 120) * 3;
  for (const x of [width * 0.28, width * 0.72]) {
    drawGlow(context, x, 116, 42, 'rgba(61, 238, 221, 0.18)');
    context.fillStyle = '#47e6db';
    context.fillRect(x - 5, 111 - flicker, 10, 22 + flicker);
    context.fillStyle = '#b4fff2';
    context.fillRect(x - 2, 106 - flicker, 4, 9);
  }

  drawGlow(context, width / 2, 50, 70, 'rgba(74, 218, 205, 0.08)');
  for (let index = 0; index < 8; index += 1) {
    drawSpark(context, width / 2 + (index - 4) * 20, 92 + (index % 3) * 22, elapsed, index);
  }

  context.fillStyle = 'rgba(7, 16, 21, 0.76)';
  context.fillRect(30, 29, 74, 18);
  context.fillStyle = palette.parchment;
  context.font = 'bold 10px monospace';
  context.textAlign = 'left';
  context.fillText('BUG DUNGEON', 38, 41);

  const targetX = 23 + (targetIndex + 1) * 0.18 * (width - 46);
  const charge = Math.min(1, elapsed / 380);
  const heroCharge = attacking ? (targetX - width * 0.12) * Math.min(1, charge * 1.2) : 0;
  drawPixelKnight(context, width * 0.12, groundY, attacking, heroCharge);

  enemies.forEach((enemy, index) => {
    drawCrawler(context, targetX + (index - targetIndex) * 42, groundY, enemy, index, killedEnemies.includes(index));
  });

  context.fillStyle = palette.wallDark;
  context.fillRect(0, groundY, width, height - groundY);

  const vignette = context.createRadialGradient(width / 2, height / 2, 70, width / 2, height / 2, width * 0.7);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

export default function DungeonCanvas({ enemies, killedEnemies, isKilling, targetIndex }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef({ enemies, killedEnemies, isKilling, targetIndex });
  sceneRef.current = { enemies, killedEnemies, isKilling, targetIndex };

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const context = canvas.getContext('2d');
    let frame;
    const startedAt = performance.now();

    const render = (now) => {
      const width = parent.clientWidth;
      const height = 300;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
      const scene = sceneRef.current;
      drawScene(
        context,
        width,
        height,
        scene.enemies,
        scene.killedEnemies,
        scene.isKilling,
        scene.targetIndex,
        now - startedAt
      );
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="dungeon-canvas" aria-label="Pixel dungeon combat arena" />;
}
