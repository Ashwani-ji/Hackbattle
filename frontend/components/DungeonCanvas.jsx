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

function drawReferenceCorridor(context, width, height, elapsed, offset = 0) {
  context.save();
  context.translate(offset, 0);
  const floorY = height - 64;
  const wallGradient = context.createLinearGradient(0, 0, 0, floorY);
  wallGradient.addColorStop(0, '#202b32');
  wallGradient.addColorStop(1, '#46504d');
  context.fillStyle = wallGradient;
  context.fillRect(0, 0, width, floorY);

  for (let row = 0; row < 8; row += 1) {
    for (let column = -1; column < width / 38 + 1; column += 1) {
      const x = column * 38 + (row % 2) * 19;
      const y = row * 25;
      const shade = (row + column) % 3 === 0 ? '#59615b' : '#424b4b';
      context.fillStyle = shade;
      context.fillRect(x + 1, y + 1, 35, 21);
      context.fillStyle = '#263238';
      context.fillRect(x, y + 21, 38, 4);
      context.fillStyle = 'rgba(190, 205, 181, 0.08)';
      context.fillRect(x + 4, y + 4, 19, 3);
    }
  }

  const archX = width / 2;
  context.fillStyle = '#12191f';
  context.beginPath();
  context.moveTo(archX - 86, floorY);
  context.lineTo(archX - 86, 91);
  context.arc(archX, 91, 86, Math.PI, 0);
  context.lineTo(archX + 86, floorY);
  context.closePath();
  context.fill();
  context.strokeStyle = '#69736f';
  context.lineWidth = 9;
  context.stroke();
  context.strokeStyle = '#252f34';
  context.lineWidth = 5;
  context.stroke();

  context.fillStyle = '#060a0d';
  context.beginPath();
  context.moveTo(archX - 61, floorY);
  context.lineTo(archX - 61, 95);
  context.arc(archX, 95, 61, Math.PI, 0);
  context.lineTo(archX + 61, floorY);
  context.closePath();
  context.fill();

  for (const x of [26, width - 31]) {
    context.fillStyle = '#20292d';
    context.fillRect(x, 30, 7, floorY - 24);
    context.fillStyle = '#8f987e';
    context.fillRect(x + 8, 39, 4, floorY - 35);
    context.fillStyle = '#547044';
    for (let leaf = 0; leaf < 6; leaf += 1) {
      context.fillRect(x + 12 + (leaf % 2) * 8, 48 + leaf * 27, 9, 13);
    }
  }

  const torchPulse = 0.75 + Math.sin(elapsed / 190) * 0.15;
  for (const x of [width * 0.13, width * 0.87]) {
    drawGlow(context, x, 137, 52, `rgba(255, 196, 92, ${torchPulse * 0.22})`);
    context.fillStyle = '#a16c42';
    context.fillRect(x - 4, 134, 8, 22);
    context.fillStyle = '#ffe18b';
    context.beginPath();
    context.moveTo(x, 119);
    context.lineTo(x + 8, 143);
    context.lineTo(x - 8, 143);
    context.closePath();
    context.fill();
  }

  const floorGradient = context.createLinearGradient(0, floorY, 0, height);
  floorGradient.addColorStop(0, '#7f806a');
  floorGradient.addColorStop(1, '#303b3b');
  context.fillStyle = floorGradient;
  context.fillRect(0, floorY, width, height - floorY);
  context.strokeStyle = 'rgba(21, 28, 30, 0.5)';
  context.lineWidth = 2;
  for (let x = -height; x < width + height; x += 34) {
    context.beginPath();
    context.moveTo(x, floorY);
    context.lineTo(x + height, height);
    context.stroke();
  }
  for (let y = floorY + 17; y < height; y += 17) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function drawRoomMarker(context, x, y, variant) {
  context.fillStyle = '#172229';
  context.fillRect(x - 18, y - 30, 36, 42);
  context.fillStyle = variant % 2 ? '#566b70' : '#76563d';
  context.fillRect(x - 13, y - 25, 26, 31);
  context.fillStyle = variant % 2 ? '#a7c1bf' : '#c18b45';
  context.fillRect(x - 8, y - 19, 16, 5);
  context.fillStyle = '#202b31';
  context.fillRect(x - 16, y + 6, 32, 6);
}

function drawHud(context, width, elapsed) {
  context.save();
  context.fillStyle = 'rgba(31, 23, 23, 0.94)';
  context.fillRect(12, 10, 174, 58);
  context.fillStyle = '#b98a5c';
  context.fillRect(12, 10, 174, 4);
  context.fillRect(12, 64, 174, 4);
  context.strokeStyle = '#e0b77a';
  context.lineWidth = 2;
  context.strokeRect(14, 12, 170, 54);

  context.fillStyle = '#ec3b55';
  context.beginPath();
  context.arc(29, 27, 6, 0, Math.PI * 2);
  context.arc(38, 27, 6, 0, Math.PI * 2);
  context.lineTo(33.5, 40);
  context.closePath();
  context.fill();
  context.fillStyle = '#f8f4df';
  context.font = 'bold 12px monospace';
  context.textAlign = 'left';
  context.fillText('9 / 11', 51, 31);

  context.fillStyle = '#d6c6a1';
  context.fillRect(28, 42, 14, 8);
  context.fillStyle = '#5b92c7';
  context.fillRect(51, 43, 109, 7);
  context.fillStyle = '#55d5da';
  context.fillRect(51, 43, 78, 7);
  context.fillStyle = '#f8f4df';
  context.fillText('6 / 6', 51, 60);

  context.fillStyle = '#f5d44f';
  context.beginPath();
  context.arc(width - 82, 25, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff6bd';
  context.font = 'bold 14px monospace';
  context.fillText('5', width - 68, 30);
  context.fillStyle = 'rgba(55, 42, 35, 0.95)';
  context.fillRect(width - 54, 10, 40, 38);
  context.strokeStyle = '#c69a68';
  context.strokeRect(width - 54, 10, 40, 38);
  context.fillStyle = '#f5dfbb';
  context.fillRect(width - 43, 18, 4, 20);
  context.fillRect(width - 33, 18, 4, 20);

  context.globalAlpha = 0.8;
  context.fillStyle = '#d8e1df';
  context.font = '10px monospace';
  context.fillText('WAVE 01', width - 92, 62);
  context.globalAlpha = 1;
  context.restore();
}

function drawPixelKnight(context, x, groundY, attacking, charge, elapsed, weapon, attackProgress) {
  const heroX = x + (attacking ? charge : 0);
  const y = groundY - 105;
  const bob = attacking ? Math.sin(elapsed / 55) * 2 : Math.sin(elapsed / 300) * 2;
  const run = attacking ? Math.sin(elapsed / 70) : 0;
  const stanceY = y + bob;

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.6)';
  context.shadowBlur = 10;
  context.shadowOffsetY = 8;
  context.fillStyle = 'rgba(0, 0, 0, 0.45)';
  context.beginPath();
  context.ellipse(heroX + 23, groundY - 4, 37 + Math.abs(run) * 2, 8, 0, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  context.fillStyle = palette.redDark;
  context.beginPath();
  context.moveTo(heroX - 8, stanceY + 36);
  context.lineTo(heroX + 25, stanceY + 42);
  context.lineTo(heroX + 24, stanceY + 104);
  context.lineTo(heroX - 3, stanceY + 96);
  context.closePath();
  context.fill();
  const armor = context.createLinearGradient(heroX + 16, y + 35, heroX + 52, y + 96);
  armor.addColorStop(0, '#b8cbd0');
  armor.addColorStop(0.28, '#62737d');
  armor.addColorStop(1, '#202c36');
  context.fillStyle = armor;
  roundedRect(context, heroX + 16, stanceY + 36, 38, 62, 7);
  context.fill();
  context.fillStyle = '#171f27';
  roundedRect(context, heroX + 20, stanceY + 65, 31, 31, 5);
  context.fill();
  context.fillStyle = '#171f27';
  context.fillStyle = '#76543a';
  context.fillRect(heroX + 21, stanceY + 93 + run * 3, 11, 15);
  context.fillRect(heroX + 39, stanceY + 93 - run * 3, 11, 15);

  const helmet = context.createLinearGradient(heroX + 10, y, heroX + 58, y + 40);
  helmet.addColorStop(0, '#d8e5e5');
  helmet.addColorStop(0.3, '#72858d');
  helmet.addColorStop(1, '#202d37');
  context.fillStyle = helmet;
  roundedRect(context, heroX + 11, stanceY + 3, 45, 39, 6);
  context.fill();
  context.fillStyle = '#131c24';
  context.fillRect(heroX + 19, stanceY + 23, 37, 8);
  context.fillRect(heroX + 48, stanceY + 22, 11, 17);
  context.fillStyle = '#e1454b';
  context.beginPath();
  context.moveTo(heroX + 13, stanceY + 3);
  context.lineTo(heroX + 22, stanceY - 10);
  context.lineTo(heroX + 48, stanceY - 10);
  context.lineTo(heroX + 42, stanceY + 4);
  context.closePath();
  context.fill();
  context.fillStyle = palette.redDark;
  context.fillRect(heroX + 10, stanceY + 1, 36, 4);

  context.fillStyle = palette.steel;
  context.fillRect(heroX - 10, stanceY + 48 + run * 3, 17, 37);
  context.fillStyle = palette.steelDark;
  context.fillRect(heroX - 13, stanceY + 52 + run * 3, 6, 28);

  context.fillStyle = '#e9f4f1';
  context.fillRect(heroX - 22, stanceY + 43 - run * 3, 6, 63);
  context.fillStyle = '#52646b';
  context.fillRect(heroX - 16, stanceY + 43 - run * 3, 5, 63);
  context.fillStyle = palette.gold;
  context.fillRect(heroX - 25, stanceY + 97 - run * 3, 17, 6);

  if (attacking && weapon === 'gun') {
    context.save();
    context.translate(heroX + 43, stanceY + 57);
    context.fillStyle = '#202830';
    context.fillRect(0, -6, 28, 12);
    context.fillStyle = '#aebfc2';
    context.fillRect(7, -9, 13, 4);
    context.fillStyle = '#d79b4a';
    context.fillRect(-7, 2, 11, 10);
    context.fillStyle = '#ffe96a';
    context.shadowColor = '#ffe96a';
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(32, 0, 7 + Math.sin(elapsed / 35) * 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
  } else if (attacking) {
    context.save();
    context.translate(heroX + 45, stanceY + 55);
    const slash = Math.sin(attackProgress * Math.PI * 2);
    context.rotate(-0.7 + slash * 1.2);
    context.fillStyle = '#f2faf7';
    context.fillRect(0, 0, 70, 7);
    context.fillStyle = '#52646b';
    context.fillRect(0, 7, 70, 3);
    context.fillStyle = palette.gold;
    context.fillRect(-8, -4, 9, 19);
    if (charge > 0.48 && charge < 0.82) {
      context.strokeStyle = 'rgba(255, 244, 151, 0.8)';
      context.lineWidth = 4;
      context.beginPath();
      context.arc(22, 3, 47, -0.7, 0.45);
      context.stroke();
    }
    context.restore();
  }
  context.restore();
}

function drawCrawler(context, x, groundY, enemy, index, defeated, dying, elapsed) {
  const deathProgress = dying ? Math.min(1, Math.max(0, (elapsed - 2300) / 1100)) : 0;
  if (defeated && !dying) return;
  const size = 64;
  const y = groundY - 94 - deathProgress * 20;
  context.save();
  if (dying) {
    context.translate(x, y + 42);
    context.rotate(deathProgress * Math.PI * 1.8);
    context.scale(1 - deathProgress * 0.45, 1 - deathProgress * 0.45);
    context.translate(-x, -(y + 42));
    context.globalAlpha = 1 - deathProgress;
  }
  context.shadowColor = 'rgba(0, 0, 0, 0.5)';
  context.shadowBlur = 8;
  context.shadowOffsetY = 6;
  context.fillStyle = 'rgba(0, 0, 0, 0.45)';
  context.beginPath();
  context.ellipse(x, groundY - 4, 30, 6, 0, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  if (index === 0) {
    context.strokeStyle = '#ffdd85';
    context.lineWidth = 2;
    context.beginPath();
    context.strokeRect(x - 32, y - 4, 64, 86);
    context.stroke();
  }

  // Chunky pixel-art silhouette based on the supplied character reference.
  const isMage = index % 2 === 1;
  const face = '#ffe1a0';
  const faceLight = '#fff0be';
  const hair = isMage ? '#4b2819' : '#ad8458';
  const hairDark = isMage ? '#2c1713' : '#795538';
  const robe = isMage ? '#7d5b42' : '#9b7148';
  const accent = isMage ? '#a96bd0' : '#36b86b';

  context.fillStyle = hairDark;
  context.fillRect(x - 25, y + 9, 50, 47);
  context.fillRect(x - 18, y + 2, 37, 8);
  context.fillRect(x - 29, y + 18, 8, 31);
  context.fillRect(x + 21, y + 18, 8, 36);
  context.fillStyle = hair;
  context.fillRect(x - 21, y + 5, 42, 44);
  context.fillRect(x - 15, y - 1, 31, 7);
  context.fillRect(x - 25, y + 16, 8, 30);
  context.fillRect(x + 17, y + 12, 10, 39);

  context.fillStyle = face;
  context.fillRect(x - 17, y + 11, 34, 37);
  context.fillRect(x - 12, y + 7, 25, 42);
  context.fillStyle = faceLight;
  context.fillRect(x - 12, y + 12, 25, 29);
  context.fillStyle = '#080a0a';
  context.fillRect(x - 9, y + 16, 6, 19);
  context.fillRect(x + 5, y + 16, 6, 19);
  context.fillRect(x - 2, y + 40, 7, 4);

  context.fillStyle = robe;
  context.fillRect(x - 20, y + 48, 40, 30);
  context.fillRect(x - 27, y + 55, 54, 17);
  context.fillStyle = hairDark;
  context.fillRect(x - 28, y + 72, 56, 8);
  context.fillStyle = accent;
  context.fillRect(x - 21, y + 49, 11, 9);
  context.fillRect(x + 12, y + 49, 10, 9);
  context.fillStyle = face;
  context.fillRect(x - 34, y + 55, 12, 18);
  context.fillRect(x + 22, y + 55, 12, 18);
  context.fillStyle = '#5b4033';
  context.fillRect(x - 18, y + 78, 12, 11);
  context.fillRect(x + 7, y + 78, 12, 11);
  context.fillStyle = '#f9f4e8';
  context.font = '10px monospace';
  context.textAlign = 'center';
  context.fillText(enemy.name, x, y + 104);
  if (index === 0) {
    context.fillStyle = '#171b20';
    context.fillRect(x - 22, y - 11, 44, 5);
    context.fillStyle = palette.bug;
    context.fillRect(x - 20, y - 9, 40, 2);
  }
  if (dying) {
    for (let particle = 0; particle < 7; particle += 1) {
      const angle = particle * 0.9;
      const distance = 12 + deathProgress * 26;
      context.fillStyle = particle % 2 ? '#ffda7a' : '#ff7b83';
      context.fillRect(
        x + Math.cos(angle) * distance,
        y + size / 2 + Math.sin(angle) * distance,
        4,
        4
      );
    }
  }
  context.restore();
}

function drawScene(context, width, height, enemies, killedEnemies, attacking, targetIndex, elapsed, attackElapsed, weapon) {
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
    context.fillStyle = palette.wall;
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

  const scrollPreview = attacking ? Math.min(1, attackElapsed / 380) * 80 : 0;
  for (let marker = 0; marker < 5; marker += 1) {
    const markerX = ((marker * 190 + 60 - scrollPreview) % (width + 70)) - 35;
    drawRoomMarker(context, markerX, 215 + (marker % 2) * 18, marker);
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

  const spacing = Math.max(112, Math.floor(width * 0.24));
  const targetX = Math.min(width - 72, width * 0.72 + targetIndex * spacing);
  const charge = Math.min(1, attackElapsed / 3200);
  const runProgress = Math.min(1, Math.max(0, (attackElapsed - 250) / 2300));
  const easedRun = runProgress * runProgress * (3 - 2 * runProgress);
  const cameraPan = attacking ? Math.min(150, easedRun * 150) : 0;
  const sceneryShift = attacking ? -cameraPan * 0.45 : 0;
  drawReferenceCorridor(context, width, height, elapsed, sceneryShift);
  drawReferenceCorridor(context, width, height, elapsed, sceneryShift + width);

  if (attacking && runProgress < 1) {
    context.save();
    context.globalAlpha = 0.85;
    context.fillStyle = '#f3e4b0';
    context.font = 'bold 14px monospace';
    context.textAlign = 'center';
    context.fillText('CHARGE!', width * 0.5, 58);
    context.restore();
  }
  const heroCharge = attacking ? (targetX - width * 0.12) * easedRun : 0;
  if (attacking && charge < 0.72) {
    context.save();
    context.globalAlpha = 0.28;
    context.strokeStyle = '#d7f4e8';
    context.lineWidth = 4;
    for (let streak = 0; streak < 4; streak += 1) {
      const streakX = width * 0.12 + heroCharge - streak * 18;
      context.beginPath();
      context.moveTo(streakX, groundY - 38 - streak * 7);
      context.lineTo(streakX - 28, groundY - 38 - streak * 7);
      context.stroke();
    }
    context.fillStyle = '#c4d98d';
    context.globalAlpha = 0.65;
    for (let dust = 0; dust < 5; dust += 1) {
      context.fillRect(width * 0.12 + heroCharge - dust * 13, groundY - 8 - (dust % 2) * 5, 5, 5);
    }
    context.restore();
  }
  if (attacking && runProgress >= 0.88) {
    context.save();
    context.globalAlpha = 1 - Math.min(1, (runProgress - 0.88) * 8);
    context.strokeStyle = '#ffe96a';
    context.lineWidth = 5;
    context.shadowColor = '#fff09a';
    context.shadowBlur = 18;
    context.beginPath();
    context.moveTo(targetX - cameraPan - 28, groundY - 74);
    context.lineTo(targetX - cameraPan + 34, groundY - 116);
    context.stroke();
    context.restore();
  }
  drawPixelKnight(context, width * 0.12, groundY, attacking, heroCharge, attackElapsed, weapon, charge);

  enemies.forEach((enemy, index) => {
    const isDying = attacking && index === targetIndex;
    drawCrawler(
      context,
      targetX + (index - targetIndex) * spacing - cameraPan,
      groundY,
      enemy,
      index,
      killedEnemies.includes(index),
      isDying,
      attackElapsed
    );
  });

  context.fillStyle = palette.wallDark;
  context.fillRect(0, groundY, width, height - groundY);

  const vignette = context.createRadialGradient(width / 2, height / 2, 70, width / 2, height / 2, width * 0.7);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

export default function DungeonCanvas({ enemies, killedEnemies, isKilling, targetIndex, attackNonce, attackStartedAt }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef({ enemies, killedEnemies, isKilling, targetIndex, attackNonce, attackStartedAt });
  const attackRef = useRef({ nonce: 0, weapon: 'sword' });
  sceneRef.current = { enemies, killedEnemies, isKilling, targetIndex, attackNonce, attackStartedAt };

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    const context = canvas.getContext('2d');
    let frame;
    const startedAt = Date.now();

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
      if (scene.isKilling && scene.attackNonce !== attackRef.current.nonce) {
        attackRef.current = {
          nonce: scene.attackNonce,
          weapon: Math.random() < 0.22 ? 'gun' : 'sword',
        };
      }
      const attackElapsed = scene.isKilling && scene.attackStartedAt
        ? Math.max(0, Date.now() - scene.attackStartedAt)
        : 0;
      drawScene(
        context,
        width,
        height,
        scene.enemies,
        scene.killedEnemies,
        scene.isKilling,
        scene.targetIndex,
        Date.now() - startedAt,
        attackElapsed,
        attackRef.current.weapon
      );
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="dungeon-canvas" aria-label="Pixel dungeon combat arena" />;
}
