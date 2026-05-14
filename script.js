const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const gameStatus = document.getElementById('gameStatus');

// 游戏对象
const game = {
    isRunning: false,
    isPaused: false,
    score: 0,
    highScore: localStorage.getItem('dinoHighScore') || 0,
    gameSpeed: 7,
    gravity: 0.6,
    frameCount: 0
};

// 恐龙对象
const dino = {
    x: 50,
    y: 0,
    width: 50,
    height: 50,
    velocityY: 0,
    jumping: false,
    draw: function() {
        // 恐龙身体
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 眼睛
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 35, this.y + 10, 8, 8);
        
        // 嘴
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 35, this.y + 22);
        ctx.lineTo(this.x + 48, this.y + 22);
        ctx.stroke();
        
        // 背部刺
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.x + 10, this.y - 10, 5, 10);
        ctx.fillRect(this.x + 20, this.y - 15, 5, 15);
        ctx.fillRect(this.x + 30, this.y - 10, 5, 10);
    },
    update: function() {
        if (this.jumping) {
            this.velocityY += game.gravity;
            this.y += this.velocityY;
            
            if (this.y >= canvas.height - this.height - 50) {
                this.y = canvas.height - this.height - 50;
                this.velocityY = 0;
                this.jumping = false;
            }
        }
    },
    jump: function() {
        if (!this.jumping && game.isRunning) {
            this.velocityY = -15;
            this.jumping = true;
        }
    }
};

// 障碍物
class Obstacle {
    constructor(type = 'cactus') {
        this.type = type;
        this.x = canvas.width;
        this.width = type === 'cactus' ? 25 : 50;
        this.height = type === 'cactus' ? 60 : 35;
        this.y = type === 'cactus' ? canvas.height - this.height - 50 : 100;
        this.passed = false;
    }
    
    draw() {
        if (this.type === 'cactus') {
            // 仙人掌
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 刺
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(this.x - 5, this.y + 10, 5, 15);
            ctx.fillRect(this.x + this.width, this.y + 20, 5, 20);
            ctx.fillRect(this.x + this.width, this.y + 45, 5, 15);
        } else {
            // 飞行生物
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, 
                       this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 眼睛
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2 + 5, this.y + 8, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // 眨眼动画
            ctx.fillStyle = '#000';
            const blink = Math.sin(game.frameCount * 0.1) > 0.8 ? 2 : 1;
            ctx.fillRect(this.x + this.width / 2 + 3, this.y + 6, 4, blink);
        }
    }
    
    update() {
        this.x -= game.gameSpeed;
    }
    
    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// 云彩
class Cloud {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * 100 + 20;
        this.width = 80;
        this.height = 40;
        this.speed = 2;
    }
    
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.arc(this.x + 25, this.y - 10, 30, 0, Math.PI * 2);
        ctx.arc(this.x + 55, this.y, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.x = canvas.width;
        }
    }
}

// 游戏数组
let obstacles = [];
let clouds = [];

// 初始化云彩
for (let i = 0; i < 3; i++) {
    clouds.push(new Cloud());
}

// 碰撞检测
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 生成障碍物
function spawnObstacle() {
    const type = Math.random() > 0.7 ? 'bird' : 'cactus';
    obstacles.push(new Obstacle(type));
}

// 绘制地面
function drawGround() {
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    
    ctx.strokeStyle = '#5d4e37';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 50);
        ctx.lineTo(i + 25, canvas.height - 45);
        ctx.stroke();
    }
}

// 更新游戏
function update() {
    if (!game.isRunning) return;
    
    game.frameCount++;
    
    // 更新恐龙
    dino.update();
    
    // 更新云彩
    clouds.forEach(cloud => cloud.update());
    
    // 更新障碍物
    obstacles.forEach(obstacle => {
        obstacle.update();
        
        // 检查碰撞
        if (checkCollision(dino, obstacle)) {
            gameOver();
        }
        
        // 加分
        if (!obstacle.passed && obstacle.x + obstacle.width < dino.x) {
            obstacle.passed = true;
            game.score += 10;
            scoreDisplay.textContent = game.score;
            
            // 每500分提升难度
            if (game.score % 500 === 0) {
                game.gameSpeed += 1;
            }
        }
    });
    
    // 删除已离屏的障碍物
    obstacles = obstacles.filter(obstacle => !obstacle.isOffScreen());
    
    // 生成新障碍物
    if (game.frameCount % 100 === 0) {
        spawnObstacle();
    }
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景元素
    clouds.forEach(cloud => cloud.draw());
    
    // 绘制地面
    drawGround();
    
    // 绘制障碍物
    obstacles.forEach(obstacle => obstacle.draw());
    
    // 绘制恐龙
    dino.draw();
    
    // 绘制得分背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(10, 10, 150, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('得分: ' + game.score, 20, 35);
}

// 游戏循环
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 游戏开始
function startGame() {
    game.isRunning = true;
    game.score = 0;
    game.gameSpeed = 7;
    game.frameCount = 0;
    obstacles = [];
    dino.y = canvas.height - dino.height - 50;
    dino.velocityY = 0;
    dino.jumping = false;
    gameStatus.textContent = '游戏中... 祝你好运！';
}

// 游戏结束
function gameOver() {
    game.isRunning = false;
    
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('dinoHighScore', game.highScore);
        gameStatus.textContent = `🎉 新高分！${game.score} 分 | 最高分: ${game.highScore} | 按空格重新开始`;
    } else {
        gameStatus.textContent = `💀 游戏结束！得分: ${game.score} | 最高分: ${game.highScore} | 按空格重新开始`;
    }
}

// 键盘事件
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        
        if (!game.isRunning) {
            startGame();
        } else {
            dino.jump();
        }
    }
});

// 触摸事件（移动设备支持）
canvas.addEventListener('touchstart', () => {
    if (!game.isRunning) {
        startGame();
    } else {
        dino.jump();
    }
});

// 启动游戏循环
gameLoop();
