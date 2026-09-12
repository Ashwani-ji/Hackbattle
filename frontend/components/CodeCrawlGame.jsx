"use client";

import { useEffect, useRef } from "react";

export default function CodeCrawlGame({
  bugCount,
  complexityScore,
  quizzes,
  onEnemyCollision,
  onVictory,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    let destroyed = false;

    async function boot() {
      const Phaser = (await import("phaser")).default;
      if (destroyed || !containerRef.current) return;

      const enemyCount = Math.max(1, bugCount || 1);
      const hasBoss = (complexityScore || 0) > 10;
      const quizList = quizzes || [];

      class MainScene extends Phaser.Scene {
        constructor() {
          super("main");
          this.defeated = 0;
          this.total = enemyCount;
        }

        create() {
          this.cameras.main.setBackgroundColor("#0d1117");

          // Ground
          const ground = this.add.rectangle(400, 380, 800, 40, 0x2d333b);
          this.physics.add.existing(ground, true);

          // Player
          this.player = this.add.rectangle(60, 300, 32, 32, 0x58a6ff);
          this.physics.add.existing(this.player);
          this.player.body.setCollideWorldBounds(true);
          this.player.body.setGravityY(600);
          this.physics.add.collider(this.player, ground);

          // Enemies, spaced across the level
          this.enemies = this.physics.add.group();
          const spacing = 640 / (enemyCount + 1);
          for (let i = 0; i < enemyCount; i++) {
            const isBoss = hasBoss && i === enemyCount - 1;
            const size = isBoss ? 48 : 28;
            const color = isBoss ? 0xf85149 : 0xd29922;
            const x = 150 + spacing * (i + 1);
            const enemy = this.add.rectangle(x, 340 - size / 2, size, size, color);
            this.physics.add.existing(enemy);
            enemy.body.setImmovable(true);
            enemy.body.setAllowGravity(false);
            enemy.quizIndex = quizList.length ? Math.min(i, quizList.length - 1) : -1;
            enemy.isBoss = isBoss;
            this.enemies.add(enemy);
          }
          this.physics.add.collider(this.enemies, ground);

          this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
            if (!enemy.active) return;
            this.handleEnemyHit(enemy);
          });

          this.cursors = this.input.keyboard.createCursorKeys();
          this.wasd = this.input.keyboard.addKeys("W,A,S,D");

          this.hud = this.add.text(10, 10, `Bugs remaining: ${this.total}`, {
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#c9d1d9",
          });
        }

        handleEnemyHit(enemy) {
          enemy.setActive(false);
          this.physics.pause();

          const quiz =
            enemy.quizIndex >= 0 && quizList[enemy.quizIndex]
              ? quizList[enemy.quizIndex]
              : {
                  bug_line: 0,
                  question: "This code block looks suspicious. What should you do?",
                  options: [
                    "Investigate and test it before trusting it",
                    "Ignore it, it's probably fine",
                    "Delete the whole file",
                    "Nothing, bugs fix themselves",
                  ],
                  answer: 0,
                };

          onEnemyCollision(quiz, (wasCorrect) => {
            this.physics.resume();
            if (wasCorrect) {
              enemy.destroy();
              this.defeated += 1;
              this.hud.setText(`Bugs remaining: ${this.total - this.defeated}`);
              if (this.defeated >= this.total) {
                onVictory();
              }
            } else {
              enemy.setActive(true);
            }
          });
        }

        update() {
          if (!this.player.body) return;
          const speed = 200;
          this.player.body.setVelocityX(0);

          if (this.cursors.left.isDown || this.wasd.A.isDown) {
            this.player.body.setVelocityX(-speed);
          } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            this.player.body.setVelocityX(speed);
          }

          const onGround = this.player.body.blocked.down || this.player.body.touching.down;
          if ((this.cursors.up.isDown || this.wasd.W.isDown) && onGround) {
            this.player.body.setVelocityY(-350);
          }
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 420,
        parent: containerRef.current,
        physics: {
          default: "arcade",
          arcade: { gravity: { y: 0 }, debug: false },
        },
        scene: [MainScene],
      });
    }

    boot();

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div ref={containerRef} className="game-canvas" />
      <p className="hint">Move: Arrow keys / WASD &nbsp;•&nbsp; Walk into a bug to trigger its quiz</p>
    </div>
  );
}
