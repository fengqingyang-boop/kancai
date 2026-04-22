const { createApp, ref, onMounted, onUnmounted, nextTick } = Vue;

createApp({
    setup() {
        // 游戏状态
        const gameState = ref('start'); // start, playing, paused, revive, gameOver
        const score = ref(0);
        const missedCount = ref(0);
        const items = ref([]);
        const cutEffects = ref([]);
        const reviveTimer = ref(30);
        const gameContainer = ref(null);
        
        // 游戏配置
        const GAME_CONFIG = {
            itemSpawnInterval: 800, // 物品生成间隔（毫秒）
            itemSpeed: 2, // 物品下落速度
            itemSize: 60, // 物品大小
            bombChance: 0.15, // 地雷出现概率
            maxMissed: 20, // 最大漏掉数量
            reviveTime: 30, // 复活倒计时（秒）
            flashDuration: 2000, // 每次颜色闪烁持续时间
            difficultyIncreaseInterval: 10000, // 难度增加间隔（毫秒）
        };
        
        // 水果和蔬菜列表
        const FRUITS = [
            { emoji: '🍉', name: '西瓜', points: 10, type: 'fruit' },
            { emoji: '🍎', name: '苹果', points: 8, type: 'fruit' },
            { emoji: '🍊', name: '橙子', points: 8, type: 'fruit' },
            { emoji: '🍋', name: '柠檬', points: 8, type: 'fruit' },
            { emoji: '🍌', name: '香蕉', points: 6, type: 'fruit' },
            { emoji: '🍇', name: '葡萄', points: 12, type: 'fruit' },
            { emoji: '🍓', name: '草莓', points: 15, type: 'fruit' },
            { emoji: '🍑', name: '桃子', points: 10, type: 'fruit' },
            { emoji: '🍒', name: '樱桃', points: 20, type: 'fruit' },
            { emoji: '🥝', name: '猕猴桃', points: 12, type: 'fruit' },
        ];
        
        const VEGETABLES = [
            { emoji: '🥕', name: '胡萝卜', points: 10, type: 'vegetable' },
            { emoji: '🥦', name: '西兰花', points: 12, type: 'vegetable' },
            { emoji: '🍅', name: '番茄', points: 8, type: 'vegetable' },
            { emoji: '🥒', name: '黄瓜', points: 8, type: 'vegetable' },
            { emoji: '🌽', name: '玉米', points: 10, type: 'vegetable' },
            { emoji: '🥔', name: '土豆', points: 6, type: 'vegetable' },
            { emoji: '🧅', name: '洋葱', points: 8, type: 'vegetable' },
            { emoji: '🍆', name: '茄子', points: 10, type: 'vegetable' },
            { emoji: '🌶️', name: '辣椒', points: 15, type: 'vegetable' },
            { emoji: '🥬', name: '白菜', points: 8, type: 'vegetable' },
        ];
        
        const BOMB = { emoji: '💣', name: '地雷', points: 0, type: 'bomb' };
        
        // 游戏计时器
        let gameLoop = null;
        let spawnTimer = null;
        let reviveTimerInterval = null;
        let difficultyTimer = null;
        let itemIdCounter = 0;
        let effectIdCounter = 0;
        let currentSpeed = GAME_CONFIG.itemSpeed;
        let currentSpawnInterval = GAME_CONFIG.itemSpawnInterval;
        
        // 获取随机物品
        function getRandomItem() {
            if (Math.random() < GAME_CONFIG.bombChance) {
                return { ...BOMB };
            }
            
            const allEdibles = [...FRUITS, ...VEGETABLES];
            return { ...allEdibles[Math.floor(Math.random() * allEdibles.length)] };
        }
        
        // 生成新物品
        function spawnItem() {
            if (gameState.value !== 'playing') return;
            
            const container = gameContainer.value;
            if (!container) return;
            
            const containerWidth = container.clientWidth;
            const itemData = getRandomItem();
            
            const newItem = {
                id: ++itemIdCounter,
                x: Math.random() * (containerWidth - GAME_CONFIG.itemSize),
                y: -GAME_CONFIG.itemSize,
                size: GAME_CONFIG.itemSize,
                ...itemData
            };
            
            items.value.push(newItem);
        }
        
        // 移动所有物品
        function moveItems() {
            if (gameState.value !== 'playing') return;
            
            const container = gameContainer.value;
            if (!container) return;
            
            const containerHeight = container.clientHeight;
            
            items.value = items.value.filter(item => {
                item.y += currentSpeed;
                
                // 检查是否超出屏幕底部
                if (item.y > containerHeight) {
                    // 如果是水果蔬菜且没被切到，增加漏掉计数
                    if (item.type !== 'bomb') {
                        missedCount.value++;
                        
                        // 检查是否达到最大漏掉数量
                        if (missedCount.value >= GAME_CONFIG.maxMissed) {
                            triggerReviveMode();
                        }
                    }
                    return false;
                }
                return true;
            });
        }
        
        // 游戏主循环
        function startGameLoop() {
            gameLoop = setInterval(() => {
                moveItems();
            }, 16); // ~60 FPS
        }
        
        // 生成物品计时器
        function startSpawnTimer() {
            spawnTimer = setInterval(() => {
                spawnItem();
            }, currentSpawnInterval);
        }
        
        // 难度增加计时器
        function startDifficultyTimer() {
            difficultyTimer = setInterval(() => {
                // 每10秒增加难度
                currentSpeed += 0.2;
                if (currentSpawnInterval > 300) {
                    currentSpawnInterval -= 50;
                    
                    // 重新设置生成计时器
                    if (spawnTimer) {
                        clearInterval(spawnTimer);
                        startSpawnTimer();
                    }
                }
            }, GAME_CONFIG.difficultyIncreaseInterval);
        }
        
        // 开始游戏
        function startGame() {
            // 重置游戏状态
            gameState.value = 'playing';
            score.value = 0;
            missedCount.value = 0;
            items.value = [];
            cutEffects.value = [];
            reviveTimer.value = GAME_CONFIG.reviveTime;
            currentSpeed = GAME_CONFIG.itemSpeed;
            currentSpawnInterval = GAME_CONFIG.itemSpawnInterval;
            
            // 清除所有现有计时器
            stopAllTimers();
            
            // 启动新的游戏循环
            nextTick(() => {
                startGameLoop();
                startSpawnTimer();
                startDifficultyTimer();
            });
        }
        
        // 暂停游戏
        function pauseGame() {
            gameState.value = 'paused';
        }
        
        // 继续游戏
        function resumeGame() {
            gameState.value = 'playing';
        }
        
        // 处理点击事件
        function handleClick(event) {
            if (gameState.value !== 'playing') return;
            
            const container = gameContainer.value;
            if (!container) return;
            
            const rect = container.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const clickY = event.clientY - rect.top;
            
            // 检查是否点击到物品
            let clickedItem = null;
            let clickedIndex = -1;
            
            for (let i = items.value.length - 1; i >= 0; i--) {
                const item = items.value[i];
                if (
                    clickX >= item.x && 
                    clickX <= item.x + item.size &&
                    clickY >= item.y && 
                    clickY <= item.y + item.size
                ) {
                    clickedItem = item;
                    clickedIndex = i;
                    break;
                }
            }
            
            if (clickedItem) {
                // 移除点击的物品
                items.value.splice(clickedIndex, 1);
                
                if (clickedItem.type === 'bomb') {
                    // 点击到地雷，触发复活模式
                    triggerReviveMode();
                } else {
                    // 点击到水果蔬菜，增加积分
                    score.value += clickedItem.points;
                    
                    // 添加切中效果
                    addCutEffect(clickedItem.x + clickedItem.size / 2, clickedItem.y + clickedItem.size / 2, clickedItem.points);
                }
            }
        }
        
        // 处理双击事件
        function handleDoubleClick(event) {
            if (gameState.value === 'revive') {
                // 双击复活，继续游戏
                continueGameFromRevive();
            }
        }
        
        // 添加切中效果
        function addCutEffect(x, y, points) {
            const effect = {
                id: ++effectIdCounter,
                x,
                y,
                points
            };
            
            cutEffects.value.push(effect);
            
            // 0.8秒后移除效果
            setTimeout(() => {
                const index = cutEffects.value.findIndex(e => e.id === effect.id);
                if (index > -1) {
                    cutEffects.value.splice(index, 1);
                }
            }, 800);
        }
        
        // 触发复活模式
        function triggerReviveMode() {
            gameState.value = 'revive';
            reviveTimer.value = GAME_CONFIG.reviveTime;
            
            // 停止游戏循环但不清除物品
            if (gameLoop) {
                clearInterval(gameLoop);
                gameLoop = null;
            }
            if (spawnTimer) {
                clearInterval(spawnTimer);
                spawnTimer = null;
            }
            if (difficultyTimer) {
                clearInterval(difficultyTimer);
                difficultyTimer = null;
            }
            
            // 开始复活倒计时
            startReviveTimer();
        }
        
        // 开始复活倒计时
        function startReviveTimer() {
            reviveTimerInterval = setInterval(() => {
                reviveTimer.value--;
                
                if (reviveTimer.value <= 0) {
                    // 倒计时结束，游戏结束
                    gameOver();
                }
            }, 1000);
        }
        
        // 从复活模式继续游戏
        function continueGameFromRevive() {
            // 停止复活计时器
            if (reviveTimerInterval) {
                clearInterval(reviveTimerInterval);
                reviveTimerInterval = null;
            }
            
            // 重置状态
            if (missedCount.value >= GAME_CONFIG.maxMissed) {
                missedCount.value = 0;
            }
            
            // 清空所有物品
            items.value = [];
            
            // 继续游戏
            gameState.value = 'playing';
            startGameLoop();
            startSpawnTimer();
            startDifficultyTimer();
        }
        
        // 游戏结束
        function gameOver() {
            gameState.value = 'gameOver';
            stopAllTimers();
        }
        
        // 停止所有计时器
        function stopAllTimers() {
            if (gameLoop) {
                clearInterval(gameLoop);
                gameLoop = null;
            }
            if (spawnTimer) {
                clearInterval(spawnTimer);
                spawnTimer = null;
            }
            if (reviveTimerInterval) {
                clearInterval(reviveTimerInterval);
                reviveTimerInterval = null;
            }
            if (difficultyTimer) {
                clearInterval(difficultyTimer);
                difficultyTimer = null;
            }
        }
        
        // 组件挂载时
        onMounted(() => {
            // 游戏初始化
        });
        
        // 组件卸载时
        onUnmounted(() => {
            stopAllTimers();
        });
        
        return {
            gameState,
            score,
            missedCount,
            items,
            cutEffects,
            reviveTimer,
            gameContainer,
            startGame,
            pauseGame,
            resumeGame,
            handleClick,
            handleDoubleClick
        };
    }
}).mount('#app');
